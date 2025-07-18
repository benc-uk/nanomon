package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/lib/pq"
	_ "github.com/lib/pq"
)

type Monitor struct {
	MonitorID     int       `json:"monitor_id"`
	Name          string    `json:"name"`
	URL           string    `json:"url"`
	CheckInterval int       `json:"check_interval"`
	Timeout       int       `json:"timeout"`
	CreatedAt     time.Time `json:"created_at"`
	IsActive      bool      `json:"is_active"`
}

func main() {
	// Database connection parameters
	connStr := "host=localhost port=5432 user=nanomon password=notsecret123 dbname=nanomon sslmode=disable"

	// Connect to database
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Test the connection
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	fmt.Println("🔗 Connected to PostgreSQL database")
	fmt.Println("👂 Listening for monitor changes (insert/update/delete)...")
	fmt.Println("Press Ctrl+C to exit")

	// Create listener
	listener := pq.NewListener(connStr, 10*time.Second, time.Minute, func(ev pq.ListenerEventType, err error) {
		if err != nil {
			log.Println("Listener error:", err)
		}
	})
	defer listener.Close()

	// Listen for notifications on all monitor channels
	channels := []string{"new_monitor", "monitor_updated", "monitor_deleted"}
	for _, channel := range channels {
		err = listener.Listen(channel)
		if err != nil {
			log.Fatalf("Failed to start listening on channel %s: %v", channel, err)
		}
		fmt.Printf("📡 Listening on channel: %s\n", channel)
	}

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Main loop
	for {
		select {
		case notification := <-listener.Notify:
			if notification != nil {
				handleNotification(notification)
			}
		case <-sigChan:
			fmt.Println("\n👋 Received shutdown signal, exiting...")
			return
		case <-time.After(90 * time.Second):
			// Send a ping to keep the connection alive
			go func() {
				listener.Ping()
			}()
		}
	}
}

func handleNotification(notification *pq.Notification) {
	switch notification.Channel {
	case "new_monitor":
		log.Printf("✅ New monitor created: %s", notification.Extra)
	case "monitor_updated":
		log.Printf("� Monitor updated: %s", notification.Extra)
	case "monitor_deleted":
		log.Printf("❌ Monitor deleted: %s", notification.Extra)
	default:
		log.Printf("🔔 Unknown notification on channel %s: %s", notification.Channel, notification.Extra)
	}
}
