// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon API server - route & API implementation
// ----------------------------------------------------------------------------

package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"nanomon/services/common/monitor"
	"nanomon/services/common/result"
	"net/http"
	"strconv"
	"time"

	"github.com/benc-uk/go-rest-api/pkg/problem"
	"github.com/go-chi/chi/v5"
)

// Get all monitors
func (api API) getMonitors(resp http.ResponseWriter, req *http.Request) {
	// Fetch all monitors from the database
	monitors, err := monitor.FetchMonitors(api.db)
	if err != nil {
		problem.Wrap(500, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	monitorResps := make([]MonitorResp, len(monitors))
	for i, mon := range monitors {
		monitorResps[i] = MonitorToResp(mon)
	}

	api.ReturnJSON(resp, monitorResps)
}

// Get a single monitor
func (api API) getMonitor(resp http.ResponseWriter, req *http.Request) {
	id := chi.URLParam(req, "id")
	// Convert to int
	idInt, err := strconv.Atoi(id)
	if err != nil {
		problem.Wrap(400, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	// Fetch the monitor from the database
	mon, err := monitor.FetchMonitor(api.db, idInt)
	if errors.Is(err, sql.ErrNoRows) {
		problem.Wrap(404, req.RequestURI, "monitors", errors.New("monitor not found")).Send(resp)
		return
	}

	if err != nil {
		problem.Wrap(500, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	if mon == nil {
		problem.Wrap(404, req.RequestURI, "monitors", errors.New("monitor not found")).Send(resp)
		return
	}

	api.ReturnJSON(resp, MonitorToResp(mon))
}

// Get results for monitor with id
func (api API) getMonitorResults(resp http.ResponseWriter, req *http.Request) {
	id := chi.URLParam(req, "id")
	// Convert to int
	idInt, err := strconv.Atoi(id)
	if err != nil {
		problem.Wrap(400, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	// Url query max param
	maxStr := req.URL.Query().Get("max")
	if maxStr == "" {
		maxStr = "100"
	}

	max, err := strconv.Atoi(maxStr)
	if err != nil {
		problem.Wrap(400, req.RequestURI, "results", err).Send(resp)
		return
	}

	if max > 1000 || max < 1 {
		problem.Wrap(400, req.RequestURI, "results", errors.New("max must be between 1 and 1000")).Send(resp)
		return
	}

	results, err := result.GetResultsForMonitor(api.db, idInt, max)
	if err != nil {
		problem.Wrap(500, req.RequestURI, "results", err).Send(resp)
		return
	}

	if results == nil {
		results = []*result.Result{}
	}

	api.ReturnJSON(resp, results)
}

// Delete a monitor
func (api API) deleteMonitor(resp http.ResponseWriter, req *http.Request) {
	id := chi.URLParam(req, "id")
	// Convert to int
	idInt, err := strconv.Atoi(id)
	if err != nil {
		problem.Wrap(400, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	// Fetch the monitor from the database
	err = monitor.DeleteMonitor(idInt, api.db)
	if errors.Is(err, sql.ErrNoRows) {
		problem.Wrap(404, req.RequestURI, "monitors", errors.New("monitor not found")).Send(resp)
		return
	}

	if err != nil {
		problem.Wrap(500, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	resp.WriteHeader(http.StatusNoContent) // 204 No Content
}

// Create a new monitor
func (api API) createMonitor(resp http.ResponseWriter, req *http.Request) {
	m := MonitorReq{}

	err := json.NewDecoder(req.Body).Decode(&m)
	if err != nil {
		problem.Wrap(400, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	if msg, ok := m.validate(); !ok {
		problem.Wrap(400, req.RequestURI, "monitors", errors.New(msg)).Send(resp)
		return
	}

	log.Printf("### Creating monitor %+v", m)
	m.Updated = time.Now()

	monitor := &monitor.Monitor{
		Name:       m.Name,
		Type:       m.Type,
		Target:     m.Target,
		Rule:       m.Rule,
		Interval:   m.Interval,
		Updated:    m.Updated,
		Enabled:    m.Enabled,
		Properties: m.Properties,
	}

	err = monitor.Store(api.db)
	if err != nil {
		problem.Wrap(500, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	respMonitor := MonitorResp{
		ID:         monitor.ID,
		Name:       m.Name,
		Type:       m.Type,
		Interval:   m.Interval,
		Updated:    m.Updated,
		Enabled:    m.Enabled,
		Properties: m.Properties,
	}

	api.ReturnJSON(resp, respMonitor)
}

// Update existing monitor with a PUT request and upsert into the DB
func (api API) updateMonitor(resp http.ResponseWriter, req *http.Request) {
	id := chi.URLParam(req, "id")
	// Convert to int
	idInt, err := strconv.Atoi(id)
	if err != nil {
		problem.Wrap(400, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	m := MonitorReq{}

	err = json.NewDecoder(req.Body).Decode(&m)
	if err != nil {
		problem.Wrap(400, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	if msg, ok := m.validate(); !ok {
		problem.Wrap(400, req.RequestURI, "monitors", errors.New(msg)).Send(resp)
		return
	}

	m.Updated = time.Now()

	log.Printf("### Monitor properties: %+v", m.Target)

	monitor := &monitor.Monitor{
		ID:         idInt,
		Name:       m.Name,
		Type:       m.Type,
		Target:     m.Target,
		Rule:       m.Rule,
		Interval:   m.Interval,
		Updated:    m.Updated,
		Enabled:    m.Enabled,
		Properties: m.Properties,
	}

	err = monitor.Update(api.db)
	if errors.Is(err, sql.ErrNoRows) {
		problem.Wrap(404, req.RequestURI, "monitors", errors.New("monitor not found")).Send(resp)
		return
	}

	if err != nil {
		problem.Wrap(500, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	respMonitor := MonitorResp{
		ID:         monitor.ID,
		Name:       m.Name,
		Type:       m.Type,
		Target:     m.Target,
		Interval:   m.Interval,
		Updated:    m.Updated,
		Enabled:    m.Enabled,
		Properties: m.Properties,
	}

	api.ReturnJSON(resp, respMonitor)
}

// Get results across all monitors
func (api API) getResults(resp http.ResponseWriter, req *http.Request) {
	// Url query max param
	maxStr := req.URL.Query().Get("max")
	if maxStr == "" {
		maxStr = "100"
	}

	max, err := strconv.Atoi(maxStr)
	if err != nil {
		problem.Wrap(400, req.RequestURI, "results", err).Send(resp)
		return
	}

	if max > 1000 || max < 1 {
		problem.Wrap(400, req.RequestURI, "results", errors.New("max must be between 1 and 1000")).Send(resp)
		return
	}

	results, err := result.GetResults(api.db, max)
	if err != nil {
		problem.Wrap(500, req.RequestURI, "results", err).Send(resp)
		return
	}

	if results == nil {
		results = []*result.Result{}
	}

	api.ReturnJSON(resp, results)
}

// Import JSON to bulk configure monitors
func (api API) importMonitors(resp http.ResponseWriter, req *http.Request) {
	log.Printf("### Importing monitors from request body")

	var monitors []MonitorReq

	err := json.NewDecoder(req.Body).Decode(&monitors)
	if err != nil {
		problem.Wrap(400, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	for _, m := range monitors {
		if msg, ok := m.validate(); !ok {
			problem.Wrap(400, req.RequestURI, "monitors", errors.New(msg)).Send(resp)
			return
		}

		monitor := &monitor.Monitor{
			Name:       m.Name,
			Type:       m.Type,
			Target:     m.Target,
			Rule:       m.Rule,
			Interval:   m.Interval,
			Updated:    time.Now(),
			Enabled:    m.Enabled,
			Properties: m.Properties,
		}

		err = monitor.Store(api.db)
		if err != nil {
			problem.Wrap(500, req.RequestURI, "monitors", err).Send(resp)
			return
		}

		log.Printf("### Imported monitor ID %d: %+v", monitor.ID, m)
	}

	log.Printf("### Imported %d monitors successfully", len(monitors))
	resp.WriteHeader(http.StatusNoContent)
}

// Reset and remove all monitors
func (api API) deleteMonitors(resp http.ResponseWriter, req *http.Request) {
	log.Printf("### Resetting and deleting all monitors")

	err := monitor.DeleteAll(api.db)
	if err != nil {
		problem.Wrap(500, req.RequestURI, "delete-all", err).Send(resp)
		return
	}

	log.Printf("### Removed all monitors")
	resp.WriteHeader(http.StatusNoContent)
}

// Reset and remove all results
func (api API) deleteResults(resp http.ResponseWriter, req *http.Request) {
	log.Printf("### Resetting and deleting all results")

	err := result.DeleteAll(api.db)
	if err != nil {
		problem.Wrap(500, req.RequestURI, "delete-all", err).Send(resp)
		return
	}

	log.Printf("### Removed all results")
	resp.WriteHeader(http.StatusNoContent)
}
