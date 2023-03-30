package monitor

import (
	"io"
	"log"
	"testing"
	"time"
)

func init() {
	// Comment out this line to see debug output
	log.SetOutput(io.Discard)
}

func TestMonitorDisabledStart(t *testing.T) {
	m := NewMonitor(nil)
	m.Name = "unit test disabled start"
	m.Enabled = false
	m.IntervalDuration = 10 * time.Second

	go m.Start()
	time.Sleep(10 * time.Millisecond)

	if m.ticker != nil {
		t.Errorf("Ticker should be nil when monitor is disabled")
	}
}

func TestMonitorNoIntervalStart(t *testing.T) {
	m := NewMonitor(nil)
	m.Name = "unit test no interval start"
	m.Enabled = true

	go m.Start()
	time.Sleep(10 * time.Millisecond)

	if m.ticker != nil {
		t.Errorf("Ticker should be nil when monitor has no interval")
	}
}

func TestMonitorDisabledRun(t *testing.T) {
	m := NewMonitor(nil)
	m.Name = "unit test disabled run"

	ok, _ := m.run()
	if ok {
		t.Errorf("Monitor should return false when disabled")
	}
}

func TestMonitorNoTarget(t *testing.T) {
	m := NewMonitor(nil)
	m.Name = "unit test no target"
	m.Enabled = true

	ok, _ := m.run()
	if ok {
		t.Errorf("Monitor should return false when no target is set")
	}
}

func TestMonitorNoType(t *testing.T) {
	m := NewMonitor(nil)
	m.Name = "unit test no type"
	m.Enabled = true
	m.Target = "http://dummy"

	ok, _ := m.run()
	if ok {
		t.Errorf("Monitor should return false when no type is set")
	}
}

func TestMonitorRuleEval(t *testing.T) {
	m := NewMonitor(nil)
	m.Name = "unit test rule bad"
	m.Enabled = true
	m.Target = "http://example.net"
	m.Type = typeHTTP
	m.Rule = "ozzy > 6"

	ok, _ := m.run()
	if ok {
		t.Errorf("Monitor should return false with bad rule")
	}
}

func TestMonitorRuleExp(t *testing.T) {
	m := NewMonitor(nil)
	m.Name = "unit test rule bad"
	m.Enabled = true
	m.Target = "http://example.net"
	m.Type = typeHTTP
	m.Rule = ",,3!"

	ok, _ := m.run()
	if ok {
		t.Errorf("Monitor should return false with bad rule")
	}
}

func TestMonitorRuleNotBool(t *testing.T) {
	m := NewMonitor(nil)
	m.Name = "unit test rule bad"
	m.Enabled = true
	m.Target = "http://example.net"
	m.Type = typeHTTP
	m.Rule = "5 + 9"

	ok, _ := m.run()
	if ok {
		t.Errorf("Monitor should return false with non-bool rule")
	}
}
