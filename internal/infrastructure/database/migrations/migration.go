package migrations

import "database/sql"

// Migration 迁移接口
type Migration interface {
	// Version 迁移版本号，格式: YYYYMMDDVV
	Version() int
	// Description 迁移描述
	Description() string
	// Module 所属模块
	Module() string
	// Up 执行迁移
	Up(tx *sql.Tx) error
	// Down 回滚迁移
	Down(tx *sql.Tx) error
}
