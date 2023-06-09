// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon API server
// ----------------------------------------------------------------------------

package main

import (
	"log"
	"os"
	"regexp"
	"time"

	"nanomon/services/common/database"

	"github.com/benc-uk/go-rest-api/pkg/auth"
	"github.com/benc-uk/go-rest-api/pkg/env"
	"github.com/benc-uk/go-rest-api/pkg/logging"

	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/chi/v5"

	_ "github.com/joho/godotenv/autoload"
)

var (
	version     = "0.0.0"            // App version number, injected at build time
	buildInfo   = "No build details" // Build details, injected at build time
	serviceName = "NanoMon"
	defaultPort = 8000
)

// This scope is used to validate access to the API
// The app registration must be configured to allow & expose this scope
// See frontend/app.mjs where this is also set
const authScope = "system.admin"

func main() {
	// Port to listen on, change the default as you see fit
	serverPort := env.GetEnvInt("PORT", defaultPort)

	// Core of the REST API
	router := chi.NewRouter()

	// Note this will exit the process if the DB connection fails, so no need to check for errors
	db := database.ConnectToDB()
	api := NewAPI(db)

	// Some basic middleware, change as you see fit, see: https://github.com/go-chi/chi#core-middlewares
	router.Use(middleware.RealIP)
	// Filtered request logger, exclude /metrics & /health endpoints
	router.Use(logging.NewFilteredRequestLogger(regexp.MustCompile(`(^/api/metrics)|(^/api/health)`)))
	router.Use(middleware.Recoverer)

	// Some custom middleware for CORS
	router.Use(api.SimpleCORSMiddleware)

	// Protected routes
	router.Group(func(appRouter chi.Router) {
		// Authentication can be switched on or off
		clientID := os.Getenv("AUTH_CLIENT_ID")
		if clientID == "" {
			log.Println("### 🚨 No AUTH_CLIENT_ID set, skipping auth validation")
		} else {
			log.Println("### 🔐 Auth enabled, validating JWT tokens")

			// Validate JWT tokens using the Microsoft common public key endpoint
			jwtValidator := auth.NewJWTValidator(
				clientID,
				"https://login.microsoftonline.com/common/discovery/v2.0/keys",
				authScope,
			)

			appRouter.Use(jwtValidator.Middleware)
		}

		// These routes do create, update, delete operations
		api.addProtectedRoutes(appRouter)
	})

	// Anonymous routes
	router.Group(func(publicRouter chi.Router) {
		// Add Prometheus metrics endpoint, must be before the other routes
		api.AddMetricsEndpoint(publicRouter, "api/metrics")

		// Add optional root, health & status endpoints
		api.AddHealthEndpoint(publicRouter, "api/health")
		api.AddStatusEndpoint(publicRouter, "api/status")
		api.AddOKEndpoint(publicRouter, "api/")

		// Rest of the NanoMon routes
		api.addAnonymousRoutes(publicRouter)
	})

	// Start ticker to check the DB connection, and set the health status
	go func() {
		ticker := time.Tick(5 * time.Second)

		for range ticker {
			if err := db.Ping(); err != nil {
				api.Healthy = false
			} else {
				api.Healthy = true
			}
		}
	}()

	// Start the API server, this function will block until the server is stopped
	api.StartServer(serverPort, router, 10*time.Second)
}
