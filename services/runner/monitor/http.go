package monitor

import (
	"crypto/tls"
	"io"
	"monitr/services/common/types"
	"net/http"
	"strconv"
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
		method = "GET"
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

	outputs := map[string]any{
		"body":     bodyStr,
		"bodyLen":  len(body),
		"status":   resp.StatusCode,
		"respTime": r.Value,
	}

	return r, outputs
}
