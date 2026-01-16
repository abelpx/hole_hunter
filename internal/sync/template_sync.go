package sync

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/holehunter/holehunter/internal/infrastructure/logger"
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/svc"
	"gopkg.in/yaml.v3"
)

// TemplateSyncer 模板同步器
type TemplateSyncer struct {
	templateSvc *svc.TemplateService
	templatesDir string
	logger       *logger.Logger
}

// NewTemplateSyncer 创建模板同步器
func NewTemplateSyncer(templateSvc *svc.TemplateService, templatesDir string, logger *logger.Logger) *TemplateSyncer {
	return &TemplateSyncer{
		templateSvc:  templateSvc,
		templatesDir: templatesDir,
		logger:       logger,
	}
}

// SyncBuiltinTemplates 同步内置模板到数据库
func (s *TemplateSyncer) SyncBuiltinTemplates(ctx context.Context) error {
	s.logger.Info("Starting builtin templates sync from: %s", s.templatesDir)

	// 检查模板目录是否存在
	if _, err := os.Stat(s.templatesDir); err != nil {
		s.logger.Warn("Templates directory not found: %s", s.templatesDir)
		return fmt.Errorf("templates directory not found: %w", err)
	}

	// 扫描并解析所有模板
	templates := make([]*models.Template, 0)
	err := filepath.Walk(s.templatesDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 跳过目录和非 YAML 文件
		if info.IsDir() || !strings.HasSuffix(path, ".yaml") {
			return nil
		}

		// 解析模板文件
		template, err := s.parseTemplateFile(path)
		if err != nil {
			s.logger.Debug("Failed to parse template %s: %v", path, err)
			// 不中断整个同步过程，继续处理其他模板
			return nil
		}

		if template != nil {
			templates = append(templates, template)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to walk templates directory: %w", err)
	}

	s.logger.Info("Parsed %d templates from filesystem", len(templates))

	// 同步到数据库
	stats, err := s.templateSvc.SyncBuiltinTemplates(ctx, templates)
	if err != nil {
		return fmt.Errorf("failed to sync templates to database: %w", err)
	}

	s.logger.Info("Template sync completed: inserted=%d, updated=%d, deleted=%d, total=%d",
		stats.Inserted, stats.Updated, stats.Deleted, stats.Total)

	return nil
}

// parseTemplateFile 解析单个模板文件
func (s *TemplateSyncer) parseTemplateFile(filePath string) (*models.Template, error) {
	// 读取文件内容
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// 解析 YAML
	var templateData map[string]interface{}
	if err := yaml.Unmarshal(content, &templateData); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	// 检查必需字段
	templateID, ok := templateData["id"].(string)
	if !ok || templateID == "" {
		return nil, fmt.Errorf("missing or empty template id")
	}

	infoMap, ok := templateData["info"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("missing info section")
	}

	// 构建模板对象
	template := &models.Template{
		Source:     "builtin",
		TemplateID: templateID,
		Content:    string(content),
		Enabled:    true,
		Path:       filePath,
	}

	// 提取 info 字段
	if name, ok := infoMap["name"].(string); ok {
		template.Name = name
	}
	if author, ok := infoMap["author"].(string); ok {
		template.Author = author
	}
	if severity, ok := infoMap["severity"].(string); ok {
		template.Severity = severity
	}
	if description, ok := infoMap["description"].(string); ok {
		template.Description = description
	}

	// 提取标签
	if tagsArray, ok := infoMap["tags"].([]interface{}); ok {
		for _, tag := range tagsArray {
			if tagStr, ok := tag.(string); ok {
				template.Tags = append(template.Tags, tagStr)
			}
		}
	}

	// 提取分类（从文件路径）
	relPath, err := filepath.Rel(s.templatesDir, filePath)
	if err == nil {
		dir := filepath.Dir(relPath)
		if dir != "." {
			template.Category = dir
		}
	}

	// 提取其他元数据
	if impact, ok := infoMap["impact"].(string); ok {
		template.Impact = impact
	}
	if remediation, ok := infoMap["remediation"].(string); ok {
		template.Remediation = remediation
	}
	if reference, ok := infoMap["reference"].(string); ok {
		template.Reference = []string{reference}
	}

	return template, nil
}
