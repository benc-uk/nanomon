// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Tests for Prometheus scrape monitor
// ----------------------------------------------------------------------------

package monitor

import (
	"nanomon/services/common/result"
	"net/http"
	"net/http/httptest"
	"testing"
)

const fakeMetrics = `# HELP go_goroutines Number of goroutines that currently exist.
# TYPE go_goroutines gauge
go_goroutines 42
# HELP http_requests_total Total number of HTTP requests.
# TYPE http_requests_total counter
http_requests_total{method="GET",code="200"} 1027
http_requests_total{method="POST",code="200"} 56
http_requests_total{method="GET",code="404"} 12
# HELP node_cpu_seconds_total Seconds the CPUs spent in each mode.
# TYPE node_cpu_seconds_total counter
node_cpu_seconds_total{cpu="0",mode="idle"} 98765.43
node_cpu_seconds_total{cpu="0",mode="user"} 1234.56
`

func newFakeMetricsServer() *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(fakeMetrics))
	}))
}

func TestPromScrapeBasicGauge(t *testing.T) {
	srv := newFakeMetricsServer()
	defer srv.Close()

	m := Monitor{}
	m.Name = "test prom scrape gauge"
	m.Enabled = true
	m.Type = TypePromScrape
	m.Target = srv.URL
	m.Properties = map[string]string{
		"metric": "go_goroutines",
	}

	ok, res := m.run()
	if !ok {
		t.Fatalf("Expected run to succeed, got failure: %s", res.Message)
	}

	if res.Status != result.StatusOK {
		t.Errorf("Expected StatusOK, got %d", res.Status)
	}

	if res.Value != 42 {
		t.Errorf("Expected value 42, got %f", res.Value)
	}

	if res.Outputs["matched"] != true {
		t.Errorf("Expected matched=true, got %v", res.Outputs["matched"])
	}

	if res.Outputs["metricType"] != "GAUGE" {
		t.Errorf("Expected metricType=GAUGE, got %v", res.Outputs["metricType"])
	}
}

func TestPromScrapeCounterWithLabels(t *testing.T) {
	srv := newFakeMetricsServer()
	defer srv.Close()

	m := Monitor{}
	m.Name = "test prom scrape counter labels"
	m.Enabled = true
	m.Type = TypePromScrape
	m.Target = srv.URL
	m.Properties = map[string]string{
		"metric": "http_requests_total",
		"labels": "method=GET,code=200",
	}

	ok, res := m.run()
	if !ok {
		t.Fatalf("Expected run to succeed, got failure: %s", res.Message)
	}

	if res.Status != result.StatusOK {
		t.Errorf("Expected StatusOK, got %d", res.Status)
	}

	if res.Value != 1027 {
		t.Errorf("Expected value 1027, got %f", res.Value)
	}

	if res.Outputs["matchCount"] != 1 {
		t.Errorf("Expected matchCount=1, got %v", res.Outputs["matchCount"])
	}
}

func TestPromScrapeCounterNoLabels(t *testing.T) {
	srv := newFakeMetricsServer()
	defer srv.Close()

	m := Monitor{}
	m.Name = "test prom scrape counter no label filter"
	m.Enabled = true
	m.Type = TypePromScrape
	m.Target = srv.URL
	m.Properties = map[string]string{
		"metric": "http_requests_total",
	}

	ok, res := m.run()
	if !ok {
		t.Fatalf("Expected run to succeed, got failure: %s", res.Message)
	}

	if res.Status != result.StatusOK {
		t.Errorf("Expected StatusOK, got %d", res.Status)
	}

	// Should match all 3 http_requests_total metrics
	if res.Outputs["matchCount"] != 3 {
		t.Errorf("Expected matchCount=3, got %v", res.Outputs["matchCount"])
	}
}

func TestPromScrapeMetricNotFound(t *testing.T) {
	srv := newFakeMetricsServer()
	defer srv.Close()

	m := Monitor{}
	m.Name = "test prom scrape not found"
	m.Enabled = true
	m.Type = TypePromScrape
	m.Target = srv.URL
	m.Properties = map[string]string{
		"metric": "nonexistent_metric",
	}

	ok, res := m.run()
	if !ok {
		t.Fatalf("Expected run to succeed (metric not found is still OK), got failure: %s", res.Message)
	}

	if res.Status != result.StatusOK {
		t.Errorf("Expected StatusOK, got %d", res.Status)
	}

	if res.Outputs["matched"] != false {
		t.Errorf("Expected matched=false, got %v", res.Outputs["matched"])
	}
}

func TestPromScrapeNoMetricProperty(t *testing.T) {
	srv := newFakeMetricsServer()
	defer srv.Close()

	m := Monitor{}
	m.Name = "test prom scrape no metric prop"
	m.Enabled = true
	m.Type = TypePromScrape
	m.Target = srv.URL
	m.Properties = map[string]string{}

	ok, res := m.run()
	if ok {
		t.Errorf("Expected run to fail when no metric property is set")
	}

	if res.Status != result.StatusFailed {
		t.Errorf("Expected StatusFailed, got %d", res.Status)
	}
}

func TestPromScrapeBadTarget(t *testing.T) {
	m := Monitor{}
	m.Name = "test prom scrape bad target"
	m.Enabled = true
	m.Type = TypePromScrape
	m.Target = "http://this-host-does-not-exist.invalid/metrics"
	m.Properties = map[string]string{
		"metric":  "go_goroutines",
		"timeout": "1s",
	}

	ok, res := m.run()
	if ok {
		t.Errorf("Expected run to fail with bad target")
	}

	if res.Status != result.StatusFailed {
		t.Errorf("Expected StatusFailed, got %d", res.Status)
	}
}

func TestPromScrapeHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	m := Monitor{}
	m.Name = "test prom scrape http error"
	m.Enabled = true
	m.Type = TypePromScrape
	m.Target = srv.URL
	m.Properties = map[string]string{
		"metric": "go_goroutines",
	}

	ok, res := m.run()
	if ok {
		t.Errorf("Expected run to fail with HTTP 500")
	}

	if res.Status != result.StatusFailed {
		t.Errorf("Expected StatusFailed, got %d", res.Status)
	}
}

func TestPromScrapeWithRule(t *testing.T) {
	srv := newFakeMetricsServer()
	defer srv.Close()

	m := Monitor{}
	m.Name = "test prom scrape with rule"
	m.Enabled = true
	m.Type = TypePromScrape
	m.Target = srv.URL
	m.Rule = "value > 100"
	m.Properties = map[string]string{
		"metric": "go_goroutines",
	}

	ok, res := m.run()
	// Rule "value > 100" should fail since value is 42
	if ok {
		t.Errorf("Expected rule violation to cause failure")
	}

	if res.Status != result.StatusError {
		t.Errorf("Expected StatusError (rule violation), got %d", res.Status)
	}
}

func TestPromScrapeLabelFilterNoMatch(t *testing.T) {
	srv := newFakeMetricsServer()
	defer srv.Close()

	m := Monitor{}
	m.Name = "test prom scrape label no match"
	m.Enabled = true
	m.Type = TypePromScrape
	m.Target = srv.URL
	m.Properties = map[string]string{
		"metric": "http_requests_total",
		"labels": "method=DELETE",
	}

	ok, res := m.run()
	if !ok {
		t.Fatalf("Expected run to succeed, got failure: %s", res.Message)
	}

	if res.Outputs["matchCount"] != 0 {
		t.Errorf("Expected matchCount=0, got %v", res.Outputs["matchCount"])
	}
}
