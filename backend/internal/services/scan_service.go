package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/holehunter/backend/internal/models"
	"github.com/holehunter/backend/internal/scanner"
	"github.com/holehunter/backend/internal/websocket"
	"github.com/holehunter/backend/pkg/config"
)

type ScanService struct {
	db         *sql.DB
	nucleiCfg  *config.NucleiConfig
	scanCfg    *config.ScanConfig
	scanner    *scanner.NucleiScanner
	hub        *websocket.Hub
}

func NewScanService(db *sql.DB, nucleiCfg *config.NucleiConfig, scanCfg *config.ScanConfig) *ScanService {
	nucleiScanner := scanner.NewNucleiScanner(nucleiCfg, scanCfg, db)

	return &ScanService{
		db:        db,
		nucleiCfg: nucleiCfg,
		scanCfg:   scanCfg,
		scanner:   nucleiScanner,
		hub:       websocket.NewHub(),
	}
}

// GetWebSocketHub returns the WebSocket hub for real-time updates
func (s *ScanService) GetWebSocketHub() *websocket.Hub {
	return s.hub
}

// StartWebSocketHub starts the WebSocket hub in a background goroutine
func (s *ScanService) StartWebSocketHub() {
	go s.hub.Run()
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
		"data":    gin.H{"id": id},
	})
}

func (s *ScanService) StartScan(c *gin.Context) {
	idStr := c.Param("id")
	taskID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid scan ID"})
		return
	}

	// Get scan task details
	var scan models.ScanTask
	var templatesStr string
	var targetURL string

	err = s.db.QueryRow(`
		SELECT st.id, st.target_id, st.status, st.strategy, st.templates_used,
		       COALESCE(t.url, '') as url
		FROM scan_tasks st
		LEFT JOIN targets t ON st.target_id = t.id
		WHERE st.id = ?
	`, taskID).Scan(&scan.ID, &scan.TargetID, &scan.Status, &scan.Strategy, &templatesStr, &targetURL)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scan task not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if scan.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Scan task is not in pending status (current: %s)", scan.Status)})
		return
	}

	// Parse templates
	scan.ScanTemplates(templatesStr)

	// Update scan status to running
	now := time.Now()
	_, err = s.db.Exec(
		"UPDATE scan_tasks SET status = ?, started_at = ? WHERE id = ?",
		"running", now, taskID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Set progress callback for WebSocket updates
	s.scanner.SetProgressCallback(func(progress scanner.NucleiProgress) {
		// Update database with progress
		_, err := s.db.Exec(`
			UPDATE scan_tasks
			SET total_templates = ?, executed_templates = ?, progress = ?
			WHERE id = ?
		`, progress.TotalTemplates, progress.Executed, progress.Progress, taskID)
		if err != nil {
			fmt.Printf("Error updating scan progress: %v\n", err)
		}

		// Broadcast progress via WebSocket
		s.hub.Broadcast(websocket.Message{
			Type: "scan_progress",
			Data: progress,
		})
	})

	// Execute scan in background goroutine
	go s.executeScan(taskID, targetURL, scan.Strategy, scan.TemplatesUsed, models.ScanOptions{})

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (s *ScanService) CancelScan(c *gin.Context) {
	idStr := c.Param("id")
	taskID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid scan ID"})
		return
	}

	// Check if scan is running
	var status string
	err = s.db.QueryRow("SELECT status FROM scan_tasks WHERE id = ?", taskID).Scan(&status)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scan task not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if status != "running" {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Scan task is not running (current: %s)", status)})
		return
	}

	// Cancel the scan
	if err := s.scanner.Cancel(taskID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update database
	now := time.Now()
	_, err = s.db.Exec(
		"UPDATE scan_tasks SET status = ?, completed_at = ? WHERE id = ?",
		"cancelled", now, taskID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Broadcast cancellation via WebSocket
	s.hub.Broadcast(websocket.Message{
		Type: "scan_cancelled",
		Data: gin.H{"task_id": taskID},
	})

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// executeScan runs the Nuclei scan and handles the result
func (s *ScanService) executeScan(taskID int, targetURL string, strategy string, templates []string, options models.ScanOptions) {
	result, err := s.scanner.Run(taskID, targetURL, strategy, templates, options)

	now := time.Now()
	var status string
	var errorMsg *string

	if err != nil {
		status = "failed"
		errMsg := err.Error()
		errorMsg = &errMsg
		fmt.Printf("Scan %d failed: %v\n", taskID, err)
	} else {
		status = result.Status
		if result.Error != "" {
			errorMsg = &result.Error
		}
		fmt.Printf("Scan %d completed with status: %s\n", taskID, status)
	}

	// Update scan task in database
	_, dbErr := s.db.Exec(`
		UPDATE scan_tasks
		SET status = ?, completed_at = ?, error = ?, progress = ?
		WHERE id = ?
	`, status, now, errorMsg, func() int {
		if status == "completed" {
			return 100
		}
		return 0
	}(), taskID)

	if dbErr != nil {
		fmt.Printf("Error updating scan task: %v\n", dbErr)
	}

	// Broadcast completion via WebSocket
	s.hub.Broadcast(websocket.Message{
		Type: "scan_completed",
		Data: gin.H{
			"task_id":  taskID,
			"status":   status,
			"error":    errorMsg,
			"duration": result.Duration.String(),
		},
	})
}
