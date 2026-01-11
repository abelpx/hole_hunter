package database

import (
	"database/sql"
	"fmt"

	_ "github.com/mattn/go-sqlite3"
)

var schema = `
CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    description TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scan_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER REFERENCES targets(id),
    status TEXT DEFAULT 'pending',
    strategy TEXT,
    templates_used TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    total_templates INTEGER,
    executed_templates INTEGER,
    progress INTEGER DEFAULT 0,
    current_template TEXT,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vulnerabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER REFERENCES scan_tasks(id),
    template_id TEXT,
    severity TEXT,
    name TEXT,
    description TEXT,
    url TEXT,
    matched_at TEXT,
    request_response TEXT,
    false_positive BOOLEAN DEFAULT 0,
    notes TEXT,
    cve TEXT,
    cvss REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configurations (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    content TEXT,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- HTTP Requests for replay
CREATE TABLE IF NOT EXISTS http_requests (
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

-- HTTP Responses history
CREATE TABLE IF NOT EXISTS http_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER REFERENCES http_requests(id),
    status_code INTEGER,
    status_text TEXT,
    headers TEXT,
    body TEXT,
    body_size INTEGER,
    header_size INTEGER,
    duration INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Brute force tasks
CREATE TABLE IF NOT EXISTS brute_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    request_id INTEGER REFERENCES http_requests(id),
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    total_payloads INTEGER DEFAULT 0,
    sent_payloads INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Brute force parameters
CREATE TABLE IF NOT EXISTS brute_parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER REFERENCES brute_tasks(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Brute force payload sets (collections of payloads)
CREATE TABLE IF NOT EXISTS brute_payload_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Brute force payloads (individual payload values)
CREATE TABLE IF NOT EXISTS brute_payloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER REFERENCES brute_payload_sets(id),
    task_id INTEGER REFERENCES brute_tasks(id),
    param_id INTEGER REFERENCES brute_parameters(id),
    type TEXT NOT NULL,
    source TEXT,
    config TEXT,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Brute force results
CREATE TABLE IF NOT EXISTS brute_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER REFERENCES brute_tasks(id),
    request_id INTEGER REFERENCES http_requests(id),
    payload TEXT,
    status_code INTEGER,
    body_length INTEGER,
    response TEXT,
    success BOOLEAN DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scan reports
CREATE TABLE IF NOT EXISTS scan_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    scan_id INTEGER REFERENCES scan_tasks(id),
    target_name TEXT,
    target_url TEXT,
    status TEXT DEFAULT 'pending',
    format TEXT NOT NULL,
    file_path TEXT,
    vulnerabilities_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`

func Initialize(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("failed to create schema: %w", err)
	}

	return db, nil
}
