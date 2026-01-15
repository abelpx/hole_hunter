package migrations

import "database/sql"

func init() {
	Register(&Brute_001_Initial{})
}

type Brute_001_Initial struct{}

func (m *Brute_001_Initial) Version() int        { return 2025011507 }
func (m *Brute_001_Initial) Description() string { return "Brute: Initial schema" }
func (m *Brute_001_Initial) Module() string      { return "brute" }

func (m *Brute_001_Initial) Up(tx *sql.Tx) error {
	schema := `
	CREATE TABLE brute_tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		request_id INTEGER,
		type TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending',
		total_payloads INTEGER DEFAULT 0,
		sent_payloads INTEGER DEFAULT 0,
		success_count INTEGER DEFAULT 0,
		failure_count INTEGER DEFAULT 0,
		started_at DATETIME,
		completed_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (request_id) REFERENCES http_requests(id) ON DELETE SET NULL
	);

	CREATE TABLE brute_payload_sets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		config TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE brute_results (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER NOT NULL,
		param_name TEXT NOT NULL,
		payload TEXT NOT NULL,
		status TEXT NOT NULL,
		status_code INTEGER,
		response_length INTEGER,
		response_time INTEGER NOT NULL,
		body TEXT,
		error TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (task_id) REFERENCES brute_tasks(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_brute_tasks_status ON brute_tasks(status);
	CREATE INDEX IF NOT EXISTS idx_brute_results_task_id ON brute_results(task_id);
	`
	_, err := tx.Exec(schema)
	return err
}

func (m *Brute_001_Initial) Down(tx *sql.Tx) error {
	// DROP TABLE IF EXISTS 不需要检查错误
	_, _ = tx.Exec("DROP TABLE IF EXISTS brute_results")
	_, _ = tx.Exec("DROP TABLE IF EXISTS brute_payload_sets")
	_, _ = tx.Exec("DROP TABLE IF EXISTS brute_tasks")
	return nil
}
