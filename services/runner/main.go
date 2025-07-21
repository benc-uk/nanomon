// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Runs and executes monitors
// ----------------------------------------------------------------------------

package main

import (
	"encoding/json"
	"log"
	"nanomon/services/common/database"
	"nanomon/services/common/monitor"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/benc-uk/go-rest-api/pkg/env"
	"github.com/lib/pq"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	db        *database.DB
	monitors  []*monitor.Monitor
	version   = "0.0.0"            // App version number, injected at build time
	buildInfo = "No build details" // Build details, injected at build time

	// Used only when Prometheus is enabled
	promServer *http.Server
)

func main() {
	log.Println("🏃 NanoMon runner is starting...")
	log.Println("Version:", version, buildInfo)

	if IsAlertingEnabled() {
		log.Printf("Alerting is enabled, emails will be sent went monitors fail")
	}

	db = database.ConnectToDB()

	var err error

	monitors, err = monitor.FetchMonitors(db)
	if err != nil {
		log.Fatalln("Error loading monitors:", err)
	}

	// Try to watch the database for changes
	// Listen for notifications on all monitor channels
	channels := []string{"new_monitor", "monitor_updated", "monitor_deleted"}
	for _, channel := range channels {
		err = db.Listener.Listen(channel)
		if err != nil {
			log.Fatalf("Failed to start listening on channel %s: %v", channel, err)
		}

		log.Printf("Listening for updates on channel: %s\n", channel)
	}

	// Optionally start the Prometheus metrics server
	if env.GetEnvBool("PROMETHEUS_ENABLED", false) {
		port := env.GetEnvString("PROMETHEUS_PORT", "8080")

		mux := http.NewServeMux()
		mux.Handle("/metrics", promhttp.Handler())

		promServer = &http.Server{
			Addr:         ":" + port,
			Handler:      mux,
			ReadTimeout:  2 * time.Second,
			WriteTimeout: 2 * time.Second,
		}

		// Start the Prometheus metrics server in a goroutine
		go func() {
			log.Printf("Prometheus enabled")
			log.Printf("Metrics endpoint: http://localhost:%s/metrics", port)

			err := promServer.ListenAndServe()
			if err != nil {
				log.Println("Prometheus server failed to start", err)
			}
		}()
	}

	// Start the monitors loaded from the database
	// Note they each run in their own goroutines
	for i, m := range monitors {
		// Inject the alerting callback
		m.OnRunEnd = checkForAlerts

		// Delay each monitor start by 2 seconds for a staggered start
		go m.Start(i*2, db)
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	defer shutdown()

	// Main loop
	for {
		select {
		case notification := <-db.Listener.Notify:
			if notification != nil {
				handleNotification(notification)
			}
		case <-sigChan:
			return
		}
	}
}

// This function handles notifications from the database listener
// It processes monitor creation, update, and deletion events
func handleNotification(notification *pq.Notification) {
	switch notification.Channel {
	case "new_monitor":
		mon := &monitor.Monitor{
			OnRunEnd: checkForAlerts,
		}

		err := json.Unmarshal([]byte(notification.Extra), mon)
		if err != nil {
			log.Println("Error parsing new monitor JSON:", err)
			return
		}

		log.Printf("New monitor created: %s", mon.Name)

		monitors = append(monitors, mon)
		go mon.Start(0, db) // Start immediately

	case "monitor_updated":
		updatedMon := &monitor.Monitor{
			OnRunEnd: checkForAlerts,
		}

		err := json.Unmarshal([]byte(notification.Extra), updatedMon)
		if err != nil {
			log.Println("Error parsing updated monitor JSON:", err)

			return
		}

		for i, m := range monitors {
			if m.ID == updatedMon.ID {
				monitors[i].Stop()

				go updatedMon.Start(0, db)

				monitors[i] = updatedMon

				log.Printf("Monitor updated: %s", notification.Extra)

				return
			}
		}

	case "monitor_deleted":
		idInt, _ := strconv.Atoi(notification.Extra)
		for i, m := range monitors {
			if m.ID == idInt {
				name := monitors[i].Name
				log.Printf("Attempting to stop & remove monitor %d (%s)", idInt, name)

				monitors[i].Stop()
				monitors = append(monitors[:i], monitors[i+1:]...)

				log.Printf("Monitor '%s' removed from pool", name)

				return
			}
		}

	default:
		log.Println("Warning! Unknown notification channel:", notification.Channel)
	}
}

func shutdown() {
	log.Println("Signal received, attempting graceful shutdown")
	db.Close()

	for _, m := range monitors {
		go m.Stop()
	}
}
