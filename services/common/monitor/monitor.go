// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Overall monitor code
// ----------------------------------------------------------------------------

package monitor

import (
	"fmt"
	"log"
	"nanomon/services/common/database"
	"nanomon/services/common/result"
	"os"
	"time"

	"github.com/Knetic/govaluate"
	"github.com/prometheus/client_golang/prometheus"
)

const TypeHTTP = "http"
const TypePing = "ping"
const TypeTCP = "tcp"
const TypeDNS = "dns"

var ValidTypes = []string{TypeHTTP, TypePing, TypeTCP, TypeDNS}

type Monitor struct {
	ID         int
	Name       string            // Name
	Type       string            // Type of monitor, ping, http, tcp
	Interval   string            // Interval between runs
	Updated    time.Time         // Last time the monitor was updated
	Enabled    bool              // Enable or disable the monitor
	Rule       string            // Rules are run against the monitor result
	Target     string            // Target is the host to ping, or URL to check
	Properties map[string]string // Set of properties varies per monitor type

	// Used for alerts not stored in the database
	ErrorCount   int
	InErrorState bool

	// Callback event hooks
	OnRunEnd func(m *Monitor, r *result.Result)

	// Prometheus things for this monitor
	ticker *time.Ticker
	gauge  *prometheus.GaugeVec
}

// Start the monitor ticker, to run & execute the monitor on regular interval
func (m *Monitor) Start(delay int, db *database.DB) {
	if m.Enabled {
		log.Printf("### Starting monitor ticker '%s' every %s", m.Name, m.Interval)
	} else {
		log.Printf("### Monitor '%s' is disabled, will not be run", m.Name)
		return
	}

	intervalDuration, err := time.ParseDuration(m.Interval)
	if err != nil {
		log.Printf("### Monitor '%s' has invalid interval", m.Name)
		return
	}

	// Don't allow silly short intervals
	if intervalDuration < time.Second {
		log.Printf("### Monitor '%s' has an interval less than 1s", m.Name)
		return
	}

	// This offsets the start, preventing monitors from running at the same time
	if delay > 0 {
		time.Sleep(time.Duration(delay) * time.Second)
	}

	// Register the monitor as a Prometheus gauge
	m.registerGauge()

	// Run the monitor immediately on start
	_, result := m.run()
	if result != nil && db != nil {
		log.Printf("### Monitor '%s' initial run result: %d", m.Name, result.Status)

		err := result.Store(db)
		if err != nil {
			log.Printf("### Failed to store initial result for monitor '%s': %v", m.Name, err)
		}
	}

	m.ticker = time.NewTicker(intervalDuration)

	// This will block, so Start() should always be called with a goroutine
	for {
		<-m.ticker.C

		_, result = m.run()
		if result != nil && db != nil {
			log.Printf("### Monitor '%s' run result: %d", m.Name, result.Status)

			err := result.Store(db)
			if err != nil {
				log.Printf("### Failed to store result for monitor '%s': %v", m.Name, err)
			}
		}
	}
}

// Internal function to run the monitor each time the ticker ticks
func (m *Monitor) run() (bool, *result.Result) {
	if !m.Enabled {
		return false, nil
	}

	if m.Target == "" {
		log.Printf("### Monitor '%s' has no target, will be skipped", m.Name)
		return false, nil
	}

	var res *result.Result

	log.Printf("### Running monitor '%s' at '%s'", m.Name, m.Target)

	switch m.Type {
	case TypeHTTP:
		res = m.runHTTP()

	case TypePing:
		res = m.runPing()

	case TypeTCP:
		res = m.runTCP()

	case TypeDNS:
		res = m.runDNS()

	default:
		log.Printf("### Unknown monitor type '%s', will be skipped", m.Type)
		return false, nil
	}

	if os.Getenv("DEBUG") == "true" {
		log.Printf("### DEBUG '%s' outputs: %+v", m.Name, res.Outputs)
	}

	// Logic block to evaluate the rule and set status & message accordingly
	// At this stage a result will either be StatusOK or StatusFailed
	if m.Rule != "" && res.Outputs != nil {
		ruleExp, err := govaluate.NewEvaluableExpression(m.Rule)
		if err != nil {
			res.Message = fmt.Sprintf("rule expression error: %s", err.Error())
			res.Status = result.StatusFailed
		}

		if ruleExp != nil {
			ruleResult, err := ruleExp.Evaluate(res.Outputs)
			if err != nil {
				res.Message = fmt.Sprintf("rule eval error: %s", err.Error())
				res.Status = result.StatusFailed
			}

			ruleResultBool, isBool := ruleResult.(bool)
			if !isBool && res.Status != result.StatusFailed {
				res.Message = "rule didn't return a bool"
				res.Status = result.StatusFailed
			}

			// Rule can put the result into error status
			if !ruleResultBool && isBool && res.Status != result.StatusFailed {
				res.Status = result.StatusError
				res.Message = fmt.Sprintf("Rule violated: %s", m.Rule)
			}
		}
	}

	// Remove the body from the outputs after rules are checked
	// TODO: Serious leakiness from HTTP monitor here
	if res.Outputs["body"] != nil {
		res.Outputs["body"] = "*** Removed ***"
	}

	// Update the values in the Prometheus gauge
	m.updateGauge(res)

	if res.Status > result.StatusOK {
		m.ErrorCount++

		// Call the OnRunEnd callback if set
		if m.OnRunEnd != nil {
			m.OnRunEnd(m, res)
		}

		return false, res
	} else {
		m.ErrorCount = 0
		m.InErrorState = false
	}

	// Call the OnRunEnd callback if set
	if m.OnRunEnd != nil {
		m.OnRunEnd(m, res)
	}

	return true, res
}

// Stop the monitor
func (m *Monitor) Stop() {
	log.Println("### Stopping monitor", m.Name)

	// Unregister the Prometheus gauge for this monitor
	m.unregisterGauge()

	if m.ticker != nil {
		m.ticker.Stop()
	}
}
