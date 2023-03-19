package monitor

import (
	"log"
	"monitr/services/common/database"
	"time"
)

const STATUS_OK = 0
const STATUS_ERROR = 1
const STATUS_TIMEOUT = 2
const STATUS_CHECK_FAILED = 3
const STATUS_FAILED = 4
const STATUS_THRESHOLD = 5

type Result struct {
	Date      time.Time `bson:"date"`
	Status    int       `bson:"status"`
	Duration  int       `bson:"duration"`
	Message   string    `bson:"message"`
	MonitorID string    `bson:"monitor_id"`
}

func NewResult(m *Monitor) *Result {
	return &Result{
		Date:      time.Now(),
		Status:    STATUS_OK,
		Duration:  0,
		Message:   "",
		MonitorID: m.ID,
	}
}

// Helper to create and store a failed result
func storeFailedResult(db *database.DB, m *Monitor, err error) {
	log.Printf("### Monitor '%s' failed! %s", m.Name, err)

	r := &Result{}
	r.Date = time.Now()
	r.Status = STATUS_FAILED
	r.Message = err.Error()
	r.MonitorID = m.ID
	r.Duration = 0

	storeResult(db, *r)
}
