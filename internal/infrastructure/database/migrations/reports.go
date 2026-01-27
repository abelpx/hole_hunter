package migrations

import "database/sql"

func init() {
	Register(&Reports_001_Initial{})
}

type Reports_001_Initial struct{}

func (m *Reports_001_Initial) Version() int        { return 2025012701 }
func (m *Reports_001_Initial) Description() string { return "Reports: Initial schema" }
func (m *Reports_001_Initial) Module() string      { return "reports" }

func (m *Reports_001_Initial) Up(tx *sql.Tx) error {
	schema := `
	CREATE TABLE IF NOT EXISTS reports (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		scan_id INTEGER NOT NULL,
		type TEXT NOT NULL DEFAULT 'summary',
		format TEXT NOT NULL DEFAULT 'json',
		file_path TEXT,
		file_size INTEGER,
		status TEXT NOT NULL DEFAULT 'pending',
		config TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		generated_at DATETIME,
		FOREIGN KEY (scan_id) REFERENCES scan_tasks(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_reports_scan_id ON reports(scan_id);
	CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
	CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
	`
	_, err := tx.Exec(schema)
	return err
}

func (m *Reports_001_Initial) Down(tx *sql.Tx) error {
	tx.Exec("DROP TABLE IF EXISTS reports")
	return nil
}
