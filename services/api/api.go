// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2020
// Licensed under the MIT License.
//
// RESTful API for the NanoMon service
// ----------------------------------------------------------------------------

package main

import (
	"nanomon/services/common/database"

	"github.com/benc-uk/go-rest-api/pkg/api"
	"github.com/go-chi/chi/v5"
)

// API is a wrap of the common base API with local implementation
type API struct {
	*api.Base
	// Add extra fields here: database connections, SDK clients
	db *database.DB
}

func (api API) addAnonymousRoutes(r chi.Router) {
	r.Get("/api/monitors", api.getMonitors)
	r.Get("/api/monitors/{id}", api.getMonitor)
	r.Get("/api/monitors/{id}/results", api.getMonitorResults)
	r.Get("/api/results", api.getResults)
}

func (api API) addProtectedRoutes(r chi.Router) {
	r.Post("/api/monitors", api.createMonitor)
	r.Delete("/api/monitors/{id}", api.deleteMonitor)
	r.Put("/api/monitors/{id}", api.updateMonitor)
}

func NewAPI(db *database.DB) API {
	return API{
		api.NewBase(serviceName, version, buildInfo, healthy),
		db,
	}
}
