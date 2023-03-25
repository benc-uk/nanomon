package monitor

import (
	"io"
	"monitr/services/common/types"
	"net/http"
	"time"
)

func (m *Monitor) runHTTP() (*types.Result, map[string]any) {
	r := types.NewResult(m.ID)

	var err error
	method := "GET"
	timeout := time.Duration(5) * time.Second

	methodProp := m.Properties["method"]
	if methodProp != "" {
		method = "GET"
	}

	timeoutProp := m.Properties["timeout"]
	if timeoutProp != "" {
		timeout, err = time.ParseDuration(timeoutProp)
		if err != nil {
			return types.NewFailedResult(m.ID, err), nil
		}
	}

	req, err := http.NewRequest(method, m.Target, nil)
	if err != nil {
		return types.NewFailedResult(m.ID, err), nil
	}

	client := http.Client{
		Timeout: timeout,
	}

	start := time.Now()
	resp, err := client.Do(req)
	if err != nil {
		return types.NewFailedResult(m.ID, err), nil
	}
	r.Value = int(time.Since(start).Milliseconds())

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return types.NewFailedResult(m.ID, err), nil
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

/*
// parseStatusRange parses a string containing a range of status codes
// in the format "200-299" or "200,201,202,..."
func parseStatusRange(statusRange string) ([]int, error) {
	var statusCodes []int

	// Split the string into parts based on whether it contains a dash or comma
	if strings.Contains(statusRange, "-") {
		// Range of status codes in the format "200-299"
		rangeParts := strings.Split(statusRange, "-")
		if len(rangeParts) != 2 {
			return nil, fmt.Errorf("invalid status range: %s", statusRange)
		}
		start, err := strconv.Atoi(rangeParts[0])
		if err != nil {
			return nil, fmt.Errorf("invalid status range: %s", statusRange)
		}
		end, err := strconv.Atoi(rangeParts[1])
		if err != nil {
			return nil, fmt.Errorf("invalid status range: %s", statusRange)
		}
		if start > end {
			return nil, fmt.Errorf("invalid status range: %s", statusRange)
		}
		for i := start; i <= end; i++ {
			statusCodes = append(statusCodes, i)
		}
	} else if strings.Contains(statusRange, ",") {
		// List of status codes in the format "200,201,202,..."
		codeStrings := strings.Split(statusRange, ",")
		for _, codeString := range codeStrings {
			code, err := strconv.Atoi(codeString)
			if err != nil {
				return nil, fmt.Errorf("invalid status range: %s", statusRange)
			}
			statusCodes = append(statusCodes, code)
		}
	} else {
		// Otherwise assume it's a single number
		code, err := strconv.Atoi(statusRange)
		if err != nil {
			return nil, fmt.Errorf("invalid status range: %s", statusRange)
		}
		statusCodes = append(statusCodes, code)
	}

	return statusCodes, nil
}

// containsStatusCode checks if a slice of status codes contains a given code
func containsStatusCode(statusCodes []int, code int) bool {
	for _, statusCode := range statusCodes {
		if statusCode == code {
			return true
		}
	}
	return false
}
*/
