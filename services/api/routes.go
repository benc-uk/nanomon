// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon API server - route & API implementation
// ----------------------------------------------------------------------------

package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"nanomon/services/common/types"
	"net/http"
	"strconv"
	"time"

	"github.com/benc-uk/go-rest-api/pkg/problem"
	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Get all monitors
func (api API) getMonitors(resp http.ResponseWriter, req *http.Request) {
	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cur, err := api.db.Monitors.Find(timeoutCtx, bson.M{})
	if err != nil {
		problem.Wrap(500, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	monitors := make([]*MonitorResp, 0)

	for cur.Next(context.TODO()) {
		m := &MonitorResp{}
		if err := cur.Decode(&m); err != nil {
			problem.Wrap(500, req.RequestURI, "monitors", err).Send(resp)
			return
		}

		monitors = append(monitors, m)
	}

	api.ReturnJSON(resp, monitors)
}

// Get a single monitor
func (api API) getMonitor(resp http.ResponseWriter, req *http.Request) {
	oidStr := chi.URLParam(req, "id")
	oid, err := primitive.ObjectIDFromHex(oidStr)

	if err != nil {
		problem.Wrap(400, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	m := &MonitorResp{}

	err = api.db.Monitors.FindOne(timeoutCtx, bson.M{"_id": oid}).Decode(m)
	if err != nil {
		problem.Wrap(404, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	api.ReturnJSON(resp, m)
}

// Get results for monitor with id
func (api API) getMonitorResults(resp http.ResponseWriter, req *http.Request) {
	oidStr := chi.URLParam(req, "id")

	// Url query max param
	maxStr := req.URL.Query().Get("max")
	if maxStr == "" {
		maxStr = "100"
	}

	max, _ := strconv.Atoi(maxStr)

	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// parse oidstr to oid
	oid, err := primitive.ObjectIDFromHex(oidStr)
	if err != nil {
		problem.Wrap(500, req.RequestURI, "results", err).Send(resp)
		return
	}

	options := options.Find().SetSort(bson.M{"date": -1}).SetLimit(int64(max))

	cur, err := api.db.Results.Find(timeoutCtx, bson.M{"monitor_id": oid}, options)
	if err != nil {
		problem.Wrap(500, req.RequestURI, "results", err).Send(resp)
		return
	}

	results := make([]*types.Result, 0)

	for cur.Next(context.TODO()) {
		r := &types.Result{}
		if err := cur.Decode(&r); err != nil {
			problem.Wrap(500, req.RequestURI, "results", err).Send(resp)
			return
		}

		results = append(results, r)
	}

	api.ReturnJSON(resp, results)
}

// Delete a monitor
func (api API) deleteMonitor(resp http.ResponseWriter, req *http.Request) {
	oidStr := chi.URLParam(req, "id")

	oid, err := primitive.ObjectIDFromHex(oidStr)
	if err != nil {
		problem.Wrap(400, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	deleteResp, err := api.db.Monitors.DeleteOne(timeoutCtx, bson.M{"_id": oid})
	if err != nil {
		problem.Wrap(500, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	if deleteResp.DeletedCount == 0 {
		problem.Wrap(404, req.RequestURI, "monitors", errors.New("monitor not found")).Send(resp)
		return
	}

	resp.WriteHeader(204)
}

// Create a new monitor
func (api API) createMonitor(resp http.ResponseWriter, req *http.Request) {
	// get body and encode to struct
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

	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	insertRes, err := api.db.Monitors.InsertOne(timeoutCtx, m)
	if err != nil {
		problem.Wrap(500, req.RequestURI, "monitors", err).Send(resp)
		return
	}

	oid, _ := insertRes.InsertedID.(primitive.ObjectID)
	respMonitor := MonitorResp{
		ID:         oid.Hex(),
		Name:       m.Name,
		Type:       m.Type,
		Target:     m.Target,
		Rule:       m.Rule,
		Interval:   m.Interval,
		Updated:    m.Updated,
		Enabled:    m.Enabled,
		Properties: m.Properties,
		Group:      m.Group,
	}

	api.ReturnJSON(resp, respMonitor)
}

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

// Get results across all monitors
func (api API) getResults(resp http.ResponseWriter, req *http.Request) {
	// Url query max param
	maxStr := req.URL.Query().Get("max")
	if maxStr == "" {
		maxStr = "100"
	}

	max, _ := strconv.Atoi(maxStr)

	timeoutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	options := options.Find().SetSort(bson.M{"date": -1}).SetLimit(int64(max))

	cur, err := api.db.Results.Find(timeoutCtx, bson.M{}, options)
	if err != nil {
		problem.Wrap(500, req.RequestURI, "results", err).Send(resp)
		return
	}

	results := make([]types.Result, 0)

	for cur.Next(context.TODO()) {
		r := types.Result{}
		if err := cur.Decode(&r); err != nil {
			problem.Wrap(500, req.RequestURI, "results", err).Send(resp)
			return
		}

		results = append(results, r)
	}

	api.ReturnJSON(resp, results)
}

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
