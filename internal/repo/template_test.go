package repo

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/holehunter/holehunter/internal/models"
)

// setupTestTemplateRepo 创建测试用的模板仓库
func setupTestTemplateRepo(t *testing.T) (repo *TemplateRepository, cleanup func()) {
	t.Helper()

	// 创建临时目录
	tempDir, err := os.MkdirTemp("", "templates-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	// 创建测试模板文件
	testTemplates := map[string]string{
		"cves/test-cve.yaml": `
id: cve-2024-1234
info:
  name: Test CVE Vulnerability
  severity: critical
  author: test-author
  description: A test CVE vulnerability
  tags: cve,critical
`,
		"vulnerabilities/test-vuln.yaml": `
id: vuln-2024-5678
info:
  name: Test Vulnerability
  severity: high
  author: test-author
  description: A test vulnerability
  tags: vuln,high
`,
		"exposures/test-exposure.yaml": `
id: exposure-2024-9012
info:
  name: Test Information Disclosure
  severity: medium
  author: another-author
  description: A test information disclosure
  tags: exposure,medium
`,
		"technologies/test-tech.yaml": `
id: tech-detection-123
info:
  name: Technology Detection
  severity: info
  author: test-author
  description: Detects specific technology
  tags: tech,detection
`,
		"misconfiguration/test-misc.yaml": `
id: misc-config-456
info:
  name: Misconfiguration Detection
  severity: low
  author: another-author
  description: Detects misconfiguration
  tags: misconfig,low
`,
	}

	for path, content := range testTemplates {
		fullPath := filepath.Join(tempDir, path)
		if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
			os.RemoveAll(tempDir)
			t.Fatalf("failed to create dir: %v", err)
		}
		if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
			os.RemoveAll(tempDir)
			t.Fatalf("failed to write file: %v", err)
		}
	}

	repo = NewTemplateRepository(tempDir)
	cleanup = func() {
		os.RemoveAll(tempDir)
	}

	return repo, cleanup
}

func TestTemplateRepository_GetAll(t *testing.T) {
	repo, cleanup := setupTestTemplateRepo(t)
	defer cleanup()

	ctx := context.Background()
	templates, err := repo.GetAll(ctx)

	if err != nil {
		t.Fatalf("GetAll() error = %v", err)
	}

	// 验证返回了所有模板
	if len(templates) != 5 {
		t.Errorf("GetAll() returned %d templates, want 5", len(templates))
	}

	// 验证模板的基本属性
	for _, tmpl := range templates {
		if tmpl.ID == "" {
			t.Error("template ID should not be empty")
		}
		if tmpl.Name == "" {
			t.Error("template Name should not be empty")
		}
		if !tmpl.Enabled {
			t.Error("template should be enabled by default")
		}
	}
}

func TestTemplateRepository_GetByCategory(t *testing.T) {
	tests := []struct {
		name      string
		category  string
		wantCount int
		wantIDs   []string
	}{
		{
			name:      "获取 cves 分类",
			category:  "cves",
			wantCount: 1,
			wantIDs:   []string{"cves/test-cve"},
		},
		{
			name:      "获取 vulnerabilities 分类",
			category:  "vulnerabilities",
			wantCount: 1,
			wantIDs:   []string{"vulnerabilities/test-vuln"},
		},
		{
			name:      "获取不存在的分类",
			category:  "nonexistent",
			wantCount: 0,
			wantIDs:   nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo, cleanup := setupTestTemplateRepo(t)
			defer cleanup()

			ctx := context.Background()
			templates, err := repo.GetByCategory(ctx, tt.category)

			if err != nil {
				t.Fatalf("GetByCategory() error = %v", err)
			}

			if len(templates) != tt.wantCount {
				t.Errorf("GetByCategory() returned %d templates, want %d", len(templates), tt.wantCount)
			}

			if tt.wantIDs != nil {
				for _, wantID := range tt.wantIDs {
					found := false
					for _, tmpl := range templates {
						if tmpl.ID == wantID {
							found = true
							break
						}
					}
					if !found {
						t.Errorf("GetByCategory() did not return template with ID %s", wantID)
					}
				}
			}
		})
	}
}

func TestTemplateRepository_GetBySeverity(t *testing.T) {
	tests := []struct {
		name      string
		severity  string
		wantCount int
		wantNames []string
	}{
		{
			name:      "获取 critical 级别",
			severity:  "critical",
			wantCount: 1,
			wantNames: []string{"Test CVE Vulnerability"},
		},
		{
			name:      "获取 high 级别",
			severity:  "high",
			wantCount: 1,
			wantNames: []string{"Test Vulnerability"},
		},
		{
			name:      "获取 medium 级别",
			severity:  "medium",
			wantCount: 1,
			wantNames: []string{"Test Information Disclosure"},
		},
		{
			name:      "获取 low 级别",
			severity:  "low",
			wantCount: 1,
			wantNames: []string{"Misconfiguration Detection"},
		},
		{
			name:      "获取 info 级别",
			severity:  "info",
			wantCount: 1,
			wantNames: []string{"Technology Detection"},
		},
		{
			name:      "获取不存在的级别",
			severity:  "unknown",
			wantCount: 0,
			wantNames: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo, cleanup := setupTestTemplateRepo(t)
			defer cleanup()

			ctx := context.Background()
			templates, err := repo.GetBySeverity(ctx, tt.severity)

			if err != nil {
				t.Fatalf("GetBySeverity() error = %v", err)
			}

			if len(templates) != tt.wantCount {
				t.Errorf("GetBySeverity() returned %d templates, want %d", len(templates), tt.wantCount)
			}

			if tt.wantNames != nil {
				for _, wantName := range tt.wantNames {
					found := false
					for _, tmpl := range templates {
						if tmpl.Name == wantName {
							found = true
							// 验证严重级别
							if tmpl.Severity != tt.severity {
								t.Errorf("template severity = %s, want %s", tmpl.Severity, tt.severity)
							}
							break
						}
					}
					if !found {
						t.Errorf("GetBySeverity() did not return template with name %s", wantName)
					}
				}
			}
		})
	}
}

