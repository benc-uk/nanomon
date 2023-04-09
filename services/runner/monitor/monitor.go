package monitor

import (
	"fmt"
	"log"
	"math/rand"
	"nanomon/services/common/database"
	"nanomon/services/common/types"
	"os"
	"time"

	"github.com/Knetic/govaluate"
)

const typeHTTP = "http"
const typePing = "ping"
const typeTCP = "tcp"

type Monitor struct {
	Name         string            // Name
	Type         string            // Type of monitor, ping, http, tcp
	Interval     string            // Interval between runs
	Updated      time.Time         // Last time the monitor was updated
	Enabled      bool              // Enable or disable the monitor
	Rule         string            // Rules are run against the monitor result
	Target       string            // Target is the host to ping, or URL to check
	Properties   map[string]string // Set of properties varies per monitor type
	ErrorCount   int               // For alerting, keeping track of non-OK count
	InErrorState bool              // For alerting, has triggered an alert

	ID string `bson:"_id"`

	ticker *time.Ticker
	db     *database.DB
}

// Create a new monitor
func NewMonitor(db *database.DB) *Monitor {
	return &Monitor{
		db: db,
	}
}

// Start the monitor ticker
func (m *Monitor) Start(withDelay bool) {
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

	// This offsets the start by random amount preventing monitors from running at the same time
	if withDelay {
		delaySecMax := int(intervalDuration.Seconds())
		if delaySecMax > 20 {
			delaySecMax = 20
		}

		delaySecs := rand.Intn(delaySecMax)
		time.Sleep(time.Duration(delaySecs) * time.Second)
	}

	m.run()

	m.ticker = time.NewTicker(intervalDuration)

	// This will block, so Start() should always be called with a goroutine
	for {
		<-m.ticker.C
		_, _ = m.run()
	}
}

// Internal function to run the monitor each time the ticker ticks
func (m *Monitor) run() (bool, *types.Result) {
	if !m.Enabled {
		return false, nil
	}

	if m.Target == "" {
		log.Printf("### Monitor '%s' has no target, will be skipped", m.Name)
		return false, nil
	}

	var result *types.Result

	log.Printf("### Running monitor '%s' at '%s'", m.Name, m.Target)

	switch m.Type {
	case typeHTTP:
		result = m.runHTTP()

	case typePing:
		result = m.runPing()

	case typeTCP:
		result = m.runTCP()

	default:
		log.Printf("### Unknown monitor type '%s', will be skipped", m.Type)
		return false, nil
	}

	if os.Getenv("DEBUG") == "true" {
		log.Printf("### DEBUG '%s' outputs: %+v", m.Name, result.Outputs)
	}

	// Logic block to evaluate the rule and set status & message accordingly
	// At this stage a result will either be StatusOK or StatusFailed
	if m.Rule != "" && result.Outputs != nil {
		ruleExp, err := govaluate.NewEvaluableExpression(m.Rule)
		if err != nil {
			result.Message = fmt.Sprintf("rule expression error: " + err.Error())
			result.Status = types.StatusFailed
		}

		if ruleExp != nil {
			ruleResult, err := ruleExp.Evaluate(result.Outputs)
			if err != nil {
				result.Message = fmt.Sprintf("rule eval error: " + err.Error())
				result.Status = types.StatusFailed
			}

			ruleResultBool, isBool := ruleResult.(bool)
			if !isBool && result.Status != types.StatusFailed {
				result.Message = "rule didn't return a bool"
				result.Status = types.StatusFailed
			}

			// Rule can put the result into error status
			if !ruleResultBool && isBool && result.Status != types.StatusFailed {
				result.Status = types.StatusError
				result.Message = fmt.Sprintf("Rule violated: %s", m.Rule)
			}
		}
	}

	// Remove the body from the outputs after rules are checked
	// TODO: Serious leakiness from HTTP monitor here
	if result.Outputs["body"] != nil {
		result.Outputs["body"] = "*** Removed ***"
	}

	checkForAlerts(m, *result)

	// Finally store the result to the database
	err := storeResult(m.db, *result)
	if err != nil {
		log.Printf("### Error storing result: %s", err.Error())
		return false, result
	}

	if result.Status > types.StatusOK {
		m.ErrorCount++
		return false, result
	}

	m.ErrorCount = 0
	m.InErrorState = false

	return true, result
}

// ========================================================================
// Stop the monitor
// ========================================================================
func (m *Monitor) Stop() {
	log.Println("### Stopping monitor", m.Name)

	if m.ticker != nil {
		m.ticker.Stop()
	}
}
