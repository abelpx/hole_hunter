package migrations

import "database/sql"

func init() {
	Register(&Scan_001_Logs{})
}

type Scan_001_Logs struct{}

func (m *Scan_001_Logs) Version() int        { return 2025012801 }
func (m *Scan_001_Logs) Description() string { return "Scan: Add scan_logs table" }
func (m *Scan_001_Logs) Module() string      { return "core" }

func (m *Scan_001_Logs) Up(tx *sql.Tx) error {
	query := `
	CREATE TABLE IF NOT EXISTS scan_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		scan_id INTEGER NOT NULL,
		level TEXT NOT NULL,
		message TEXT NOT NULL,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (scan_id) REFERENCES scan_tasks(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_scan_logs_scan_id ON scan_logs(scan_id);
	CREATE INDEX IF NOT EXISTS idx_scan_logs_timestamp ON scan_logs(timestamp);
	`
	_, err := tx.Exec(query)
	return err
}

func (m *Scan_001_Logs) Down(tx *sql.Tx) error {
	_, err := tx.Exec(`DROP TABLE IF EXISTS scan_logs`)
	return err
}