func TestTemplateRepository_GetByID(t *testing.T) {
	repo, cleanup := setupTestTemplateRepo(t)
	defer cleanup()

	ctx := context.Background()

	tests := []struct {
		name      string
		id        string
		wantName  string
		wantError bool
	}{
		{
			name:      "获取存在的模板",
			id:        "cves/test-cve",
			wantName:  "Test CVE Vulnerability",
			wantError: false,
		},
		{
			name:      "获取不存在的模板",
			id:        "nonexistent/test",
			wantName:  "",
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			template, err := repo.GetByID(ctx, tt.id)

			if tt.wantError {
				if err == nil {
					t.Error("GetByID() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("GetByID() error = %v", err)
			}

			if template.Name != tt.wantName {
				t.Errorf("GetByID() name = %s, want %s", template.Name, tt.wantName)
			}

			if template.ID != tt.id {
				t.Errorf("GetByID() ID = %s, want %s", template.ID, tt.id)
			}
		})
	}
}

func TestTemplateRepository_ParseTemplate(t *testing.T) {
	repo, cleanup := setupTestTemplateRepo(t)
	defer cleanup()

	ctx := context.Background()
	templates, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll() error = %v", err)
	}

	// 找到 CVE 模板进行详细验证
	var cveTemplate *models.NucleiTemplate
	for _, tmpl := range templates {
		if tmpl.ID == "cves/test-cve" {
			cveTemplate = tmpl
			break
		}
	}

	if cveTemplate == nil {
		t.Fatal("CVE template not found")
	}

	// 验证解析的字段
	tests := []struct {
		field string
		want  string
		got   string
	}{
		{"ID", "cves/test-cve", cveTemplate.ID},
		{"Name", "Test CVE Vulnerability", cveTemplate.Name},
		{"Severity", "critical", cveTemplate.Severity},
		{"Author", "test-author", cveTemplate.Author},
		{"Description", "A test CVE vulnerability", cveTemplate.Description},
		{"Category", "cves", cveTemplate.Category},
	}

	for _, tt := range tests {
		t.Run(tt.field, func(t *testing.T) {
			if tt.got != tt.want {
				t.Errorf("%s = %s, want %s", tt.field, tt.got, tt.want)
			}
		})
	}

	// 验证 tags（逗号分隔的字符串应被解析为数组）
	if len(cveTemplate.Tags) != 2 {
		t.Errorf("Tags length = %d, want 2", len(cveTemplate.Tags))
	}
	expectedTags := []string{"cve", "critical"}
	for i, tag := range cveTemplate.Tags {
		if tag != expectedTags[i] {
			t.Errorf("Tags[%d] = %s, want %s", i, tag, expectedTags[i])
		}
	}

	// 验证 Enabled 默认为 true
	if !cveTemplate.Enabled {
		t.Error("Enabled should be true by default")
	}
}

func TestTemplateRepository_EmptyDirectory(t *testing.T) {
	// 空目录测试
	tempDir, err := os.MkdirTemp("", "empty-templates-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	repo := NewTemplateRepository(tempDir)
	ctx := context.Background()

	templates, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll() on empty dir error = %v", err)
	}

	if len(templates) != 0 {
		t.Errorf("GetAll() on empty dir returned %d templates, want 0", len(templates))
	}
}

func TestTemplateRepository_NonexistentDirectory(t *testing.T) {
	// 不存在的目录测试
	repo := NewTemplateRepository("/nonexistent/directory/that/does/not/exist")
	ctx := context.Background()

	templates, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll() on nonexistent dir error = %v", err)
	}

	if len(templates) != 0 {
		t.Errorf("GetAll() on nonexistent dir returned %d templates, want 0", len(templates))
	}
}

func TestTemplateRepository_InvalidYAML(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "invalid-yaml-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// 创建无效的 YAML 文件
	invalidPath := filepath.Join(tempDir, "test/invalid.yaml")
	if err := os.MkdirAll(filepath.Dir(invalidPath), 0755); err != nil {
		t.Fatalf("failed to create dir: %v", err)
	}
	if err := os.WriteFile(invalidPath, []byte("invalid: yaml: content: ["), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	repo := NewTemplateRepository(tempDir)
	ctx := context.Background()

	// 应该跳过无效文件，不返回错误
	templates, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll() with invalid YAML error = %v", err)
	}

	// 验证返回的模板数量（可能有一个部分解析的模板）
	// 解析失败的模板会返回最小信息
	if len(templates) != 1 {
		t.Errorf("GetAll() returned %d templates, want 1 (parsed with minimal info)", len(templates))
	}

	// 验证解析失败的模板有默认值
	tmpl := templates[0]
	if tmpl.Severity != "unknown" {
		t.Errorf("invalid template severity = %s, want 'unknown'", tmpl.Severity)
	}
}
