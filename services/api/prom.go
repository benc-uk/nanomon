package main

import (
	"context"
	"fmt"
	"log"
	"nanomon/services/common/database"
	"nanomon/services/common/types"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type prometheusHelper struct {
	db                 *database.DB
	registeredMonitors map[string]*prometheus.GaugeVec
}

func newPrometheusHelper(db *database.DB) (*prometheusHelper, error) {
	p := &prometheusHelper{
		db:                 db,
		registeredMonitors: make(map[string]*prometheus.GaugeVec),
	}

	log.Println("### Prometheus metrics enabled")
	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Register all monitors as gauges
	cur, err := db.Monitors.Find(timeoutCtx, bson.M{})
	if err != nil {
		return nil, err
	}

	for cur.Next(context.TODO()) {
		m := &MonitorResp{}
		if err := cur.Decode(&m); err != nil {
			return nil, err
		}

		p.registerMonitorGauge(m)
	}

	return p, nil
}

func (p *prometheusHelper) registerMonitorGauge(m *MonitorResp) {
	// Avoid creating the same gauge multiple times
	if _, ok := p.registeredMonitors[m.ID]; ok {
		return
	}

	g := prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: m.getPromName(),
		Help: fmt.Sprintf("%s (%s)", m.Name, m.Type),
		ConstLabels: prometheus.Labels{
			"id":   m.ID,
			"type": m.Type,
		},
		Namespace: "nanomon",
	}, []string{"result"})

	prometheus.MustRegister(g)
	p.registeredMonitors[m.ID] = g
	log.Printf("Registered '%s' in Prometheus registry", m.Name)
}

func (p *prometheusHelper) unregisterMonitorGauge(id string) {
	prometheus.Unregister(p.registeredMonitors[id])
	delete(p.registeredMonitors, id)
}

func (p *prometheusHelper) httpHandler(w http.ResponseWriter, r *http.Request) {
	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Part 2 - Output each monitor as a gauge
	for id, g := range p.registeredMonitors {
		// Parse monitor.ID to oid
		oid, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(fmt.Sprintf("Error: %v", err)))

			return
		}

		options := options.Find().SetSort(bson.M{"date": -1}).SetLimit(1)

		// Part 3 - Get a single last result for the monitor from the database
		cur, err := p.db.Results.Find(timeoutCtx, bson.M{"monitor_id": oid}, options)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(fmt.Sprintf("Error: %v", err)))

			return
		}

		// Hold a single result
		var result *types.Result

		for cur.Next(context.TODO()) {
			result = &types.Result{}
			if err := cur.Decode(&result); err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				_, _ = w.Write([]byte(fmt.Sprintf("Error: %v", err)))

				return
			}

			break
		}

		if result == nil {
			continue
		}

		// Part 4 - Set the gauge values based on the result
		g.WithLabelValues("status").Set(float64(result.Status))
		g.WithLabelValues("value").Set(float64(result.Value))

		// Result will have a map of outputs, which could be multiple types
		// Assert the type and set the gauge value if it is a float or int
		for outKey := range result.Outputs {
			outValI, ok := result.Outputs[outKey].(int32)
			if !ok {
				continue
			}

			g.WithLabelValues(outKey).Set(float64(outValI))

			outValF, ok := result.Outputs[outKey].(float32)
			if !ok {
				continue
			}

			g.WithLabelValues(outKey).Set(float64(outValF))
		}
	}

	// Serve the metrics
	promhttp.Handler().ServeHTTP(w, r)
}
