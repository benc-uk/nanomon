// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon API server - Monitor types
// ----------------------------------------------------------------------------

package main

import (
	"slices"
	"time"

	"nanomon/services/common/monitor"

	"github.com/Knetic/govaluate"
)

// Output struct for a monitor result
type MonitorResp struct {
	ID         int               `json:"id,omitempty"`
	Name       string            `json:"name"`
	Type       string            `json:"type"`
	Interval   string            `json:"interval"`
	Target     string            `json:"target"`
	Rule       string            `json:"rule,omitempty"`
	Updated    time.Time         `json:"updated"`
	Enabled    bool              `json:"enabled"`
	Properties map[string]string `json:"properties"`
	Group      string            `json:"group,omitempty"`
}

// Request struct for creating/updating a monitor
type MonitorReq struct {
	Name       string
	Type       string
	Interval   string
	Target     string
	Rule       string
	Enabled    bool
	Properties map[string]string
	Updated    time.Time
	Group      string
}

// Validate incoming monitor request
func (m MonitorReq) validate() (string, bool) {
	if m.Name == "" {
		return "missing monitor name", false
	}

	if m.Type == "" {
		return "missing monitor type", false
	}

	// check if monitor type is valid based on string slice of valid monitor types
	if !slices.Contains(monitor.ValidTypes, m.Type) {
		return "invalid monitor type", false
	}

	if m.Interval == "" {
		return "missing monitor interval", false
	}

	if m.Target == "" {
		return "missing monitor target", false
	}

	dur, err := time.ParseDuration(m.Interval)
	if err != nil {
		return "invalid monitor interval", false
	}

	if dur < time.Second {
		return "monitor interval must be greater than 1s", false
	}

	if m.Rule != "" {
		_, err = govaluate.NewEvaluableExpression(m.Rule)
		if err != nil {
			return "rule invalid: " + err.Error(), false
		}
	}

	return "", true
}

func MonitorToResp(m *monitor.Monitor) MonitorResp {
	return MonitorResp{
		ID:         m.ID,
		Name:       m.Name,
		Type:       m.Type,
		Interval:   m.Interval,
		Target:     m.Target,
		Rule:       m.Rule,
		Updated:    m.Updated,
		Enabled:    m.Enabled,
		Properties: m.Properties,
	}
}
