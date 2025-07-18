// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - DNS monitor implementation
// ----------------------------------------------------------------------------

package monitor

import (
	"context"
	"fmt"
	"log"
	"nanomon/services/common/result"
	"net"
	"strings"
	"time"
)

func (m *Monitor) runDNS() *result.Result {
	log.Printf("### Running DNS monitor '%s' on target %s", m.Name, m.Target)
	r := result.NewResult(m.Name, m.Target, m.ID)

	var err error

	timeout := time.Duration(2000) * time.Millisecond
	networkType := "ip"
	server := ""
	recordType := "A"

	timeoutProp := m.Properties["timeout"]
	if timeoutProp != "" {
		timeout, err = time.ParseDuration(timeoutProp)
		if err != nil {
			return result.NewFailedResult(m.Name, m.Target, m.ID, err)
		}
	}

	networkProp := m.Properties["network"]
	if networkProp != "" {
		networkType = networkProp
	}

	serverProp := m.Properties["server"]
	if serverProp != "" {
		server = serverProp
	}

	recordTypeProp := m.Properties["type"]
	if recordTypeProp != "" {
		recordType = strings.ToUpper(recordTypeProp)
	}

	var resolver *net.Resolver
	if server != "" {
		// Custom resolver for DNS server
		resolver = &net.Resolver{
			PreferGo: true,
			Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
				d := net.Dialer{
					Timeout: timeout,
				}
				return d.DialContext(ctx, network, server+":53")
			},
		}
	} else {
		// Get default resolver
		resolver = net.DefaultResolver
	}

	timeoutCtx, canFunc := context.WithTimeout(context.Background(), timeout)
	defer canFunc()

	start := time.Now()

	results := []string{}

	switch recordType {
	case "A":
		ips, err := resolver.LookupIP(timeoutCtx, networkType, m.Target)
		if err != nil {
			return result.NewFailedResult(m.Name, m.Target, m.ID, err)
		}

		for _, ip := range ips {
			results = append(results, ip.String())
		}

	case "CNAME":
		cname, err := resolver.LookupCNAME(timeoutCtx, m.Target)
		if err != nil {
			return result.NewFailedResult(m.Name, m.Target, m.ID, err)
		}

		results = append(results, cname)

	case "TXT":
		txts, err := resolver.LookupTXT(timeoutCtx, m.Target)
		if err != nil {
			return result.NewFailedResult(m.Name, m.Target, m.ID, err)
		}

		results = append(results, txts...)

	case "MX":
		mxs, err := resolver.LookupMX(timeoutCtx, m.Target)
		if err != nil {
			return result.NewFailedResult(m.Name, m.Target, m.ID, err)
		}

		for _, mx := range mxs {
			results = append(results, fmt.Sprintf("%s %d", mx.Host, mx.Pref))
		}

	case "NS":
		nss, err := resolver.LookupNS(timeoutCtx, m.Target)
		if err != nil {
			return result.NewFailedResult(m.Name, m.Target, m.ID, err)
		}

		for _, ns := range nss {
			results = append(results, ns.Host)
		}

	default:
		return result.NewFailedResult(m.Name, m.Target, m.ID, fmt.Errorf("invalid record type: %s", recordType))
	}

	r.Value = int(time.Since(start).Milliseconds())

	outputs := map[string]interface{}{
		"respTime":    r.Value,
		"resultCount": len(results),
	}

	for i, res := range results {
		outputs[fmt.Sprintf("result%d", i+1)] = res
	}

	r.Outputs = outputs

	return r
}
