package monitor

import (
	"context"
	"fmt"
	"log"
	"nanomon/services/common/database"
	"nanomon/services/common/types"
	"os"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func FetchMonitors(db *database.DB) ([]*Monitor, error) {
	ctx, cancel := context.WithTimeout(context.Background(), db.Timeout)
	defer cancel()

	cur, err := db.Monitors.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}

	monitors := make([]*Monitor, 0)

	for cur.Next(ctx) {
		m := NewMonitor(db)
		if err := cur.Decode(&m); err != nil {
			return nil, err
		}

		m.IntervalDuration, _ = time.ParseDuration(m.Interval)
		monitors = append(monitors, m)
	}

	if len(monitors) == 0 {
		log.Println("### WARN! No monitors found in database")
	} else {
		log.Printf("### Loaded %d monitors from database", len(monitors))
	}

	return monitors, nil
}

func storeResult(m *Monitor, r types.Result) error {
	maxFailCount := 3
	maxFailCountEnv := os.Getenv("ALERT_FAIL_COUNT")

	if maxFailCountEnv != "" {
		maxFailCount, _ = strconv.Atoi(maxFailCountEnv)
	}

	if r.Status > 0 {
		m.FailCount++
	} else {
		m.FailCount = 0
		m.FailedState = false
	}

	if m.FailCount >= maxFailCount && !m.FailedState {
		body := fmt.Sprintf(`Monitor '%s' has failed %d times!
  - Reason:%s
  - When: %s

Configuration:
  - Target: %s
  - Type: %s
  - Interval: %s
  - Rule: %s
  - Properties: %+v`, m.Name, m.FailCount, r.Message, r.Date.Format("15:04 - 02/01/2006"),
			m.Target, m.Type, m.Interval, m.Rule, m.Properties)
		sendEmail(body, fmt.Sprintf("⚠️ NanoMon alert for: %s", m.Name))

		m.FailedState = true
	}

	// For unit tests
	if m.db == nil {
		return nil
	}

	log.Printf("###   Storing result: %d %s", r.Status, r.Message)

	ctx, cancel := context.WithTimeout(context.Background(), m.db.Timeout)
	defer cancel()

	_, err := m.db.Results.InsertOne(ctx, r)

	return err
}
