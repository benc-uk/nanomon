package main

import "time"

type MonitorResp struct {
	ID         string            `bson:"_id" json:"id"`
	Name       string            `json:"name"`
	Type       string            `json:"type"`
	Interval   string            `json:"interval"`
	Updated    time.Time         `json:"updated"`
	Enabled    bool              `json:"enabled"`
	Properties map[string]string `json:"properties"`
}

type MonitorReq struct {
	Name       string
	Type       string
	Interval   string
	Enabled    bool
	Properties map[string]string
	Updated    time.Time
}

type Result struct {
	Date     time.Time `json:"date"`
	Status   int       `json:"status"`
	Duration int       `json:"duration"`
	Message  string    `json:"message"`
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

	return "", true
}
