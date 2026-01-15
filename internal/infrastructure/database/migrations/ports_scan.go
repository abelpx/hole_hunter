package migrations

import "database/sql"

func init() {
	Register(&PortScan_001_Initial{})
}

type PortScan_001_Initial struct{}

func (m *PortScan_001_Initial) Version() int        { return 2025011505 }
func (m *PortScan_001_Initial) Description() string { return "PortScan: Initial schema" }
func (m *PortScan_001_Initial) Module() string      { return "port_scan" }

func (m *PortScan_001_Initial) Up(tx *sql.Tx) error {
	schema := `
	CREATE TABLE port_scan_tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		target TEXT NOT NULL,
		ports TEXT NOT NULL,
		timeout INTEGER DEFAULT 2000,
		batch_size INTEGER DEFAULT 50,
		status TEXT NOT NULL DEFAULT 'pending',
		started_at DATETIME,
		completed_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE port_scan_results (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER NOT NULL,
		port INTEGER NOT NULL,
		status TEXT NOT NULL DEFAULT 'closed',
		service TEXT,
		banner TEXT,
		latency INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (task_id) REFERENCES port_scan_tasks(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_port_scan_results_task_id ON port_scan_results(task_id);
	`
	_, err := tx.Exec(schema)
	return err
}

func (m *PortScan_001_Initial) Down(tx *sql.Tx) error {
	tx.Exec("DROP TABLE IF EXISTS port_scan_results")
	tx.Exec("DROP TABLE IF EXISTS port_scan_tasks")
	return nil
}
