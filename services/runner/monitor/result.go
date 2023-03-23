package monitor

import (
	"log"
	"monitr/services/common/database"
	"monitr/services/common/types"
	"time"
)

// Helper to create and store a failed result
func storeFailedResult(db *database.DB, m *Monitor, err error) {
	log.Printf("### Monitor '%s' failed! %s", m.Name, err)

	r := &types.Result{}
	r.Date = time.Now()
	r.Status = types.STATUS_FAILED
	r.Message = err.Error()
	r.MonitorID = m.ID
	r.Value = 0

	storeResult(db, *r)
}
