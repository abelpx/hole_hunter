package repo

import (
	"context"
	"database/sql"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
)

// BaseRepository 基础仓储，提供通用的数据库操作
type BaseRepository struct {
	db *sql.DB
}

// NewBaseRepository 创建基础仓储
func NewBaseRepository(db *sql.DB) *BaseRepository {
	return &BaseRepository{db: db}
}

// Exec 执行 SQL 语句（INSERT, UPDATE, DELETE）
func (r *BaseRepository) Exec(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	result, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return nil, errors.DBError("failed to execute query", err)
	}
	return result, nil
}

// Query 查询多行数据
func (r *BaseRepository) Query(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, errors.DBError("failed to query data", err)
	}
	return rows, nil
}

// QueryRow 查询单行数据
func (r *BaseRepository) QueryRow(ctx context.Context, query string, args ...interface{}) *sql.Row {
	return r.db.QueryRowContext(ctx, query, args...)
}

// QueryScalar 查询单个值（如 COUNT, MAX 等）
func (r *BaseRepository) QueryScalar(ctx context.Context, query string, args ...interface{}) (interface{}, error) {
	var result interface{}
	err := r.QueryRow(ctx, query, args...).Scan(&result)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, errors.DBError("failed to query scalar value", err)
	}
	return result, nil
}

// Exists 检查数据是否存在
func (r *BaseRepository) Exists(ctx context.Context, table, whereClause string, args ...interface{}) (bool, error) {
	query := "SELECT COUNT(*) FROM " + table + " WHERE " + whereClause

	var count int
	err := r.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		return false, errors.DBError("failed to check existence", err)
	}

	return count > 0, nil
}

// DeleteByID 根据 ID 删除记录
func (r *BaseRepository) DeleteByID(ctx context.Context, table string, id int) error {
	_, err := r.Exec(ctx, "DELETE FROM "+table+" WHERE id = ?", id)
	if err != nil {
		return err
	}
	return nil
}

// GetLastInsertID 获取最后插入的 ID
func (r *BaseRepository) GetLastInsertID(result sql.Result) (int, error) {
	id, err := result.LastInsertId()
	if err != nil {
		return 0, errors.DBError("failed to get last insert id", err)
	}
	return int(id), nil
}
