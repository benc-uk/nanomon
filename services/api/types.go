// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon API server - Monitor types
// ----------------------------------------------------------------------------

package main

import (
	"time"

	"github.com/Knetic/govaluate"
)

// Output struct for a monitor result
type MonitorResp struct {
	ID         string            `bson:"_id" json:"id"`
	Name       string            `json:"name"`
	Type       string            `json:"type"`
	Interval   string            `json:"interval"`
	Target     string            `json:"target"`
	Rule       string            `json:"rule"`
	Updated    time.Time         `json:"updated"`
	Enabled    bool              `json:"enabled"`
	Properties map[string]string `json:"properties"`
	Group      string            `json:"group"`
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
		return "missing name", false
	}

	if m.Type == "" {
		return "missing type", false
	}

	if m.Interval == "" {
		return "missing interval", false
	}

	if m.Target == "" {
		return "missing target", false
	}

	dur, err := time.ParseDuration(m.Interval)
	if err != nil {
		return "invalid interval", false
	}

	if dur < time.Second {
		return "interval must be greater than 1s", false
	}

	if m.Rule != "" {
		_, err = govaluate.NewEvaluableExpression(m.Rule)
		if err != nil {
			return "rule invalid: " + err.Error(), false
		}
	}

	return "", true
}
