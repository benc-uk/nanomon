// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon API server - route & API implementation
// ----------------------------------------------------------------------------

package main

import (
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
	mon, err := monitor.FetchMonitorByID(api.db, idInt)
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
		// return empty array if no results found
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
	if err != nil {
		problem.Wrap(500, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	log.Printf("🗑️ Monitor with ID %d deleted successfully", idInt)

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
	monitor.Store(api.db)

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

/*
// Update existing monitor with a PUT request and upsert into the DB
func (api API) updateMonitor(resp http.ResponseWriter, req *http.Request) {
	oidStr := chi.URLParam(req, "id")

	oid, err := primitive.ObjectIDFromHex(oidStr)
	if err != nil {
		problem.Wrap(400, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	// get body and encode to struct
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

	log.Printf("### Updating monitor %+v", m)
	m.Updated = time.Now()

	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	updateResp, err := api.db.Monitors.ReplaceOne(timeoutCtx, bson.M{"_id": oid}, m)
	if err != nil {
		problem.Wrap(500, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	if updateResp.MatchedCount == 0 {
		problem.Wrap(404, req.RequestURI, "monitors", errors.New("monitor not found")).Send(resp)
		return
	}

	respMonitor := MonitorResp{
		ID:         oidStr,
		Name:       m.Name,
		Type:       m.Type,
		Interval:   m.Interval,
		Updated:    m.Updated,
		Enabled:    m.Enabled,
		Properties: m.Properties,
	}

	api.ReturnJSON(resp, respMonitor)
}
*/

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

	api.ReturnJSON(resp, results)
}

/*
// Import JSON to bulk configure monitors
func (api API) importMonitors(resp http.ResponseWriter, req *http.Request) {
	log.Printf("### Importing monitors")

	monitors := []*MonitorReq{}

	err := json.NewDecoder(req.Body).Decode(&monitors)
	if err != nil {
		problem.Wrap(400, req.RequestURI, "import", err).Send(resp)
		return
	}

	if len(monitors) == 0 {
		problem.Wrap(400, req.RequestURI, "import", errors.New("no monitors in import")).Send(resp)
		return
	}

	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	deleteResp, err := api.db.Monitors.DeleteMany(timeoutCtx, bson.M{})
	if err != nil {
		problem.Wrap(500, req.RequestURI, "import", err).Send(resp)
		return
	}

	log.Printf("### Removed %d existing monitors", deleteResp.DeletedCount)

	for _, m := range monitors {
		m.Updated = time.Now()

		// Fix for properties being null/empty/weird
		if len(m.Properties) == 0 {
			m.Properties = make(map[string]string)
		}

		if msg, ok := m.validate(); !ok {
			problem.Wrap(400, req.RequestURI, "monitors", errors.New(msg)).Send(resp)
			return
		}

		_, err := api.db.Monitors.InsertOne(timeoutCtx, m)
		if err != nil {
			problem.Wrap(500, req.RequestURI, "import", err).Send(resp)
			return
		}

		log.Printf("### Imported monitor %s", m.Name)
	}

	resp.WriteHeader(204)
}

// Reset and remove all monitors
func (api API) deleteMonitors(resp http.ResponseWriter, req *http.Request) {
	log.Printf("### Resetting and deleting all monitors")

	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	deleteResp, err := api.db.Monitors.DeleteMany(timeoutCtx, bson.M{})
	if err != nil {
		problem.Wrap(500, req.RequestURI, "delete-all", err).Send(resp)
		return
	}

	log.Printf("### Removed %d monitors", deleteResp.DeletedCount)

	resp.WriteHeader(204)
}

// Reset and remove all results
func (api API) deleteResults(resp http.ResponseWriter, req *http.Request) {
	log.Printf("### Resetting and deleting all results")

	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	deleteResp, err := api.db.Results.DeleteMany(timeoutCtx, bson.M{})
	if err != nil {
		problem.Wrap(500, req.RequestURI, "delete-all", err).Send(resp)
		return
	}

	log.Printf("### Removed %d results", deleteResp.DeletedCount)

	resp.WriteHeader(204)
}
*/
