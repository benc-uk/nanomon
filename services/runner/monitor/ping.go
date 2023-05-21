// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Ping monitor implementation
// ----------------------------------------------------------------------------

package monitor

import (
	"nanomon/services/common/types"
	"strconv"
	"time"

	ping "github.com/prometheus-community/pro-bing"
)

func (m *Monitor) runPing() *types.Result {
	r := types.NewResult(m.Name, m.Target, m.ID)

	var err error

	count := 3
	interval := time.Duration(150) * time.Millisecond
	timeout := time.Duration(1) * time.Second

	countProp := m.Properties["count"]
	if countProp != "" {
		count, err = strconv.Atoi(countProp)
		if err != nil {
			return types.NewFailedResult(m.Name, m.Target, m.ID, err)
		}
	}

	intervalProp := m.Properties["interval"]
	if intervalProp != "" {
		interval, err = time.ParseDuration(intervalProp)
		if err != nil {
			return types.NewFailedResult(m.Name, m.Target, m.ID, err)
		}
	}

	timeoutProp := m.Properties["timeout"]
	if timeoutProp != "" {
		timeout, err = time.ParseDuration(timeoutProp)
		if err != nil {
			return types.NewFailedResult(m.Name, m.Target, m.ID, err)
		}
	}

	pinger, err := ping.NewPinger(m.Target)
	if err != nil {
		return types.NewFailedResult(m.Name, m.Target, m.ID, err)
	}

	// Means we have to run as root
	pinger.SetPrivileged(true)

	pinger.Count = count
	pinger.Timeout = timeout
	pinger.Interval = interval

	err = pinger.Run() // NOTE: Blocks
	if err != nil {
		return types.NewFailedResult(m.Name, m.Target, m.ID, err)
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
	r.Outputs = outputs

	return r
}
