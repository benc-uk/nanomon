package main

import "time"

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
}

type MonitorReq struct {
	Name       string
	Type       string
	Interval   string
	Target     string
	Rule       string
	Enabled    bool
	Properties map[string]string
	Updated    time.Time
}

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

	return "", true
}
