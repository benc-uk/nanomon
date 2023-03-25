package monitor

import (
	"fmt"
	"log"
	"math/rand"
	"monitr/services/common/database"
	"monitr/services/common/types"
	"strings"
	"time"

	"github.com/Knetic/govaluate"
)

const TYPE_HTTP = "http"
const TYPE_PING = "ping"
const TYPE_TCP = "tcp"

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

	ticker *time.Ticker
	db     *database.DB
}

func NewMonitor(db *database.DB) *Monitor {
	return &Monitor{
		db: db,
	}
}

// Use a timer.Ticker to run this monitor in the background
func (m *Monitor) Start() {
	log.Printf("### Starting monitor ticker '%s' every %s", m.Name, m.Interval)

	// This offsets the start by random amount preventing monitors from running at the same time
	delaySecs := rand.Intn(int(m.IntervalDuration.Seconds()))
	time.Sleep(time.Duration(delaySecs) * time.Second)

	m.run()

	m.ticker = time.NewTicker(m.IntervalDuration)

	// This will block, so Start() should always be called with a goroutine
	for {
		select {
		case <-m.ticker.C:
			m.run()
		}
	}
}

func (m *Monitor) run() {
	if !m.Enabled {
		return
	}

	var result *types.Result
	var outputs map[string]interface{}

	log.Printf("### Running monitor '%s' at '%s'", m.Name, m.Target)

	switch m.Type {
	case TYPE_HTTP:
		result, outputs = m.runHTTP()

	case TYPE_PING:
		result, outputs = m.runPing()

	case TYPE_TCP:
		result, outputs = m.runTCP()

	default:
		log.Printf("### Unknown monitor type '%s', will be skipped", m.Type)
		return
	}

	// log outputs
	log.Printf("### Monitor '%s' outputs: %v", m.Name, outputs)

	if m.Rule != "" && outputs != nil {
		functions := map[string]govaluate.ExpressionFunction{}

		if outputs["body"] != nil {
			body := outputs["body"].(string)

			functions["bodyContains"] = func(args ...interface{}) (interface{}, error) {
				lookfor := args[0].(string)
				if lookfor == "" {
					return false, nil
				}

				return strings.Contains(body, lookfor), nil
			}
		}

		ruleExp, err := govaluate.NewEvaluableExpressionWithFunctions(m.Rule, functions)
		if err != nil {
			result = types.NewFailedResult(m.ID, fmt.Errorf("Rule error: "+err.Error()))
			storeResult(m.db, *result)
			return
		}

		res, err := ruleExp.Evaluate(outputs)
		if err != nil {
			result = types.NewFailedResult(m.ID, fmt.Errorf("Rule error: "+err.Error()))
			storeResult(m.db, *result)
			return
		}

		ruleResult, isBool := res.(bool)
		if !isBool {
			result = types.NewFailedResult(m.ID, fmt.Errorf("Rule didn't return a bool"))
			storeResult(m.db, *result)
			return
		}

		if !ruleResult {
			result.Status = types.STATUS_ERROR
			result.Message = fmt.Sprintf("Rule breached: %s", m.Rule)
		}
	}

	storeResult(m.db, *result)
}

func (m *Monitor) Stop() {
	log.Println("### Stopping monitor", m.Name)
	m.ticker.Stop()
}
