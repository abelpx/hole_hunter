package migrations

import "database/sql"

func init() {
	Register(&Vuln_002_AddRequestResponse{})
}

type Vuln_002_AddRequestResponse struct{}

func (m *Vuln_002_AddRequestResponse) Version() int        { return 2025012702 }
func (m *Vuln_002_AddRequestResponse) Description() string { return "Vulnerabilities: Add request_response column" }
func (m *Vuln_002_AddRequestResponse) Module() string      { return "core" }

func (m *Vuln_002_AddRequestResponse) Up(tx *sql.Tx) error {
	// 检查列是否已存在
	var columnName string
	err := tx.QueryRow("SELECT name FROM pragma_table_info('vulnerabilities') WHERE name = 'request_response'").Scan(&columnName)
	if err == sql.ErrNoRows {
		// 列不存在，添加它
		_, err = tx.Exec(`
			ALTER TABLE vulnerabilities ADD COLUMN request_response TEXT
		`)
		return err
	}
	return nil
}

func (m *Vuln_002_AddRequestResponse) Down(tx *sql.Tx) error {
	// SQLite 不支持 DROP COLUMN，所以这个迁移不可逆
	return nil
}
