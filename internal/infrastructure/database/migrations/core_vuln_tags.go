package migrations

import "database/sql"

func init() {
	Register(&Core_002_VulnTags{})
}

type Core_002_VulnTags struct{}

func (m *Core_002_VulnTags) Version() int { return 2025011502 }
func (m *Core_002_VulnTags) Description() string { return "Core: Add vulnerability tags" }
func (m *Core_002_VulnTags) Module() string { return "core" }

func (m *Core_002_VulnTags) Up(tx *sql.Tx) error {
	_, err := tx.Exec("ALTER TABLE vulnerabilities ADD COLUMN tags TEXT")
	if err != nil && !isDuplicateColumnError(err.Error()) {
		return err
	}
	_, err = tx.Exec("ALTER TABLE vulnerabilities ADD COLUMN reference TEXT")
	if err != nil && !isDuplicateColumnError(err.Error()) {
		return err
	}
	return nil
}

func (m *Core_002_VulnTags) Down(tx *sql.Tx) error {
	return nil
}
