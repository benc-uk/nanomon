package main

import (
	"context"
	"fmt"
	"nanomon/services/common/database"
	"nanomon/services/common/types"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PromWrapper struct {
	db                 *database.DB
	registeredMonitors map[string]*prometheus.GaugeVec
}

func newPromWrapper(db *database.DB) *PromWrapper {
	return &PromWrapper{
		db:                 db,
		registeredMonitors: make(map[string]*prometheus.GaugeVec),
	}
}

func (p *PromWrapper) handler(w http.ResponseWriter, r *http.Request) {
	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cur, err := p.db.Monitors.Find(timeoutCtx, bson.M{})
	if err != nil {
		// write error and http 500
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(fmt.Sprintf("Error: %v", err)))

		return
	}

	monitors := make([]*MonitorResp, 0)

	for cur.Next(context.TODO()) {
		m := &MonitorResp{}
		if err := cur.Decode(&m); err != nil {
			// write error
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(fmt.Sprintf("Error: %v", err)))

			return
		}

		monitors = append(monitors, m)
	}

	// Register all monitors as gauges if not already registered
	for _, monitor := range monitors {
		// Check if monitor is already registered
		if _, ok := p.registeredMonitors[monitor.ID]; !ok {
			// Create gauge
			g := promauto.NewGaugeVec(prometheus.GaugeOpts{
				Name: monitor.getPromName(),
				Help: fmt.Sprintf("%s (%s)", monitor.Name, monitor.Type),
				ConstLabels: prometheus.Labels{
					"monitorID":   monitor.ID,
					"monitorType": monitor.Type,
				},
				Namespace: "nanomon",
			}, []string{"result"})

			p.registeredMonitors[monitor.ID] = g
		}

		// Parse monitor.ID to oid
		oid, err := primitive.ObjectIDFromHex(monitor.ID)

		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(fmt.Sprintf("Error: %v", err)))

			return
		}

		options := options.Find().SetSort(bson.M{"date": -1}).SetLimit(1)

		// Get the latest result for the monitor
		cur, err := p.db.Results.Find(timeoutCtx, bson.M{"monitor_id": oid}, options)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(fmt.Sprintf("Error: %v", err)))

			return
		}

		// Get the last result for the monitor
		var result *types.Result

		for cur.Next(context.TODO()) {
			result = &types.Result{}
			if err := cur.Decode(&result); err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(fmt.Sprintf("Error: %v", err)))

				return
			}

			break
		}

		if result == nil {
			continue
		}

		// Set the gauge values based on the result
		p.registeredMonitors[monitor.ID].WithLabelValues("status").Set(float64(result.Status))
		p.registeredMonitors[monitor.ID].WithLabelValues("value").Set(float64(result.Value))

		// Result will have a map of outputs, which could be multiple types
		for outKey := range result.Outputs {
			outValI, ok := result.Outputs[outKey].(int32)
			if !ok {
				continue
			}

			p.registeredMonitors[monitor.ID].WithLabelValues(outKey).Set(float64(outValI))

			outValF, ok := result.Outputs[outKey].(float32)
			if !ok {
				continue
			}

			p.registeredMonitors[monitor.ID].WithLabelValues(outKey).Set(float64(outValF))
		}
	}

	// Serve the metrics
	promhttp.Handler().ServeHTTP(w, r)
}
