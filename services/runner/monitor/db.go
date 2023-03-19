package monitor

import (
	"context"
	"log"
	"monitr/services/common/database"
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

func storeResult(db *database.DB, r Result) error {
	log.Printf("### Storing result: %d (%s)", r.Status, r.Message)
	ctx, cancel := context.WithTimeout(context.Background(), db.Timeout)
	defer cancel()

	_, err := db.Results.InsertOne(ctx, r)
	return err
}
