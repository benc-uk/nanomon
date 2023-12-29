// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Runs and executes monitors
// ----------------------------------------------------------------------------

package main

import (
	"log"
	"nanomon/services/common/database"
	"nanomon/services/runner/monitor"
	"os"
	"os/signal"
	"syscall"
	"time"
)

var (
	db        *database.DB
	monitors  []*monitor.Monitor
	version   = "0.0.0"            // App version number, injected at build time
	buildInfo = "No build details" // Build details, injected at build time
)

// Entrypoint - begin here :)
func main() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		shutdown()
		os.Exit(1)
	}()

	pollIntervalEnv := os.Getenv("POLLING_INTERVAL")
	if pollIntervalEnv == "" {
		pollIntervalEnv = "10s"
	}

	pollInterval, _ := time.ParseDuration(pollIntervalEnv)

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

	// Start the monitors loaded from the database
	for i, m := range monitors {
		// Delay each monitor start by 2 seconds for a staggered start
		go m.Start(i * 2)
	}

	// Try to watch the database for changes
	err = monitor.WatchMonitors(db, monitors)
	if err != nil {
		log.Println("### Mongo change stream not supported, falling back to polling every", pollIntervalEnv)

		// Fallback to polling
		pollMonitors(pollInterval)
	}
}

func shutdown() {
	log.Println("### Runner shutting down, attempting clean exit")
	db.Close()

	for _, m := range monitors {
		go m.Stop()
	}
}

// Used to poll the database for changes when change stream not supported
func pollMonitors(interval time.Duration) {
	// Infinite loop to watch monitor changes in the database
	for {
		// Blocks for the specified interval
		time.Sleep(interval)

		// Fetch fresh set from database
		updatedMonitors, err := monitor.FetchMonitors(db)
		if err != nil {
			log.Println("### Error loading monitors:", err)
			continue
		}

		if os.Getenv("DEBUG") == "true" {
			log.Printf("### Checking for changes old len:%d, new len %d", len(monitors), len(updatedMonitors))
		}

		// First pass to find new & updated monitors
		for _, newMon := range updatedMonitors {
			found := false

			for oi, oldMon := range monitors {
				if oldMon.ID == newMon.ID {
					found = true

					// Use the timestamp to determine if the monitor has been updated
					if newMon.Updated.After(oldMon.Updated) {
						log.Println("### Detected change, updating monitor:", oldMon.Name)
						oldMon.Stop()

						go newMon.Start(0)
						monitors[oi] = newMon
					}

					break
				}
			}

			// If the monitor wasn't found, it's new
			if !found {
				log.Println("### Detected change, new monitor:", newMon.Name)
				go newMon.Start(0)
				monitors = append(monitors, newMon)
			}
		}

		// Finding deleted monitors requires a second pass but in different order
		for oi, oldMon := range monitors {
			found := false

			for _, newMon := range updatedMonitors {
				if newMon.ID == oldMon.ID {
					found = true
					break
				}
			}

			// If the monitor wasn't in newMonitors, it's been deleted
			if !found {
				log.Println("### Detected change, deleted monitor:", oldMon.Name)
				oldMon.Stop()

				monitors = append(monitors[:oi], monitors[oi+1:]...)
			}
		}
	}
}
