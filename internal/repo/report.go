package repo

import (
	"context"
	"database/sql"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
)

// ReportRepository 报告仓储
type ReportRepository struct {
	db *sql.DB
}

// NewReportRepository 创建报告仓储
func NewReportRepository(db *sql.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

// GetAll 获取所有报告
func (r *ReportRepository) GetAll(ctx context.Context) ([]*models.Report, error) {
	query := `
		SELECT id, name, scan_id, type, format, file_path, file_size, status, config,
		       created_at, generated_at
		FROM reports
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, errors.DBError("failed to query reports", err)
	}
	defer rows.Close()

	var reports []*models.Report
	for rows.Next() {
		var rpt models.Report
		var configJSON string
		var filePath, generatedAt sql.NullString
		var fileSize sql.NullInt64

		err := rows.Scan(&rpt.ID, &rpt.Name, &rpt.ScanID, &rpt.Type, &rpt.Format,
			&filePath, &fileSize, &rpt.Status, &configJSON,
			&rpt.CreatedAt, &generatedAt)
		if err != nil {
			return nil, errors.DBError("failed to scan report", err)
		}

		if filePath.Valid {
			rpt.FilePath = filePath.String
		}
		if fileSize.Valid {
			rpt.FileSize = fileSize.Int64
		}
		if generatedAt.Valid {
			rpt.GeneratedAt = generatedAt.String
		}

		// TODO: 解析 config JSON
		rpt.Config = make(map[string]interface{})

		reports = append(reports, &rpt)
	}

	return reports, nil
}

// GetByID 根据 ID 获取报告
func (r *ReportRepository) GetByID(ctx context.Context, id int) (*models.Report, error) {
	query := `
		SELECT id, name, scan_id, type, format, file_path, file_size, status, config,
		       created_at, generated_at
		FROM reports WHERE id = ?
	`

	var rpt models.Report
	var configJSON string
	var filePath, generatedAt sql.NullString
	var fileSize sql.NullInt64

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&rpt.ID, &rpt.Name, &rpt.ScanID, &rpt.Type, &rpt.Format,
		&filePath, &fileSize, &rpt.Status, &configJSON,
		&rpt.CreatedAt, &generatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NotFound("report not found")
	}
	if err != nil {
		return nil, errors.DBError("failed to query report", err)
	}

	if filePath.Valid {
		rpt.FilePath = filePath.String
	}
	if fileSize.Valid {
		rpt.FileSize = fileSize.Int64
	}
	if generatedAt.Valid {
		rpt.GeneratedAt = generatedAt.String
	}

	// TODO: 解析 config JSON
	rpt.Config = make(map[string]interface{})

	return &rpt, nil
}

// Create 创建报告
func (r *ReportRepository) Create(ctx context.Context, report *models.Report) error {
	// TODO: 序列化 config
	configJSON := "{}"

	query := `
		INSERT INTO reports (name, scan_id, type, format, status, config, created_at)
		VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
	`

	result, err := r.db.ExecContext(ctx, query,
		report.Name, report.ScanID, report.Type, report.Format,
		report.Status, configJSON)
	if err != nil {
		return errors.DBError("failed to create report", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return errors.DBError("failed to get last insert id", err)
	}

	report.ID = int(id)
	return nil
}

// Update 更新报告
func (r *ReportRepository) Update(ctx context.Context, report *models.Report) error {
	// TODO: 序列化 config
	configJSON := "{}"

	query := `
		UPDATE reports
		SET name = ?, format = ?, file_path = ?, file_size = ?, status = ?, config = ?, generated_at = datetime('now')
		WHERE id = ?
	`

	_, err := r.db.ExecContext(ctx, query,
		report.Name, report.Format, report.FilePath, report.FileSize,
		report.Status, configJSON, report.ID)
	if err != nil {
		return errors.DBError("failed to update report", err)
	}

	return nil
}

// Delete 删除报告
func (r *ReportRepository) Delete(ctx context.Context, id int) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM reports WHERE id = ?", id)
	if err != nil {
		return errors.DBError("failed to delete report", err)
	}
	return nil
}

// GetByScanID 根据扫描 ID 获取报告
func (r *ReportRepository) GetByScanID(ctx context.Context, scanID int) ([]*models.Report, error) {
	query := `
		SELECT id, name, scan_id, type, format, file_path, file_size, status, config,
		       created_at, generated_at
		FROM reports WHERE scan_id = ?
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, scanID)
	if err != nil {
		return nil, errors.DBError("failed to query reports by scan", err)
	}
	defer rows.Close()

	var reports []*models.Report
	for rows.Next() {
		var rpt models.Report
		var configJSON string

		err := rows.Scan(&rpt.ID, &rpt.Name, &rpt.ScanID, &rpt.Type, &rpt.Format,
			&rpt.FilePath, &rpt.FileSize, &rpt.Status, &configJSON,
			&rpt.CreatedAt, &rpt.GeneratedAt)
		if err != nil {
			return nil, errors.DBError("failed to scan report", err)
		}

		rpt.Config = make(map[string]interface{})
		reports = append(reports, &rpt)
	}

	return reports, nil
}
