// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Support for Prometheus metrics
// ----------------------------------------------------------------------------

package monitor

import (
	"fmt"
	"log"
	"nanomon/services/common/types"
	"strings"

	"github.com/prometheus/client_golang/prometheus"
)

// Register a monitor as a gauge in Prometheus
func (m *Monitor) registerGauge() {
	// Avoid creating the same gauge multiple times
	if m.gauge != nil {
		return
	}

	m.gauge = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: strings.ToLower(strings.ReplaceAll(m.Name, " ", "_")),
		Help: fmt.Sprintf("%s (%s)", m.Name, m.Type),
		ConstLabels: prometheus.Labels{
			"id":   m.ID,
			"type": m.Type,
		},
		Namespace: "nanomon",
	}, []string{"result"})

	err := prometheus.Register(m.gauge)
	if err != nil {
		log.Printf("### Error registering gauge: %v\n", err)
		m.gauge = nil
	}
}

// Unregister the gauge from Prometheus
func (m *Monitor) unregisterGauge() {
	if m.gauge != nil {
		prometheus.Unregister(m.gauge)
	}
}

// Update the gauge with the given monitor result
func (m *Monitor) updateGauge(r *types.Result) {
	if m.gauge != nil {
		m.gauge.WithLabelValues("_status").Set(float64(r.Status))
		m.gauge.WithLabelValues("_value").Set(float64(r.Value))

		// Result will have a map of outputs, which could be multiple types
		// Assert the type and set the gauge value if it is a float or int
		for outKey := range r.Outputs {
			outValI, ok := r.Outputs[outKey].(int)
			if ok {
				m.gauge.WithLabelValues(outKey).Set(float64(outValI))
				continue
			}

			outValF, ok := r.Outputs[outKey].(float64)
			if ok {
				m.gauge.WithLabelValues(outKey).Set(outValF)
			}
		}
	}
}
