// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Database access for monitors
// ----------------------------------------------------------------------------

package monitor

import (
	"encoding/json"
	"nanomon/services/common/database"
)

// Fetch all monitors from the database
func FetchMonitors(db *database.DB) ([]*Monitor, error) {
	monitors := []*Monitor{}

	rows, err := db.Handle.Query("SELECT id, name, type, interval, updated, enabled, rule, target, properties FROM monitors")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var m Monitor
		var properties string

		if err := rows.Scan(&m.ID, &m.Name, &m.Type, &m.Interval, &m.Updated, &m.Enabled, &m.Rule, &m.Target, &properties); err != nil {
			return nil, err
		}

		m.Properties = parseProperties(properties)

		monitors = append(monitors, &m)
	}

	return monitors, nil
}

// Store the monitor in the database, will update the ID field
func (m *Monitor) Store(db *database.DB) error {
	properties, err := json.Marshal(m.Properties)
	if err != nil {
		return err
	}

	// Need to use RETURNING to get the ID back
	query := `
		INSERT INTO monitors (name, type, interval, target, rule, enabled, properties)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`

	var id int
	err = db.Handle.QueryRow(query, m.Name, m.Type, m.Interval, m.Target, m.Rule, m.Enabled, string(properties)).Scan(&id)
	if err != nil {
		return err
	}

	// Mutate the monitor with the new ID
	m.ID = id

	return nil
}

// Fetch a monitor by ID from the database
func FetchMonitor(db *database.DB, id int) (*Monitor, error) {
	var m Monitor
	var properties string

	query := "SELECT id, name, type, interval, updated, enabled, rule, target, properties FROM monitors WHERE id = $1"
	err := db.Handle.QueryRow(query, id).Scan(&m.ID, &m.Name, &m.Type, &m.Interval, &m.Updated, &m.Enabled, &m.Rule, &m.Target, &properties)
	if err != nil {
		return nil, err
	}

	m.Properties = parseProperties(properties)

	return &m, nil
}

// Delete a monitor by ID from the database
func DeleteMonitor(id int, db *database.DB) error {
	if db == nil {
		return nil
	}

	query := "DELETE FROM monitors WHERE id = $1 RETURNING id"
	var deletedID int
	err := db.Handle.QueryRow(query, id).Scan(&deletedID)
	if err != nil {
		return err
	}

	return nil
}

// Update a monitor in the database
func (m *Monitor) Update(db *database.DB) error {
	properties, err := json.Marshal(m.Properties)
	if err != nil {
		return err
	}

	query := `
		UPDATE monitors
		SET name = $1, type = $2, interval = $3, target = $4, rule = $5, enabled = $6, properties = $7
		WHERE id = $8
		RETURNING id
	`
	var id int
	err = db.Handle.QueryRow(query, m.Name, m.Type, m.Interval, m.Target, m.Rule, m.Enabled, string(properties), m.ID).Scan(&id)
	if err != nil {
		return err
	}

	return nil
}

// Parse properties from a JSON string into a map
func parseProperties(properties string) map[string]string {
	props := make(map[string]string)

	if properties == "" {
		return props
	}

	// Assuming properties are stored as a JSON string
	err := json.Unmarshal([]byte(properties), &props)
	if err != nil {
		return nil // Return empty map if parsing fails
	}

	return props
}
