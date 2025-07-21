// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - TCP monitor implementation
// ----------------------------------------------------------------------------

package monitor

import (
	"nanomon/services/common/result"
	"net"
	"strings"
	"time"
)

func (m *Monitor) runTCP() *result.Result {
	r := result.NewResult(m.Name, m.Target, m.ID)

	var err error

	timeout := time.Duration(5) * time.Second

	timeoutProp := m.Properties["timeout"]
	if timeoutProp != "" {
		timeout, err = time.ParseDuration(timeoutProp)
		if err != nil {
			return result.NewFailedResult(m.Name, m.Target, m.ID, err)
		}
	}

	dialer := net.Dialer{Timeout: timeout}
	start := time.Now()

	conn, err := dialer.Dial("tcp", m.Target)
	if err != nil {
		return result.NewFailedResult(m.Name, m.Target, m.ID, err)
	}

	r.Value = int(time.Since(start).Milliseconds())

	outputs := map[string]any{
		"respTime":  r.Value,
		"ipAddress": strings.Split(conn.RemoteAddr().String(), ":")[0],
	}

	defer conn.Close()

	r.Outputs = outputs

	return r
}
