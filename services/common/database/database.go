// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon - Base database package for wrapping PostgreSQL client
// ----------------------------------------------------------------------------

package database

import (
	"database/sql"
	"log"
	"os"
	"regexp"
	"time"

	_ "github.com/lib/pq"
	pq "github.com/lib/pq"
)

type DB struct {
	Handle   *sql.DB
	Listener *pq.Listener // Optional listener for notifications
	Healthy  bool
}

// Open and connect to the database based on env vars
func ConnectToDB() *DB {
	db := &DB{}
	db.Healthy = true

	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		log.Fatal("POSTGRES_DSN environment variable is not set")
	}

	host := regexp.MustCompile(`host=([^ ]+)`).FindStringSubmatch(dsn)
	if len(host) < 2 {
		log.Fatal("POSTGRES_DSN does not contain a valid host")
	}

	dnsParsed, err := ParseDSN(dsn)
	if err != nil {
		log.Fatalf("DSN problem: %v", err)
	}

	log.Printf("Connecting to Postgres %s:%s with user=%s & database=%s",
		dnsParsed.Host, dnsParsed.Port, dnsParsed.User, dnsParsed.Database)

	password := os.Getenv("POSTGRES_PASSWORD")
	if password != "" {
		// If password is set
		if !regexp.MustCompile(`password=`).MatchString(dsn) {
			// If password is not already in DSN, append it
			dsn += " password=" + password
		} else {
			// If password is already in DSN, replace it
			dsn = regexp.MustCompile(`password=[^ ]+`).ReplaceAllString(dsn, "password="+password)
		}
	}

	db.Handle, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	// Ping the database in a loop until we connect or give up
	for i := 0; i < 6; i++ {
		err = db.Handle.Ping()
		if err == nil {
			log.Println("Connected to database successfully!")

			err = nil

			break
		}

		log.Printf("Failed to connect to database %v, retrying in 10 seconds...", err)

		time.Sleep(10 * time.Second)
	}

	if err != nil {
		log.Fatalf("Failed to connect to database after retries: %v", err)
	}

	// Kick off background ping to keep the connection alive
	go func() {
		ticker := time.NewTicker(time.Second * 15)
		defer ticker.Stop()

		for range ticker.C {
			db.Ping()
		}
	}()

	// Create listener
	db.Listener = pq.NewListener(dsn, 10*time.Second, time.Minute, func(ev pq.ListenerEventType, err error) {
		if err != nil {
			log.Println("Listener error:", err)
		}
	})

	return db
}

func (db *DB) Close() {
	log.Println("Closing Postgres database connections...")

	if db.Handle != nil {
		log.Println("Closing database handle")

		err := db.Handle.Close()
		if err != nil {
			log.Println("Error closing database connection:", err)
		} else {
			log.Println("Database connection closed successfully")
		}
	}

	if db.Listener != nil {
		log.Println("Closing database listener")

		err := db.Listener.Close()
		if err != nil {
			log.Println("Error closing database listener:", err)
		} else {
			log.Println("Database listener closed successfully")
		}
	}
}

// Check the database connection is health, also keeps the connection alive
func (db *DB) Ping() {
	if db.Handle == nil {
		return
	}

	err := db.Handle.Ping()
	if err != nil {
		log.Println("Warning! Database ping failed:", err)

		db.Healthy = false
	} else {
		if !db.Healthy {
			log.Println("Database connection restored")
		}

		db.Healthy = true
	}

	if db.Listener != nil {
		// We ignore any errors here, as this serves as a keep-alive
		_ = db.Listener.Ping()
	}
}
