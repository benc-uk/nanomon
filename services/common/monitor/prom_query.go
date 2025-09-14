// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Prometheus query monitor implementation
// ----------------------------------------------------------------------------

package monitor

import (
	"context"
	"fmt"
	"nanomon/services/common/result"
	"time"

	"github.com/prometheus/client_golang/api"
	v1 "github.com/prometheus/client_golang/api/prometheus/v1"
	"github.com/prometheus/common/model"
)

func (m *Monitor) runPromQuery() *result.Result {
	r := result.NewResult(m.Name, m.Target, m.ID)

	var err error

	timeoutStr := "30s"
	if timeoutProp, ok := m.Properties["timeout"]; ok && timeoutProp != "" {
		timeoutStr = timeoutProp
	}

	// Parse timeout string to time.Duration
	timeout, err := time.ParseDuration(timeoutStr)
	if err != nil {
		return result.NewFailedResult(m.Name, m.Target, m.ID, err)
	}
	query, ok := m.Properties["query"]
	if !ok || query == "" {
		return result.NewFailedResult(m.Name, m.Target, m.ID, fmt.Errorf("no query provided in properties"))
	}

	// Create a Prometheus client
	promClient, err := api.NewClient(api.Config{
		Address: m.Target,
	})
	if err != nil {
		return result.NewFailedResult(m.Name, m.Target, m.ID, err)
	}

	// Create API client from the HTTP client
	v1api := v1.NewAPI(promClient)

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Execute the query
	queryRes, _, err := v1api.Query(ctx, query, time.Now())
	if err != nil {
		return result.NewFailedResult(m.Name, m.Target, m.ID, err)
	}

	outputs := map[string]any{}

	switch queryRes.Type() {
	case model.ValScalar:
		scalarVal := queryRes.(*model.Scalar)
		r.Status = result.StatusOK
		r.Value = float64(scalarVal.Value)
		outputs["metric"] = scalarVal.String()
		outputs["prom_timestamp"] = scalarVal.Timestamp.Time()
		outputs["value"] = float64(scalarVal.Value)
		outputs["result_type"] = "scalar"
		outputs["result_count"] = 1
	case model.ValVector:
		vectorVal := queryRes.(model.Vector)

		// Regardless of how many results, just take the first one
		sample := vectorVal[0]

		r.Status = result.StatusOK
		r.Value = float64(sample.Value)
		outputs["metric"] = sample.Metric.String()
		outputs["prom_timestamp"] = sample.Timestamp.Time()
		outputs["value"] = float64(sample.Value)
		outputs["result_type"] = "vector"
		outputs["result_count"] = len(vectorVal)
	}

	r.Outputs = outputs

	return r
}
