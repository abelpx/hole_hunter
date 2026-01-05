package services

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/holehunter/backend/internal/models"
	"github.com/holehunter/backend/pkg/config"
)

type ScanService struct {
	db    *sql.DB
	nuclei *config.NucleiConfig
}

func NewScanService(db *sql.DB, nucleiCfg *config.NucleiConfig) *ScanService {
	return &ScanService{
		db:    db,
		nuclei: nucleiCfg,
	}
}

func (s *ScanService) ListScans(c *gin.Context) {
	rows, err := s.db.Query(`
	 SELECT id, target_id, status, strategy, templates_used, started_at, completed_at,
	        total_templates, executed_templates, progress, current_template, error, created_at
	 FROM scan_tasks
	 ORDER BY created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	scans := []models.ScanTask{}
	for rows.Next() {
		var scan models.ScanTask
		var templatesStr string
		if err := rows.Scan(
			&scan.ID, &scan.TargetID, &scan.Status, &scan.Strategy, &templatesStr,
			&scan.StartedAt, &scan.CompletedAt, &scan.TotalTemplates,
			&scan.ExecutedTemplates, &scan.Progress, &scan.CurrentTemplate,
			&scan.Error, &scan.CreatedAt,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		scan.ScanTemplates(templatesStr)
		scans = append(scans, scan)
	}

	c.JSON(http.StatusOK, gin.H{"data": scans})
}

func (s *ScanService) GetScan(c *gin.Context) {
	id := c.Param("id")
	var scan models.ScanTask
	var templatesStr string

	err := s.db.QueryRow(`
		SELECT id, target_id, status, strategy, templates_used, started_at, completed_at,
		       total_templates, executed_templates, progress, current_template, error, created_at
		FROM scan_tasks WHERE id = ?
	`, id).Scan(
		&scan.ID, &scan.TargetID, &scan.Status, &scan.Strategy, &templatesStr,
		&scan.StartedAt, &scan.CompletedAt, &scan.TotalTemplates,
		&scan.ExecutedTemplates, &scan.Progress, &scan.CurrentTemplate,
		&scan.Error, &scan.CreatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scan task not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	scan.ScanTemplates(templatesStr)
	c.JSON(http.StatusOK, gin.H{"data": scan})
}

func (s *ScanService) CreateScan(c *gin.Context) {
	var req models.CreateScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify target exists
	var targetExists bool
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM targets WHERE id = ?)", req.TargetID).Scan(&targetExists)
	if err != nil || !targetExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Target not found"})
		return
	}

	templatesJSON, _ := json.Marshal(req.Templates)
	now := time.Now()

	result, err := s.db.Exec(
		"INSERT INTO scan_tasks (target_id, status, strategy, templates_used, created_at) VALUES (?, ?, ?, ?, ?)",
		req.TargetID, "pending", req.Strategy, string(templatesJSON), now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{"id": id},
	})
}

func (s *ScanService) StartScan(c *gin.Context) {
	id := c.Param("id")

	// Update scan status to running
	_, err := s.db.Exec(
		"UPDATE scan_tasks SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?",
		"running", id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement actual Nuclei scan execution
	// This should spawn a goroutine to run nuclei and update the database

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (s *ScanService) CancelScan(c *gin.Context) {
	id := c.Param("id")

	_, err := s.db.Exec(
		"UPDATE scan_tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
		"cancelled", id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// TODO: Stop the running Nuclei process

	c.JSON(http.StatusOK, gin.H{"success": true})
}
