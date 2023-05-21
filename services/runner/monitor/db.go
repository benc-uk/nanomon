// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Database access for monitors
// ----------------------------------------------------------------------------

package monitor

import (
	"context"
	"fmt"
	"log"
	"nanomon/services/common/database"
	"os"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type changeEvent struct {
	ID            changeID            `bson:"_id"`
	OperationType string              `bson:"operationType"`
	ClusterTime   primitive.Timestamp `bson:"clusterTime"`
	FullDocument  Monitor             `bson:"fullDocument"`
	DocumentKey   documentKey         `bson:"documentKey"`
	Ns            namespace           `bson:"ns"`
}

type documentKey struct {
	ID primitive.ObjectID `bson:"_id"`
}

type changeID struct {
	Data string `bson:"_data"`
}

type namespace struct {
	DB   string `bson:"db"`
	Coll string `bson:"coll"`
}

// Fetch all monitors from the database
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

		monitors = append(monitors, m)
	}

	return monitors, nil
}

// Watches the monitors collection for changes and updates accordingly
func WatchMonitors(db *database.DB, monitors []*Monitor) error {
	if os.Getenv("USE_POLLING") == "true" {
		return fmt.Errorf("forcing polling mode as USE_POLLING is set")
	}

	monitorStream, err := db.Monitors.Watch(context.TODO(), mongo.Pipeline{})
	if err != nil {
		return err
	}

	log.Println("### Change stream watching monitors collection")

	defer monitorStream.Close(context.TODO())

	for monitorStream.Next(context.TODO()) {
		var event changeEvent
		if err := monitorStream.Decode(&event); err != nil {
			log.Println("### Error decoding monitor change:", err)
			continue
		}

		opType := event.OperationType
		monitor := event.FullDocument
		// NOTE: We have to mutate the monitor to set the db and interval duration
		monitor.db = db

		if opType == "insert" {
			log.Printf("### Monitor '%s' created and started", monitor.Name)
			monitors = append(monitors, &monitor)

			go monitor.Start(0)
		}

		if opType == "replace" {
			for i, m := range monitors {
				if m.ID == monitor.ID {
					log.Printf("### Monitor '%s' updated and restarted", m.Name)
					monitors[i].Stop()

					go monitor.Start(0)

					monitors[i] = &monitor
				}
			}
		}

		if opType == "delete" {
			for i, m := range monitors {
				// NOTE: Delete event doesn't contain the full document, so we need to use the documentKey
				// I really hope this doesn't break in the future :)
				if m.ID == event.DocumentKey.ID.Hex() {
					log.Printf("### Monitor '%s' deleted and stopped", m.Name)
					monitors[i].Stop()
					monitors = append(monitors[:i], monitors[i+1:]...)
				}
			}
		}
	}

	return nil
}
