package svc

import (
	"context"
	"testing"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
)

func TestTemplateService_CreateCustomTemplate(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repository := repo.NewTemplateRepository(db)
	service := NewTemplateService(repository)
	ctx := context.Background()

	// 测试创建自定义模板
	validYAML := `id: test-custom-1
info:
  name: Test Custom Template
  severity: high
  description: This is a test template
  author: test-user
  tags:
    - test
    - custom
http:
  - method: GET
    path:
      - "{{BaseURL}}"
    matchers:
      - type: status
        status:
          - 200
`

	req := &models.CreateTemplateRequest{
		Name:     "My Custom Template",
		Content:  validYAML,
		Severity: "high",
		Category: "examples",
		Author:   "test-user",
		Tags:     []string{"test", "custom"},
		Enabled:  true,
	}

	template, err := service.CreateCustomTemplate(ctx, req)
	if err != nil {
		t.Fatalf("CreateCustomTemplate failed: %v", err)
	}

	if template.Name != "My Custom Template" {
		t.Errorf("Expected name 'My Custom Template', got '%s'", template.Name)
	}

	if template.Source != "custom" {
		t.Errorf("Expected source 'custom', got '%s'", template.Source)
	}

	if !template.Enabled {
		t.Error("Expected enabled to be true")
	}
}

func TestTemplateService_CreateCustomTemplate_InvalidYAML(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repository := repo.NewTemplateRepository(db)
	service := NewTemplateService(repository)
	ctx := context.Background()

	req := &models.CreateTemplateRequest{
		Name:    "Invalid Template",
		Content: "invalid: yaml: content: [",
		Enabled: true,
	}

	_, err := service.CreateCustomTemplate(ctx, req)
	if err == nil {
		t.Error("Expected error for invalid YAML, got nil")
	}
}

func TestTemplateService_UpdateCustomTemplate(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repository := repo.NewTemplateRepository(db)
	service := NewTemplateService(repository)
	ctx := context.Background()

	// 先创建一个模板
	createReq := &models.CreateTemplateRequest{
		Name:     "Original Name",
		Content:  "id: test\ninfo:\n  name: Test",
		Severity: "info",
		Category: "examples",
		Enabled:  true,
	}

	template, err := service.CreateCustomTemplate(ctx, createReq)
	if err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	// 更新模板
	updateReq := &models.UpdateTemplateRequest{
		Name:     stringPtr("Updated Name"),
		Severity: stringPtr("high"),
	}

	err = service.UpdateCustomTemplate(ctx, template.ID, updateReq)
	if err != nil {
		t.Fatalf("UpdateCustomTemplate failed: %v", err)
	}

	// 验证更新
	updated, err := service.GetByID(ctx, template.ID)
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

func TestTemplateService_DeleteCustomTemplate(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repository := repo.NewTemplateRepository(db)
	service := NewTemplateService(repository)
	ctx := context.Background()

	// 先创建一个模板
	createReq := &models.CreateTemplateRequest{
		Name:     "Test Template",
		Content:  "id: test\ninfo:\n  name: Test",
		Severity: "info",
		Category: "examples",
		Enabled:  true,
	}

	template, err := service.CreateCustomTemplate(ctx, createReq)
	if err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	// 删除模板
	err = service.DeleteCustomTemplate(ctx, template.ID)
	if err != nil {
		t.Fatalf("DeleteCustomTemplate failed: %v", err)
	}

	// 验证删除
	_, err = service.GetByID(ctx, template.ID)
	if err == nil {
		t.Error("Expected error when getting deleted template")
	}
}

func TestTemplateService_ToggleCustomTemplate(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repository := repo.NewTemplateRepository(db)
	service := NewTemplateService(repository)
	ctx := context.Background()

	// 先创建一个启用的模板
	createReq := &models.CreateTemplateRequest{
		Name:     "Test Template",
		Content:  "id: test\ninfo:\n  name: Test",
		Severity: "info",
		Category: "examples",
		Enabled:  true,
	}

	template, err := service.CreateCustomTemplate(ctx, createReq)
	if err != nil {
		t.Fatalf("Failed to create template: %v", err)
	}

	// 切换为禁用
	err = service.ToggleCustomTemplate(ctx, template.ID, false)
	if err != nil {
		t.Fatalf("ToggleCustomTemplate failed: %v", err)
	}

	// 验证切换
	updated, err := service.GetByID(ctx, template.ID)
	if err != nil {
		t.Fatalf("Failed to get updated template: %v", err)
	}

	if updated.Enabled {
		t.Error("Expected enabled to be false")
	}
}

func TestTemplateService_GetPageByFilter(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	repository := repo.NewTemplateRepository(db)
	service := NewTemplateService(repository)
	ctx := context.Background()

	// 插入测试数据
	_, err := db.ExecContext(ctx, `
		INSERT INTO templates (source, template_id, name, severity, category, enabled)
		VALUES
			('builtin', 'cve-1', 'CVE-2021-44228', 'critical', 'cves', 1),
			('builtin', 'cve-2', 'CVE-2022-1234', 'high', 'cves', 1),
			('custom', 'custom-1', 'My Custom Template', 'info', 'examples', 1)
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
			name: "按 source 过滤 - custom",
			filter: &models.TemplateFilterUnified{
				Source: "custom",
			},
			expectedCount: 1,
		},
		{
			name: "按分类过滤 - cves",
			filter: &models.TemplateFilterUnified{
				Category: "cves",
			},
			expectedCount: 2,
		},
		{
			name:          "无过滤",
			filter:        &models.TemplateFilterUnified{},
			expectedCount: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			templates, total, err := service.GetPageByFilter(ctx, tt.filter, 1, 100)
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

// Helper function
func stringPtr(s string) *string {
	return &s
}
