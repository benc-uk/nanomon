package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/benc-uk/go-rest-api/pkg/static"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
	var dir string
	flag.StringVar(&dir, "dir", "./app", "the directory to serve files from")
	flag.Parse()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8001"
	}

	r := chi.NewRouter()

	// The simple config endpoint
	r.Get("/.config", routeConfig)

	// Serve SPA from root
	r.Handle("/", static.SpaHandler{
		StaticPath: dir,
		IndexFile:  "index.html",
	})

	srv := &http.Server{
		Handler:      r,
		Addr:         ":" + port,
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Println("### 🌐 Monitr Frontend, listening on port:", port)
	log.Println("### Serving static content from:", dir)
	log.Fatal(srv.ListenAndServe())
}

// Simple config endpoint, returns API_ENDPOINT & AUTH_CLIENT_ID vars to front end
func routeConfig(resp http.ResponseWriter, req *http.Request) {
	apiEndpoint := os.Getenv("API_ENDPOINT")
	if apiEndpoint == "" {
		apiEndpoint = "/"
	}
	authClientId := os.Getenv("AUTH_CLIENT_ID")

	config := map[string]string{
		"API_ENDPOINT":   apiEndpoint,
		"AUTH_CLIENT_ID": authClientId,
	}

	configJSON, _ := json.Marshal(config)

	resp.Header().Set("Access-Control-Allow-Origin", "*")
	resp.Header().Add("Content-Type", "application/json")
	_, _ = resp.Write([]byte(configJSON))
}
