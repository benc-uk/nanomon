package main

import (
	"log"
	"monitr/services/common/database"
	"monitr/services/runner/monitor"
	"os"
	"os/signal"
	"syscall"
	"time"

	"golang.org/x/exp/slices"
)

var db *database.DB
var monitors []*monitor.Monitor

func main() {
	c := make(chan os.Signal)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		shutdown()
		os.Exit(1)
	}()

	changeIntervalEnv := os.Getenv("MONITOR_CHANGE_INTERVAL")
	if changeIntervalEnv == "" {
		changeIntervalEnv = "120s"
	}
	changeInterval, _ := time.ParseDuration(changeIntervalEnv)

	log.Println("### Monitr runner is starting...")
	log.Println("### Checking for monitor changes every", changeIntervalEnv)
	db = database.ConnectToDB()
	defer db.Close()

	var err error
	monitors, err = monitor.FetchMonitors(db)
	if err != nil {
		log.Fatalln("### Error loading monitors:", err)
	}

	// Start the monitors loaded from the database
	for _, m := range monitors {
		go m.Start()
	}

	// Infinite loop to watch monitor changes in the database
	for {
		time.Sleep(changeInterval)

		// Fetch fresh set from database
		updatedMonitors, err := monitor.FetchMonitors(db)
		if err != nil {
			log.Println("### Error loading monitors:", err)
			continue
		}

		// First pass to find new & updated monitors
		for _, newMon := range updatedMonitors {
			found := false
			for oi, oldMon := range monitors {
				if oldMon.ID == newMon.ID {
					found = true

					// Use the timestamp to determine if the monitor has been updated
					if newMon.Updated.After(oldMon.Updated) {
						log.Println("### Updating monitor:", oldMon.Name)
						oldMon.Stop()
						go newMon.Start()
						monitors[oi] = newMon
					}

					break
				}
			}

			// If the monitor wasn't found, it's new
			if !found {
				log.Println("### Starting new monitor:", newMon.Name)
				go newMon.Start()
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
				log.Println("### Stopping deleted monitor:", oldMon.Name)
				oldMon.Stop()
				slices.Delete(monitors, oi, oi+1)
			}
		}
	}
}

func shutdown() {
	log.Println("### Runner shuting down, attempting clean exit")
	db.Close()
	for _, m := range monitors {
		log.Println("### Stopping monitor:", m.Name)
		go m.Stop()
	}
}
