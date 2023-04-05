package monitor

import (
	"crypto/tls"
	"encoding/json"
	"io"
	"nanomon/services/common/types"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

func (m *Monitor) runHTTP() (*types.Result, map[string]any) {
	r := types.NewResult(m.Name, m.Target, m.ID)

	var err error

	method := "GET"
	timeout := time.Duration(5) * time.Second
	validateTLS := true

	methodProp := m.Properties["method"]
	if methodProp != "" {
		method = strings.ToUpper(methodProp)
	}

	timeoutProp := m.Properties["timeout"]
	if timeoutProp != "" {
		timeout, err = time.ParseDuration(timeoutProp)
		if err != nil {
			return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
		}
	}

	validateTLSProp := m.Properties["validateTLS"]
	if validateTLSProp != "" {
		validateTLS, err = strconv.ParseBool(validateTLSProp)
		if err != nil {
			return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
		}
	}

	req, err := http.NewRequest(method, m.Target, nil)
	if err != nil {
		return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
	}

	if m.Properties["body"] != "" {
		req.Body = io.NopCloser(strings.NewReader(m.Properties["body"]))
	}

	if m.Properties["headers"] != "" {
		var headers map[string]string

		err = json.Unmarshal([]byte(m.Properties["headers"]), &headers)
		if err != nil {
			return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
		}

		for k, v := range headers {
			req.Header.Add(k, v)
		}
	}

	http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{InsecureSkipVerify: !validateTLS}

	client := http.Client{
		Timeout: timeout,
	}

	start := time.Now()

	resp, err := client.Do(req)
	if err != nil {
		return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
	}
	defer resp.Body.Close()

	r.Value = int(time.Since(start).Milliseconds())

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
	}

	bodyStr := string(body)
	regexMatch := ""

	if m.Properties["bodyRegex"] != "" {
		re, err := regexp.Compile(m.Properties["bodyRegex"])
		if err != nil {
			return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
		}

		match := re.FindStringSubmatch(bodyStr)
		if len(match) > 1 {
			regexMatch = match[1]
		}
	}

	outputs := map[string]any{
		"body":     bodyStr,
		"bodyLen":  len(body),
		"status":   resp.StatusCode,
		"respTime": r.Value,
	}

	// If the regex match is a number, convert it to a float
	regexMatchFloat, err := strconv.ParseFloat(regexMatch, 64)
	if err == nil {
		outputs["regexMatch"] = regexMatchFloat
	} else {
		outputs["regexMatch"] = regexMatch
	}

	// Get cert expiry if it is a TLS connection and the cert exists
	if resp.TLS != nil {
		cert := resp.TLS.PeerCertificates[0]
		if cert != nil {
			expires := cert.NotAfter
			days := int(time.Until(expires).Hours() / 24)
			outputs["certExpiryDays"] = days
		}
	}

	// Save all outputs to the result but omit the body
	r.Outputs = outputs
	r.Outputs["body"] = "<OMITTED>"

	return r, outputs
}
