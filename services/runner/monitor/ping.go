package monitor

import (
	"nanomon/services/common/types"
	"strconv"
	"time"

	ping "github.com/prometheus-community/pro-bing"
)

func (m *Monitor) runPing() (*types.Result, map[string]any) {
	r := types.NewResult(m.Name, m.Target, m.ID)

	var err error

	count := 6
	interval := time.Duration(150) * time.Millisecond
	timeout := time.Duration(1) * time.Second

	countProp := m.Properties["count"]
	if countProp != "" {
		count, err = strconv.Atoi(countProp)
		if err != nil {
			return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
		}
	}

	intervalProp := m.Properties["interval"]
	if intervalProp != "" {
		interval, err = time.ParseDuration(intervalProp)
		if err != nil {
			return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
		}
	}

	timeoutProp := m.Properties["timeout"]
	if timeoutProp != "" {
		timeout, err = time.ParseDuration(timeoutProp)
		if err != nil {
			return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
		}
	}

	pinger, err := ping.NewPinger(m.Target)
	if err != nil {
		return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
	}

	pinger.SetPrivileged(true)
	pinger.Count = count
	pinger.Timeout = timeout
	pinger.Interval = interval

	err = pinger.Run() // NOTE: Blocks
	if err != nil {
		return types.NewFailedResult(m.Name, m.Target, m.ID, err), nil
	}

	stats := pinger.Statistics()
	outputs := map[string]any{
		"minRtt":      stats.MinRtt.Milliseconds(),
		"maxRtt":      stats.MaxRtt.Milliseconds(),
		"avgRtt":      stats.AvgRtt.Milliseconds(),
		"packetLoss":  stats.PacketLoss,
		"packetsRecv": stats.PacketsRecv,
		"ipAddress":   stats.IPAddr,
	}

	r.Value = int(stats.AvgRtt.Milliseconds())

	return r, outputs
}
