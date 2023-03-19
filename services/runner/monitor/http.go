package monitor

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func (m *Monitor) runHTTP() {
	r := NewResult(m)

	client := http.Client{
		Timeout: 10 * time.Second,
	}

	url := m.Properties["url"]
	if url == "" {
		storeFailedResult(m.db, m, fmt.Errorf("no URL specified"))
		return
	}

	log.Println("### Executing HTTP monitor:", url)

	// Specify the range of status codes to check for
	allowedStatus := "200-299"
	if m.Properties["allowedStatus"] != "" {
		allowedStatus = m.Properties["allowedStatus"]
	}

	// Parse the allowed status code string, can be a range or a list
	statusCodes, err := parseStatusRange(allowedStatus)
	if err != nil {
		storeFailedResult(m.db, m, err)
		return
	}

	start := time.Now()
	resp, err := client.Get(url)
	r.Duration = int(time.Since(start).Seconds() * 1000)

	if err != nil {
		storeFailedResult(m.db, m, err)
		return
	}

	// Check the status code
	if !containsStatusCode(statusCodes, resp.StatusCode) {
		r.Status = STATUS_ERROR
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		storeFailedResult(m.db, m, err)
		return
	}
	bodyStr := string(body)

	if m.Properties["checkFor"] != "" && r.Status == STATUS_OK {
		if !strings.Contains(bodyStr, m.Properties["checkFor"]) {
			r.Status = STATUS_CHECK_FAILED
			r.Message = fmt.Sprintf("'%s' not found in response", m.Properties["checkFor"])
		}
	}

	if m.Properties["notCheckFor"] != "" && r.Status == STATUS_OK {
		if strings.Contains(bodyStr, m.Properties["notCheckFor"]) {
			r.Status = STATUS_CHECK_FAILED
			r.Message = fmt.Sprintf("'%s' was found in response", m.Properties["notCheckFor"])
		}
	}

	storeResult(m.db, *r)
}

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
