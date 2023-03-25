package types

import "time"

const STATUS_OK = 0
const STATUS_ERROR = 1
const STATUS_FAILED = 2

type Result struct {
	Date      time.Time `bson:"date" json:"date"`
	Status    int       `bson:"status" json:"status"`
	Value     int       `bson:"value" json:"value"`
	Message   string    `bson:"message" json:"message"`
	MonitorID string    `bson:"monitor_id" json:"monitor_id"`
}

func NewResult(id string) *Result {
	return &Result{
		Date:      time.Now(),
		Status:    STATUS_OK,
		Value:     0,
		Message:   "",
		MonitorID: id,
	}
}

func NewFailedResult(id string, err error) *Result {
	return &Result{
		Date:      time.Now(),
		Status:    STATUS_FAILED,
		Value:     0,
		Message:   err.Error(),
		MonitorID: id,
	}
}
