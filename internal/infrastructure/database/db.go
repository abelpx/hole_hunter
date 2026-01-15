package database

import (
	"database/sql"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
	"github.com/holehunter/holehunter/internal/infrastructure/errors"
)

// Open 打开数据库连接
func Open(dbPath string) (*sql.DB, error) {
	// 确保目录存在
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, errors.DBError("failed to create database directory", err)
	}

	// 打开数据库，启用外键约束
	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return nil, errors.DBError("failed to open database", err)
	}

	// 设置连接池
	db.SetMaxOpenConns(1) // SQLite 不支持多写
	db.SetMaxIdleConns(1)

	// 测试连接
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, errors.DBError("failed to ping database", err)
	}

	return db, nil
}

// InitSchema 初始化数据库并执行迁移
// 注意：此函数已迁移到 migrations.go，保留此文件用于兼容性
func InitSchema(db *sql.DB) error {
	return initSchema(db)
}
