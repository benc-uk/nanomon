// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon API server - API definition and struct
// ----------------------------------------------------------------------------

package main

import (
	"nanomon/services/common/database"

	"github.com/benc-uk/go-rest-api/pkg/api"
	"github.com/go-chi/chi/v5"
)

// API is a wrap of the common base API with NanoMon implementation
// We inject our dependencies here
type API struct {
	// Embedding the common API struct
	*api.Base

	// Instance of our DB connection
	db *database.DB
}

// These are all GET and can be called without auth
func (api API) addAnonymousRoutes(r chi.Router) {
	r.Get("/api/monitors", api.getMonitors)
	r.Get("/api/monitors/{id}", api.getMonitor)
	r.Get("/api/monitors/{id}/results", api.getMonitorResults)
	r.Get("/api/results", api.getResults)

	r.HandleFunc("/metrics", newPromWrapper(api.db).handler)
}

// These routes might be behind auth if it has been enabled
func (api API) addProtectedRoutes(r chi.Router) {
	r.Post("/api/monitors", api.createMonitor)
	r.Post("/api/monitors/import", api.importMonitors)
	r.Delete("/api/monitors", api.deleteMonitors)
	r.Delete("/api/results", api.deleteResults)
	r.Delete("/api/monitors/{id}", api.deleteMonitor)
	r.Put("/api/monitors/{id}", api.updateMonitor)
}

// Simply create an API with the given database context
func NewAPI(db *database.DB) API {
	return API{
		api.NewBase(serviceName, version, buildInfo, true),
		db,
	}
}
