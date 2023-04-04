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
	version   = "0.0.0"            // App version number, set at build time with -ldflags "-X 'main.version=1.2.3'"
	buildInfo = "No build details" // Build details, set at build time with -ldflags "-X 'main.buildInfo=Foo bar'"
)

func main() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		shutdown()
		os.Exit(1)
	}()

	changeIntervalEnv := os.Getenv("CHANGE_POLLING")
	if changeIntervalEnv == "" {
		changeIntervalEnv = "10s"
	}

	changeInterval, _ := time.ParseDuration(changeIntervalEnv)

	log.Println("### 🏃 NanoMon runner is starting...")
	log.Println("### Version:", version, buildInfo)

	db = database.ConnectToDB()
	defer db.Close()

	var err error

	monitors, err = monitor.FetchMonitors(db)
	if err != nil {
		log.Fatalln("### Error loading monitors:", err)
	}

	// Start the monitors loaded from the database
	for _, m := range monitors {
		go m.Start(true)
	}

	if db.WatchSupported {
		// Note. This is a blocking call so main will never exit
		monitor.WatchMonitors(db, monitors)
	} else {
		log.Println("### Mongo change stream not supported, falling back to polling every", changeIntervalEnv)
		pollMonitors(changeInterval)
	}
}

func shutdown() {
	log.Println("### Runner shuting down, attempting clean exit")
	db.Close()

	for _, m := range monitors {
		go m.Stop()
	}
}

func pollMonitors(changeInterval time.Duration) {
	// Infinite loop to watch monitor changes in the database
	for {
		time.Sleep(changeInterval)

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

						go newMon.Start(false)
						monitors[oi] = newMon
					}

					break
				}
			}

			// If the monitor wasn't found, it's new
			if !found {
				log.Println("### Detected change, new monitor:", newMon.Name)
				go newMon.Start(false)
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
