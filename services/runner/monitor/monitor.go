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
	ID               string `bson:"_id"`
	Name             string
	Type             string
	Interval         string
	IntervalDuration time.Duration
	Updated          time.Time
	Enabled          bool
	Rule             string
	Target           string
	Properties       map[string]string
	FailCount        int
	FailedState      bool

	ticker *time.Ticker
	db     *database.DB
}

// ========================================================================
// Create a new monitor
// ========================================================================
func NewMonitor(db *database.DB) *Monitor {
	return &Monitor{
		db: db,
	}
}

// ========================================================================
// Start the monitor ticker
// ========================================================================
func (m *Monitor) Start(withDelay bool) {
	if m.Enabled {
		log.Printf("### Starting monitor ticker '%s' every %s", m.Name, m.Interval)
	} else {
		log.Printf("### Monitor '%s' is disabled, will not be run", m.Name)
		return
	}

	if m.IntervalDuration == 0 {
		log.Printf("### Monitor '%s' has no interval, it can not be started", m.Name)
		return
	}

	// This offsets the start by random amount preventing monitors from running at the same time
	if withDelay {
		delaySecs := rand.Intn(int(m.IntervalDuration.Seconds()))
		time.Sleep(time.Duration(delaySecs) * time.Second)
	}

	m.run()

	m.ticker = time.NewTicker(m.IntervalDuration)

	// This will block, so Start() should always be called with a goroutine
	for {
		<-m.ticker.C
		_, _ = m.run()
	}
}

// ========================================================================
// Internal function to run the monitor each time the ticker ticks
// ========================================================================
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

	if m.Rule != "" && result.Outputs != nil {
		//log.Printf("### Running rule '%s' for monitor '%s'", m.Rule, m.Name)
		ruleExp, err := govaluate.NewEvaluableExpression(m.Rule)
		if err != nil {
			result = types.NewFailedResult(m.Name, m.Target, m.ID, fmt.Errorf("rule expression error: "+err.Error()))
			_ = storeResult(m, *result)

			return false, result
		}

		res, err := ruleExp.Evaluate(result.Outputs)
		if err != nil {
			result = types.NewFailedResult(m.Name, m.Target, m.ID, fmt.Errorf("rule eval error: "+err.Error()))
			_ = storeResult(m, *result)

			return false, result
		}

		ruleResult, isBool := res.(bool)
		if !isBool {
			result = types.NewFailedResult(m.Name, m.Target, m.ID, fmt.Errorf("rule didn't return a bool"))
			_ = storeResult(m, *result)

			return false, result
		}

		if !ruleResult {
			result.Status = types.StatusError
			result.Message = fmt.Sprintf("Rule failed: %s", m.Rule)
		}
	}

	// Remove the body from the outputs after rules are checked
	// TODO: Horrible leakiness from HTTP monitor here, should be fixed
	if result.Outputs["body"] != nil {
		result.Outputs["body"] = "*** Removed ***"
	}

	err := storeResult(m, *result)
	if err != nil {
		log.Printf("### Error storing result: %s", err.Error())
		return false, result
	}

	if result.Status > 0 {
		return false, result
	}

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
