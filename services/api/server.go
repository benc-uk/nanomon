// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2020
// Licensed under the MIT License.
//
// Monitr API server
// ----------------------------------------------------------------------------

package main

import (
	"log"
	"os"
	"regexp"
	"time"

	"monitr/services/common/database"

	"github.com/benc-uk/go-rest-api/pkg/auth"
	"github.com/benc-uk/go-rest-api/pkg/env"
	"github.com/benc-uk/go-rest-api/pkg/logging"

	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/chi/v5"

	_ "github.com/joho/godotenv/autoload"
)

var (
	healthy     = true               // Simple health flag
	version     = "0.0.1"            // App version number, set at build time with -ldflags "-X 'main.version=1.2.3'"
	buildInfo   = "No build details" // Build details, set at build time with -ldflags "-X 'main.buildInfo=Foo bar'"
	serviceName = "Monitr"
	defaultPort = 8000
)

const authScope = "monitr.admin"

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
	router.Use(logging.NewFilteredRequestLogger(regexp.MustCompile(`(^/metrics)|(^/health)`)))
	router.Use(middleware.Recoverer)

	// Some custom middleware for CORS
	router.Use(api.SimpleCORSMiddleware)

	// Protected routes
	router.Group(func(appRouter chi.Router) {
		clientID := os.Getenv("AUTH_CLIENT_ID")
		if clientID == "" {
			log.Println("### 🚨 No AUTH_CLIENT_ID set, skipping auth validation")
		} else {
			log.Println("### 🔐 Auth enabled, validating JWT tokens")
			jwtValidator := auth.NewJWTValidator(clientID,
				"https://login.microsoftonline.com/common/discovery/v2.0/keys",
				authScope)

			appRouter.Use(jwtValidator.Middleware)
		}

		api.addProtectedRoutes(appRouter)
	})

	// Anonymous routes
	router.Group(func(publicRouter chi.Router) {
		// Add Prometheus metrics endpoint, must be before the other routes
		api.AddMetricsEndpoint(publicRouter, "metrics")

		// Add optional root, health & status endpoints
		api.AddHealthEndpoint(publicRouter, "health")
		api.AddStatusEndpoint(publicRouter, "status")
		api.AddOKEndpoint(publicRouter, "")

		api.addAnonymousRoutes(publicRouter)
	})

	// *OPTIONAL* Add support for single page applications (SPA) with client-side routing
	//log.Printf("### 🌏 Serving static files for SPA from: %s", "./")
	//router.Handle("/", static.SpaHandler{
	//	StaticPath: "./",
	//	IndexFile:  "index.html",
	//})

	// Main REST API routes for the application
	//api.addRoutes(router)

	// Start the API server, this function will block until the server is stopped
	api.StartServer(serverPort, router, 10*time.Second)
}
