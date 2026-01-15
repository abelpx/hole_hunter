package migrations

import "database/sql"

func init() {
	Register(&HTTP_001_Initial{})
}

type HTTP_001_Initial struct{}

func (m *HTTP_001_Initial) Version() int        { return 2025011503 }
func (m *HTTP_001_Initial) Description() string { return "HTTP: Initial schema" }
func (m *HTTP_001_Initial) Module() string      { return "http" }

func (m *HTTP_001_Initial) Up(tx *sql.Tx) error {
	schema := `
	CREATE TABLE http_requests (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		method TEXT NOT NULL,
		url TEXT NOT NULL,
		headers TEXT,
		body TEXT,
		content_type TEXT,
		tags TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE http_responses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		request_id INTEGER NOT NULL,
		status_code INTEGER NOT NULL,
		status_text TEXT,
		headers TEXT,
		body TEXT,
		body_size INTEGER,
		header_size INTEGER,
		duration INTEGER,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (request_id) REFERENCES http_requests(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_http_responses_request_id ON http_responses(request_id);
	CREATE INDEX IF NOT EXISTS idx_http_requests_created_at ON http_requests(created_at);
	`
	_, err := tx.Exec(schema)
	return err
}

func (m *HTTP_001_Initial) Down(tx *sql.Tx) error {
	tx.Exec("DROP TABLE IF EXISTS http_responses")
	tx.Exec("DROP TABLE IF EXISTS http_requests")
	return nil
}
