package monitor

import (
	"fmt"
	"log"
	"math/rand"
	"monitr/services/common/database"
	"monitr/services/common/types"
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
	if m.Enabled {
		log.Printf("### Starting monitor ticker '%s' every %s", m.Name, m.Interval)
	} else {
		log.Printf("### Monitor '%s' is disabled, will not be run", m.Name)
	}

	// This offsets the start by random amount preventing monitors from running at the same time
	delaySecs := rand.Intn(int(m.IntervalDuration.Seconds()))
	time.Sleep(time.Duration(delaySecs) * time.Second)

	m.run()

	m.ticker = time.NewTicker(m.IntervalDuration)

	// This will block, so Start() should always be called with a goroutine
	for {
		<-m.ticker.C
		m.run()
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
	case typeHTTP:
		result, outputs = m.runHTTP()

	case typePing:
		result, outputs = m.runPing()

	case typeTCP:
		result, outputs = m.runTCP()

	default:
		log.Printf("### Unknown monitor type '%s', will be skipped", m.Type)
		return
	}

	log.Printf("### Monitor '%s' outputs: %v", m.Name, outputs)

	if m.Rule != "" && outputs != nil {
		ruleExp, err := govaluate.NewEvaluableExpression(m.Rule)
		if err != nil {
			result = types.NewFailedResult(m.Name, m.Target, m.ID, fmt.Errorf("rule error: "+err.Error()))
			_ = storeResult(m.db, *result)

			return
		}

		res, err := ruleExp.Evaluate(outputs)
		if err != nil {
			result = types.NewFailedResult(m.Name, m.Target, m.ID, fmt.Errorf("rule error: "+err.Error()))
			_ = storeResult(m.db, *result)

			return
		}

		ruleResult, isBool := res.(bool)
		if !isBool {
			result = types.NewFailedResult(m.Name, m.Target, m.ID, fmt.Errorf("rule didn't return a bool"))
			_ = storeResult(m.db, *result)

			return
		}

		if !ruleResult {
			result.Status = types.StatusError
			result.Message = fmt.Sprintf("Rule failed: %s", m.Rule)
		}
	}

	_ = storeResult(m.db, *result)
}

func (m *Monitor) Stop() {
	log.Println("### Stopping monitor", m.Name)
	m.ticker.Stop()
}
