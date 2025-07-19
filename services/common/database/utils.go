package database

import (
	"fmt"
	"regexp"
)

type DSN struct {
	Host     string
	Port     string
	Database string
	User     string
}

func ParseDSN(dsn string) (*DSN, error) {
	if dsn == "" {
		return nil, fmt.Errorf("empty DSN")
	}

	// For simplicity, we assume the DSN is in the format "host=localhost port=5432 dbname=test user=postgres"
	// In a real application, you would parse this more robustly.
	host := regexp.MustCompile(`host=([^ ]+)`).FindStringSubmatch(dsn)
	if len(host) < 2 {
		return nil, fmt.Errorf("invalid DSN: missing host")
	}

	dnsPort := ""

	port := regexp.MustCompile(`port=([^ ]+)`).FindStringSubmatch(dsn)
	if len(port) < 2 {
		dnsPort = "5432" // Default PostgreSQL port
	} else {
		dnsPort = port[1]
	}

	database := regexp.MustCompile(`dbname=([^ ]+)`).FindStringSubmatch(dsn)
	if len(database) < 2 {
		return nil, fmt.Errorf("invalid DSN: missing database name")
	}

	username := regexp.MustCompile(`user=([^ ]+)`).FindStringSubmatch(dsn)
	if len(username) < 2 {
		return nil, fmt.Errorf("invalid DSN: missing user")
	}

	return &DSN{
		Host:     host[1],
		Port:     dnsPort,
		Database: database[1],
		User:     username[1],
	}, nil
}
