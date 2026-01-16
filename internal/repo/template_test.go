package repo

import (
	"context"
	"fmt"
	"testing"

	"github.com/holehunter/holehunter/internal/models"
)

func TestTemplateRepository_GetAll(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repo := NewTemplateRepository(db)
	ctx := context.Background()

	// 插入测试数据
	_, err := db.ExecContext(ctx, `
		INSERT INTO templates (source, template_id, name, severity, category, enabled)
		VALUES
			('builtin', 'test-1', 'Test Template 1', 'high', 'cves', 1),
			('custom', 'custom-1', 'Custom Template 1', 'info', 'examples', 1)
	`)
	if err != nil {
		t.Fatalf("Failed to insert test data: %v", err)
	}

	templates, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll failed: %v", err)
	}

	if len(templates) != 2 {
		t.Errorf("Expected 2 templates, got %d", len(templates))
	}
}

func TestTemplateRepository_GetByID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repo := NewTemplateRepository(db)
	ctx := context.Background()

	// 插入测试数据
	result, err := db.ExecContext(ctx, `
		INSERT INTO templates (source, template_id, name, severity, category, enabled)
		VALUES ('builtin', 'test-1', 'Test Template 1', 'high', 'cves', 1)
	`)
	if err != nil {
		t.Fatalf("Failed to insert test data: %v", err)
	}

	id, _ := result.LastInsertId()

	template, err := repo.GetByID(ctx, int(id))
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}

	if template.Name != "Test Template 1" {
		t.Errorf("Expected name 'Test Template 1', got '%s'", template.Name)
	}

	if template.Source != "builtin" {
		t.Errorf("Expected source 'builtin', got '%s'", template.Source)
	}
}

func TestTemplateRepository_GetPage(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repo := NewTemplateRepository(db)
	ctx := context.Background()

	// 插入 150 条测试数据
	for i := 1; i <= 150; i++ {
		templateID := fmt.Sprintf("test-%d", i)
		name := fmt.Sprintf("Template %d", i)
		_, err := db.ExecContext(ctx, `
			INSERT INTO templates (source, template_id, name, severity, category, enabled)
			VALUES (?, ?, ?, ?, ?, 1)
		`, "builtin", templateID, name, "high", "cves")
		if err != nil {
			t.Fatalf("Failed to insert test data: %v", err)
		}
	}

	tests := []struct {
		name          string
		page          int
		pageSize      int
		expectedCount int
		expectedTotal int
	}{
		{"第1页", 1, 50, 50, 150},
		{"第2页", 2, 50, 50, 150},
		{"第3页", 3, 50, 50, 150},
		{"第4页", 4, 50, 0, 150},
		{"小页面大小", 1, 10, 10, 150},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			templates, total, err := repo.GetPage(ctx, tt.page, tt.pageSize)
			if err != nil {
				t.Fatalf("GetPage failed: %v", err)
			}

			if len(templates) != tt.expectedCount {
				t.Errorf("Expected %d templates, got %d", tt.expectedCount, len(templates))
			}

			if total != tt.expectedTotal {
				t.Errorf("Expected total %d, got %d", tt.expectedTotal, total)
			}
		})
	}
}

func TestTemplateRepository_GetPageByFilter(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repo := NewTemplateRepository(db)
	ctx := context.Background()

	// 插入测试数据
	_, err := db.ExecContext(ctx, `
		INSERT INTO templates (source, template_id, name, severity, category, author, enabled)
		VALUES
			('builtin', 'cve-1', 'CVE-2021-44228', 'critical', 'cves', 'author1', 1),
			('builtin', 'cve-2', 'CVE-2022-1234', 'high', 'cves', 'author1', 1),
			('builtin', 'exposure-1', 'Exposed Admin Panel', 'high', 'exposures', 'author2', 1),
			('custom', 'custom-1', 'My Custom Template', 'info', 'examples', 'user', 1),
			('builtin', 'cve-3', 'Disabled CVE', 'critical', 'cves', 'author1', 0)
	`)
	if err != nil {
		t.Fatalf("Failed to insert test data: %v", err)
	}

	tests := []struct {
		name          string
		filter        *models.TemplateFilterUnified
		expectedCount int
	}{
		{
			name: "按分类过滤 - cves",
			filter: &models.TemplateFilterUnified{
				Category: "cves",
			},
			expectedCount: 3,
		},
		{
			name: "按严重程度过滤 - critical",
			filter: &models.TemplateFilterUnified{
				Severity: "critical",
			},
			expectedCount: 2,
		},
		{
			name: "按作者过滤 - author1",
			filter: &models.TemplateFilterUnified{
				Author: "author1",
			},
			expectedCount: 3,
		},
		{
			name: "按 source 过滤 - builtin",
			filter: &models.TemplateFilterUnified{
				Source: "builtin",
			},
			expectedCount: 4,
		},
		{
			name: "按 enabled 过滤 - true",
			filter: &models.TemplateFilterUnified{
				Enabled: boolPtr(true),
			},
			expectedCount: 4,
		},
		{
			name: "组合过滤 - cves + critical",
			filter: &models.TemplateFilterUnified{
				Category: "cves",
				Severity: "critical",
			},
			expectedCount: 2,
		},
		{
			name: "搜索关键词 - CVE",
			filter: &models.TemplateFilterUnified{
				Search: "CVE",
			},
			expectedCount: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			templates, total, err := repo.GetPageByFilter(ctx, tt.filter, 1, 100)
			if err != nil {
				t.Fatalf("GetPageByFilter failed: %v", err)
			}

			if len(templates) != tt.expectedCount {
				t.Errorf("Expected %d templates, got %d", tt.expectedCount, len(templates))
			}

			if total != tt.expectedCount {
				t.Errorf("Expected total %d, got %d", tt.expectedCount, total)
			}
		})
	}
}

func TestTemplateRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repo := NewTemplateRepository(db)
	ctx := context.Background()

	template := &models.Template{
		Source:     "custom",
		TemplateID: "test-custom-1",
		Name:       "Test Custom Template",
		Severity:   "info",
		Category:   "examples",
		Author:     "test-user",
		Content:    "id: test-custom-1\ninfo:\n  name: Test",
		Enabled:    true,
		Tags:       []string{"test", "example"},
	}

	created, err := repo.Create(ctx, template)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if created.ID == 0 {
		t.Error("Expected non-zero ID")
	}

	if created.Source != "custom" {
		t.Errorf("Expected source 'custom', got '%s'", created.Source)
	}
}

func TestTemplateRepository_Update(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repo := NewTemplateRepository(db)
	ctx := context.Background()

	// 先创建一个模板
	template := &models.Template{
		Source:     "custom",
		TemplateID: "test-custom-1",
		Name:       "Original Name",
		Severity:   "info",
		Category:   "examples",
		Enabled:    true,
	}

	created, err := repo.Create(ctx, template)
	if err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	// 更新模板
	created.Name = "Updated Name"
	created.Severity = "high"

	err = repo.Update(ctx, created)
	if err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	// 验证更新
	updated, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("Failed to get updated template: %v", err)
	}

	if updated.Name != "Updated Name" {
		t.Errorf("Expected name 'Updated Name', got '%s'", updated.Name)
	}

	if updated.Severity != "high" {
		t.Errorf("Expected severity 'high', got '%s'", updated.Severity)
	}
}

func TestTemplateRepository_Delete(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repo := NewTemplateRepository(db)
	ctx := context.Background()

	// 先创建一个模板
	template := &models.Template{
		Source:     "custom",
		TemplateID: "test-custom-1",
		Name:       "Test Template",
		Severity:   "info",
		Category:   "examples",
		Enabled:    true,
	}

	created, err := repo.Create(ctx, template)
	if err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	// 删除模板
	err = repo.Delete(ctx, created.ID)
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	// 验证删除
	_, err = repo.GetByID(ctx, created.ID)
	if err == nil {
		t.Error("Expected error when getting deleted template")
	}
}

func TestTemplateRepository_ToggleEnabled(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repo := NewTemplateRepository(db)
	ctx := context.Background()

	// 先创建一个模板
	template := &models.Template{
		Source:     "custom",
		TemplateID: "test-custom-1",
		Name:       "Test Template",
		Severity:   "info",
		Category:   "examples",
		Enabled:    true,
	}

	created, err := repo.Create(ctx, template)
	if err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	// 切换为禁用
	err = repo.ToggleEnabled(ctx, created.ID, false)
	if err != nil {
		t.Fatalf("ToggleEnabled failed: %v", err)
	}

	// 验证切换
	updated, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("Failed to get updated template: %v", err)
	}

	if updated.Enabled {
		t.Error("Expected enabled to be false")
	}
}

func TestTemplateRepository_SyncBuiltin(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repo := NewTemplateRepository(db)
	ctx := context.Background()

	// 插入初始数据
	_, err := db.ExecContext(ctx, `
		INSERT INTO templates (source, template_id, name, severity, category, enabled)
		VALUES ('builtin', 'existing-1', 'Existing Template', 'high', 'cves', 1)
	`)
	if err != nil {
		t.Fatalf("Failed to insert initial data: %v", err)
	}

	// 同步新数据
	templates := []*models.Template{
		{TemplateID: "existing-1", Name: "Updated Template", Severity: "critical", Category: "cves"},
		{TemplateID: "new-1", Name: "New Template", Severity: "high", Category: "exposures"},
		{TemplateID: "new-2", Name: "Another New Template", Severity: "info", Category: "technologies"},
	}

	stats, err := repo.SyncBuiltin(ctx, templates)
	if err != nil {
		t.Fatalf("SyncBuiltin failed: %v", err)
	}

	if stats.Updated != 1 {
		t.Errorf("Expected 1 updated, got %d", stats.Updated)
	}

	if stats.Inserted != 2 {
		t.Errorf("Expected 2 inserted, got %d", stats.Inserted)
	}
}

// Helper function
func boolPtr(b bool) *bool {
	return &b
}
