// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Frontend Host - Static HTTP host for the frontend
// ----------------------------------------------------------------------------

package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/benc-uk/go-rest-api/pkg/static"
	"github.com/go-chi/chi/v5"

	_ "github.com/joho/godotenv/autoload"
)

var (
	version   = "0.0.0"            // App version number, injected at build time
	buildInfo = "No build details" // Build details, injected at build time
)

func main() {
	var dir string

	flag.StringVar(&dir, "dir", "./", "the directory to serve files from")
	flag.Parse()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8001"
	}

	r := chi.NewRouter()

	// The simple config endpoint
	r.Get("/config", routeConfig)

	// Serve static SPA content using the spaHandler
	r.Handle("/*", static.SpaHandler{
		StaticPath: dir,
		IndexFile:  "index.html",
	})

	srv := &http.Server{
		Handler:      r,
		Addr:         ":" + port,
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Println("### 🌐 NanoMon Frontend, listening on port:", port)
	log.Println("### Version:", version)
	log.Println("### Serving app content from:", dir)
	log.Fatal(srv.ListenAndServe())
}

// Simple config endpoint, returns certain env vars to front end
// With some defaults if envs are missing
func routeConfig(resp http.ResponseWriter, req *http.Request) {
	apiEndpoint := os.Getenv("API_ENDPOINT")
	if apiEndpoint == "" {
		apiEndpoint = "/"
	}

	authTenant := os.Getenv("AUTH_TENANT")
	if authTenant == "" {
		authTenant = "common"
	}

	authClientID := os.Getenv("AUTH_CLIENT_ID")

	// This is picked up and passed to the frontend at startup
	config := map[string]string{
		"API_ENDPOINT":   apiEndpoint,
		"AUTH_CLIENT_ID": authClientID,
		"VERSION":        version,
		"BUILD_INFO":     buildInfo,
		"AUTH_TENANT":    authTenant,
	}

	configJSON, _ := json.Marshal(config)

	resp.Header().Set("Access-Control-Allow-Origin", "*")
	resp.Header().Add("Content-Type", "application/json")
	_, _ = resp.Write([]byte(configJSON))
}
