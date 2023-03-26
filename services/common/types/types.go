package types

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const STATUS_OK = 0
const STATUS_ERROR = 1
const STATUS_FAILED = 2

type Result struct {
	Date    time.Time `bson:"date" json:"date"`
	Status  int       `bson:"status" json:"status"`
	Value   int       `bson:"value" json:"value"`
	Message string    `bson:"message" json:"message"`

	MonitorID     primitive.ObjectID `bson:"monitor_id" json:"monitor_id"`
	MonitorName   string             `bson:"monitor_name" json:"monitor_name"`
	MonitorTarget string             `bson:"monitor_target" json:"monitor_target"`
}

func NewResult(monName, monTarget, monID string) *Result {
	oid, _ := primitive.ObjectIDFromHex(monID)

	return &Result{
		Date:          time.Now(),
		Status:        STATUS_OK,
		Value:         0,
		Message:       "",
		MonitorName:   monName,
		MonitorTarget: monTarget,
		MonitorID:     oid,
	}
}

func NewFailedResult(monName, monTarget, monID string, err error) *Result {
	oid, _ := primitive.ObjectIDFromHex(monID)

	return &Result{
		Date:          time.Now(),
		Status:        STATUS_FAILED,
		Value:         0,
		Message:       err.Error(),
		MonitorName:   monName,
		MonitorTarget: monTarget,
		MonitorID:     oid,
	}
}
