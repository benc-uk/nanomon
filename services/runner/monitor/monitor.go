package monitor

import (
	"log"
	"math/rand"
	"monitr/services/common/database"
	"time"
)

const TYPE_HTTP = "http"

type Monitor struct {
	ID               string `bson:"_id"`
	Name             string
	Type             string
	Interval         string
	IntervalDuration time.Duration
	Updated          time.Time
	Enabled          bool
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
	log.Println("### Starting monitor", m.Name)

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
	switch m.Type {
	case TYPE_HTTP:
		m.runHTTP()
	}
}

func (m *Monitor) Stop() {
	log.Println("### Stopping monitor", m.Name)
	m.ticker.Stop()
}
