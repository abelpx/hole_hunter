package services

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/holehunter/backend/internal/models"
)

type TargetService struct {
	db *sql.DB
}

func NewTargetService(db *sql.DB) *TargetService {
	return &TargetService{db: db}
}

func (s *TargetService) ListTargets(c *gin.Context) {
	rows, err := s.db.Query("SELECT id, name, url, description, tags, created_at, updated_at FROM targets ORDER BY created_at DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	targets := []models.Target{}
	for rows.Next() {
		var t models.Target
		var tagsStr string
		if err := rows.Scan(&t.ID, &t.Name, &t.URL, &t.DESC, &tagsStr, &t.CreatedAt, &t.UpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		t.ScanTags(tagsStr)
		targets = append(targets, t)
	}

	c.JSON(http.StatusOK, gin.H{"data": targets})
}

func (s *TargetService) GetTarget(c *gin.Context) {
	id := c.Param("id")
	var t models.Target
	var tagsStr string

	err := s.db.QueryRow(
		"SELECT id, name, url, description, tags, created_at, updated_at FROM targets WHERE id = ?",
		id,
	).Scan(&t.ID, &t.Name, &t.URL, &t.DESC, &tagsStr, &t.CreatedAt, &t.UpdatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Target not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	t.ScanTags(tagsStr)
	c.JSON(http.StatusOK, gin.H{"data": t})
}

func (s *TargetService) CreateTarget(c *gin.Context) {
	var req models.CreateTargetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tagsJSON, _ := json.Marshal(req.Tags)
	result, err := s.db.Exec(
		"INSERT INTO targets (name, url, description, tags) VALUES (?, ?, ?, ?)",
		req.Name, req.URL, req.DESC, string(tagsJSON),
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

func (s *TargetService) UpdateTarget(c *gin.Context) {
	id := c.Param("id")
	var req models.CreateTargetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tagsJSON, _ := json.Marshal(req.Tags)
	_, err := s.db.Exec(
		"UPDATE targets SET name = ?, url = ?, description = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		req.Name, req.URL, req.DESC, string(tagsJSON), id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (s *TargetService) DeleteTarget(c *gin.Context) {
	id := c.Param("id")

	_, err := s.db.Exec("DELETE FROM targets WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
