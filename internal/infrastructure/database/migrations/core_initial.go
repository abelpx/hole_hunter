package migrations

import "database/sql"

func init() {
	Register(&Core_001_Initial{})
}

type Core_001_Initial struct{}

func (m *Core_001_Initial) Version() int        { return 2025011501 }
func (m *Core_001_Initial) Description() string { return "Core: Initial schema" }
func (m *Core_001_Initial) Module() string      { return "core" }

func (m *Core_001_Initial) Up(tx *sql.Tx) error {
	schema := `
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
		name TEXT,
		target_id INTEGER NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending',
		strategy TEXT NOT NULL,
		templates_used TEXT,
		started_at DATETIME,
		completed_at DATETIME,
		total_templates INTEGER DEFAULT 0,
		executed_templates INTEGER DEFAULT 0,
		progress INTEGER DEFAULT 0,
		current_template TEXT,
		error TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS vulnerabilities (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER NOT NULL,
		template_id TEXT NOT NULL,
		severity TEXT NOT NULL,
		name TEXT NOT NULL,
		description TEXT,
		url TEXT,
		matched_at TEXT,
		request TEXT,
		response TEXT,
		extracted_results TEXT,
		false_positive BOOLEAN DEFAULT 0,
		notes TEXT,
		cve TEXT,
		cvss REAL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (task_id) REFERENCES scan_tasks(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_scan_tasks_target_id ON scan_tasks(target_id);
	CREATE INDEX IF NOT EXISTS idx_scan_tasks_status ON scan_tasks(status);
	CREATE INDEX IF NOT EXISTS idx_vulnerabilities_task_id ON vulnerabilities(task_id);
	CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
	CREATE INDEX IF NOT EXISTS idx_vulnerabilities_false_positive ON vulnerabilities(false_positive);
	`
	_, err := tx.Exec(schema)
	return err
}

func (m *Core_001_Initial) Down(tx *sql.Tx) error {
	tx.Exec("DROP TABLE IF EXISTS vulnerabilities")
	tx.Exec("DROP TABLE IF EXISTS scan_tasks")
	tx.Exec("DROP TABLE IF EXISTS targets")
	return nil
}
