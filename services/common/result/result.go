// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon - Shared data structures for results
// ----------------------------------------------------------------------------

package result

import (
	"time"
)

const StatusOK = 0
const StatusError = 1
const StatusFailed = 2

type Result struct {
	Date    time.Time `json:"date"`
	Status  int       `json:"status"`
	Value   int       `json:"value"`
	Message string    `json:"message"`

	MonitorID     int    `json:"monitor_id"`
	MonitorName   string `json:"monitor_name"`
	MonitorTarget string `json:"monitor_target"`

	Outputs map[string]any `json:"outputs"`
}

func NewResult(monName string, monTarget string, monID int) *Result {
	return &Result{
		Date:          time.Now(),
		Status:        StatusOK,
		Value:         0,
		Message:       "",
		MonitorName:   monName,
		MonitorTarget: monTarget,
		MonitorID:     monID,
	}
}

func NewFailedResult(monName string, monTarget string, monID int, err error) *Result {
	return &Result{
		Date:          time.Now(),
		Status:        StatusFailed,
		Value:         0,
		Message:       err.Error(),
		MonitorName:   monName,
		MonitorTarget: monTarget,
		MonitorID:     monID,
	}
}
