package result

import (
	"context"
	"encoding/json"
	"fmt"
	"nanomon/services/common/database"
)

// Store a result in the database
func (r *Result) Store(db *database.DB) error {
	// For unit tests
	if db == nil {
		return nil
	}

	// Convert outputs map to JSON
	outputsJSON, err := json.Marshal(r.Outputs)
	if err != nil {
		return fmt.Errorf("failed to marshal outputs: %w", err)
	}

	// Prepare the SQL statement
	query := `
		INSERT INTO results (date, monitor_id, monitor_name, monitor_target, status, value, message, outputs)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	// Execute the query with context timeout
	ctx, cancel := context.WithTimeout(context.Background(), db.Timeout)
	defer cancel()

	_, err = db.Handle.ExecContext(ctx, query,
		r.Date,
		r.MonitorID,
		r.MonitorName,
		r.MonitorTarget,
		r.Status,
		float64(r.Value), // Convert int to float64 for database
		r.Message,
		string(outputsJSON),
	)

	if err != nil {
		return fmt.Errorf("failed to store result: %w", err)
	}

	return nil
}

func GetResultsForMonitor(db *database.DB, monitorID int, max int) ([]*Result, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT date, monitor_id, monitor_name, monitor_target, status, value, message, outputs
		FROM results
		WHERE monitor_id = $1
		ORDER BY date DESC
		LIMIT $2
	`

	rows, err := db.Handle.Query(query, monitorID, max)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch results: %w", err)
	}
	defer rows.Close()

	var results []*Result

	for rows.Next() {
		var r Result
		var outputsJSON string

		if err := rows.Scan(&r.Date, &r.MonitorID, &r.MonitorName, &r.MonitorTarget,
			&r.Status, &r.Value, &r.Message, &outputsJSON); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		if err := json.Unmarshal([]byte(outputsJSON), &r.Outputs); err != nil {
			return nil, fmt.Errorf("failed to unmarshal outputs: %w", err)
		}

		results = append(results, &r)
	}

	return results, nil
}

func GetResults(db *database.DB, max int) ([]*Result, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	query := `
		SELECT date, monitor_id, monitor_name, monitor_target, status, value, message, outputs
		FROM results
		ORDER BY date DESC
		LIMIT $1
	`

	rows, err := db.Handle.Query(query, max)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch results: %w", err)
	}
	defer rows.Close()

	var results []*Result

	for rows.Next() {
		var r Result
		var outputsJSON string

		if err := rows.Scan(&r.Date, &r.MonitorID, &r.MonitorName, &r.MonitorTarget,
			&r.Status, &r.Value, &r.Message, &outputsJSON); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		if err := json.Unmarshal([]byte(outputsJSON), &r.Outputs); err != nil {
			return nil, fmt.Errorf("failed to unmarshal outputs: %w", err)
		}

		results = append(results, &r)
	}

	return results, nil
}
