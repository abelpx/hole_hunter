package migrations

import "database/sql"

func init() {
	Register(&Scan_002_FindingsCount{})
}

type Scan_002_FindingsCount struct{}

func (m *Scan_002_FindingsCount) Version() int        { return 2025012802 }
func (m *Scan_002_FindingsCount) Description() string { return "Scan: Add findings_count column" }
func (m *Scan_002_FindingsCount) Module() string      { return "core" }

func (m *Scan_002_FindingsCount) Up(tx *sql.Tx) error {
	query := `
	ALTER TABLE scan_tasks ADD COLUMN findings_count INTEGER DEFAULT 0;
	`
	_, err := tx.Exec(query)
	return err
}

func (m *Scan_002_FindingsCount) Down(tx *sql.Tx) error {
	// SQLite 不支持 DROP COLUMN
	return nil
}
