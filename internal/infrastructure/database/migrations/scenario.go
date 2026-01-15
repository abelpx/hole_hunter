package migrations

import "database/sql"

func init() {
	Register(&Scenario_001_Initial{})
}

type Scenario_001_Initial struct{}

func (m *Scenario_001_Initial) Version() int { return 2025011504 }
func (m *Scenario_001_Initial) Description() string { return "Scenario: Initial schema" }
func (m *Scenario_001_Initial) Module() string { return "scenario" }

func (m *Scenario_001_Initial) Up(tx *sql.Tx) error {
	schema := `
	CREATE TABLE scenarios (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		description TEXT,
		templates TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := tx.Exec(schema)
	return err
}

func (m *Scenario_001_Initial) Down(tx *sql.Tx) error {
	tx.Exec("DROP TABLE IF EXISTS scenarios")
	return nil
}
