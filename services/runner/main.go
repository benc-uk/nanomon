// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Runs and executes monitors
// ----------------------------------------------------------------------------

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"nanomon/services/common/database"
	"nanomon/services/common/monitor"
	"net/http"
	"os"
	"os/signal"
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

// Entrypoint - begin here :)
func main() {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Try to trap shutdown signals and have a clean stop & exit
	go func() {
		<-sigChan
		shutdown()
		os.Exit(1)
	}()

	log.Println("### 🏃 NanoMon runner is starting...")
	log.Println("### Version:", version, buildInfo)

	if monitor.IsAlertingEnabled() {
		log.Printf("### Alerting is enabled, emails will be sent went monitors fail")
	}

	db = database.ConnectToDB()
	defer db.Close()

	var err error

	monitors, err = monitor.FetchMonitors(db)
	if err != nil {
		log.Fatalln("### Error loading monitors:", err)
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
			log.Printf("### Prometheus enabled")
			log.Printf("### Metrics endpoint: http://localhost:%s/metrics", port)

			err := promServer.ListenAndServe()
			if err != nil {
				log.Println("### Prometheus server failed to start", err)
			}
		}()
	}

	// Start the monitors loaded from the database
	// Note they each run in their own goroutines
	for i, m := range monitors {
		// Delay each monitor start by 2 seconds for a staggered start
		go m.Start(i*2, db)
	}

	// Try to watch the database for changes
	// Listen for notifications on all monitor channels
	channels := []string{"new_monitor", "monitor_updated", "monitor_deleted"}
	for _, channel := range channels {
		err = db.Listener.Listen(channel)
		if err != nil {
			log.Fatalf("Failed to start listening on channel %s: %v", channel, err)
		}
		fmt.Printf("📡 Listening on channel: %s\n", channel)
	}

	defer db.Listener.Close()
	defer db.Handle.Close()

	// Main loop
	for {
		select {
		case notification := <-db.Listener.Notify:
			if notification != nil {
				handleNotification(notification)
			}
		case <-sigChan:
			fmt.Println("\n👋 Received shutdown signal, exiting...")
			return
		case <-time.After(90 * time.Second):
			// Send a ping to keep the connection alive
			go func() {
				db.Listener.Ping()
			}()
		}
	}
}

func handleNotification(notification *pq.Notification) {
	switch notification.Channel {
	case "new_monitor":
		mon := &monitor.Monitor{}
		err := json.Unmarshal([]byte(notification.Extra), mon)
		if err != nil {
			log.Println("Error parsing new monitor JSON:", err)
			return
		}

		log.Printf("🆕 New monitor created: %s", mon.Name)
		monitors = append(monitors, mon)
		go mon.Start(0, db) // Start immediately

	case "monitor_updated":
		updatedMon := &monitor.Monitor{}
		err := json.Unmarshal([]byte(notification.Extra), updatedMon)
		if err != nil {
			log.Println("Error parsing updated monitor JSON:", err)
			return
		}

		for i, m := range monitors {
			if m.ID == updatedMon.ID {
				log.Printf("🔄 Updating monitor: %s", m.Name)
				log.Printf("### Monitor '%s' updated and restarted", m.Name)
				monitors[i].Stop()
				go updatedMon.Start(0, db)
				monitors[i] = updatedMon
				log.Printf("🔄 Monitor updated: %s", notification.Extra)
				return
			}
		}
		log.Printf("🔄 Monitor with ID %d not found for update", updatedMon.ID)

	// case "monitor_deleted":
	// 	log.Printf("❌ Monitor deleted: %s", notification.Extra)
	// 	for i, m := range monitors {
	// 		if m.ID == notification.Extra {
	// 			m.Stop() // Stop the monitor
	// 			monitors = append(monitors[:i], monitors[i+1:]...) // Remove from slice
	// 			break
	// 		}
	// 	}
	default:
		log.Println("Unknown notification channel:", notification.Channel)
	}
}

func shutdown() {
	log.Println("### Runner shutting down, attempting clean exit")
	db.Close()

	for _, m := range monitors {
		go m.Stop()
	}
}
