package monitor

import (
	"monitr/services/common/types"
	"net"
	"time"
)

func (m *Monitor) runTCP() (*types.Result, map[string]any) {
	r := types.NewResult(m.Name, m.Target, m.ID)

	start := time.Now()
	tcpAddr, err := net.ResolveTCPAddr("tcp", m.Target)
	if err != nil {
		return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
	}
	dnsTime := int(time.Since(start).Milliseconds())

	conn, err := net.DialTCP("tcp", nil, tcpAddr)
	if err != nil {
		return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
	}
	r.Value = int(time.Since(start).Milliseconds())

	outputs := map[string]any{
		"dnsTime":  dnsTime,
		"respTime": r.Value,
		"address":  conn.RemoteAddr().String(),
	}

	defer conn.Close()

	return r, outputs
}
