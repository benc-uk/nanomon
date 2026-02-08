// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Prometheus scrape monitor implementation
// Scrapes raw Prometheus metrics from a /metrics endpoint
// ----------------------------------------------------------------------------

package monitor

import (
	"fmt"
	"io"
	"nanomon/services/common/result"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/prometheus/common/expfmt"
	"github.com/prometheus/common/model"
)

func (m *Monitor) runPromScrape() *result.Result {
	r := result.NewResult(m.Name, m.Target, m.ID)

	var err error

	timeoutStr := "5s"
	if timeoutProp, ok := m.Properties["timeout"]; ok && timeoutProp != "" {
		timeoutStr = timeoutProp
	}

	timeout, err := time.ParseDuration(timeoutStr)
	if err != nil {
		return result.NewFailedResult(m.Name, m.Target, m.ID, err)
	}

	metricName := m.Properties["metric"]
	if metricName == "" {
		return result.NewFailedResult(m.Name, m.Target, m.ID, fmt.Errorf("no metric name provided in properties"))
	}

	// Optional label filter in the format "key=value,key2=value2"
	labelFilter := make(map[string]string)

	if labelsStr, ok := m.Properties["labels"]; ok && labelsStr != "" {
		for _, pair := range strings.Split(labelsStr, ",") {
			parts := strings.SplitN(strings.TrimSpace(pair), "=", 2)
			if len(parts) == 2 {
				val := strings.TrimSpace(parts[1])
				// Remove surrounding quotes if present
				val = strings.Trim(val, `"`)
				labelFilter[strings.TrimSpace(parts[0])] = val
			}
		}
	}

	client := http.Client{
		Timeout: timeout,
	}

	start := time.Now()

	resp, err := client.Get(m.Target)
	if err != nil {
		return result.NewFailedResult(m.Name, m.Target, m.ID, err)
	}
	defer resp.Body.Close()

	respTime := float64(time.Since(start).Milliseconds())

	if resp.StatusCode != http.StatusOK {
		return result.NewFailedResult(m.Name, m.Target, m.ID,
			fmt.Errorf("scrape returned HTTP %d", resp.StatusCode))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return result.NewFailedResult(m.Name, m.Target, m.ID, err)
	}

	// Parse the Prometheus text exposition format
	parser := expfmt.NewTextParser(model.UTF8Validation)

	metricFamilies, err := parser.TextToMetricFamilies(strings.NewReader(string(body)))
	if err != nil {
		return result.NewFailedResult(m.Name, m.Target, m.ID, fmt.Errorf("failed to parse metrics: %w", err))
	}

	outputs := map[string]any{
		"respTime":    respTime,
		"metricCount": len(metricFamilies),
	}

	// Find the requested metric family
	mf, found := metricFamilies[metricName]
	if !found {
		outputs["matched"] = false
		outputs["value"] = 0.0

		r.Outputs = outputs
		r.Value = 0
		r.Status = result.StatusOK

		return r
	}

	outputs["metricType"] = mf.GetType().String()
	outputs["metricHelp"] = mf.GetHelp()

	// Search through the metric samples for label matches
	matchCount := 0

	for _, metric := range mf.GetMetric() {
		// Check label filter if provided
		if len(labelFilter) > 0 {
			labels := make(map[string]string)
			for _, lp := range metric.GetLabel() {
				labels[lp.GetName()] = lp.GetValue()
			}

			match := true

			for k, v := range labelFilter {
				if labels[k] != v {
					match = false
					break
				}
			}

			if !match {
				continue
			}
		}

		matchCount++

		// Extract value based on metric type
		var value float64

		switch {
		case metric.GetGauge() != nil:
			value = metric.GetGauge().GetValue()
		case metric.GetCounter() != nil:
			value = metric.GetCounter().GetValue()
		case metric.GetUntyped() != nil:
			value = metric.GetUntyped().GetValue()
		case metric.GetSummary() != nil:
			value = metric.GetSummary().GetSampleSum()
		case metric.GetHistogram() != nil:
			value = metric.GetHistogram().GetSampleSum()
		default:
			continue
		}

		if m.Properties["valueMult"] != "" {
			multiplier, err := strconv.ParseFloat(m.Properties["valueMult"], 64)
			if err == nil {
				value *= multiplier
			}
		}

		// Build a label string for the output
		labelParts := []string{}
		for _, lp := range metric.GetLabel() {
			labelParts = append(labelParts, fmt.Sprintf("%s=%q", lp.GetName(), lp.GetValue()))
		}

		// Only take the first matching metric's value as the primary result
		if matchCount == 1 {
			r.Value = value
			outputs["value"] = value
			outputs["labels"] = strings.Join(labelParts, ", ")
		}

		// Add each matching metric as a separate output entry, kinda messy but allows us to see all matches in the UI
		outputs[strings.Join(labelParts, ", ")] = value
	}

	outputs["matched"] = matchCount > 0
	outputs["matchCount"] = matchCount
	r.Status = result.StatusOK
	r.Outputs = outputs

	return r
}
