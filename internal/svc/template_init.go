package svc

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/holehunter/holehunter/internal/infrastructure/logger"
)

// TemplateInitService 模板初始化服务
type TemplateInitService struct {
	nucleiPath    string
	templatesDir  string
	logger        *logger.Logger
}

// NewTemplateInitService 创建模板初始化服务
func NewTemplateInitService(nucleiPath, templatesDir string, logger *logger.Logger) *TemplateInitService {
	return &TemplateInitService{
		nucleiPath:   nucleiPath,
		templatesDir: templatesDir,
		logger:       logger,
	}
}

// CheckStatus 检查模板状态
func (s *TemplateInitService) CheckStatus() (hasNuclei bool, hasTemplates bool, needsUpdate bool) {
	// 检查 nuclei
	if _, err := exec.LookPath(s.nucleiPath); err != nil {
		if _, err2 := exec.Command(s.nucleiPath, "-version").Output(); err2 != nil {
			return false, false, false
		}
	}
	hasNuclei = true

	// 检查模板目录
	if _, err := filepath.Glob(filepath.Join(s.templatesDir, "*.yaml")); err != nil {
		return hasNuclei, false, true
	}
	hasTemplates = true

	return hasNuclei, hasTemplates, false
}

// EnsureTemplates 确保模板已初始化（应用启动时调用）
func (s *TemplateInitService) EnsureTemplates(ctx context.Context) error {
	hasNuclei, hasTemplates, needsUpdate := s.CheckStatus()

	s.logger.Info("Template check: nuclei=%v, templates=%v", hasNuclei, hasTemplates)

	if !hasNuclei {
		s.logger.Warn("Nuclei not found at: %s", s.nucleiPath)
		return nil // 不阻塞启动
	}

	if !hasTemplates {
		s.logger.Info("Templates not found, downloading nuclei-templates...")
		if err := s.DownloadTemplates(ctx); err != nil {
			s.logger.Error("Failed to download templates: %v", err)
			// 不阻塞启动，但记录警告
		}
		return nil
	}

	if needsUpdate {
		s.logger.Info("Templates are available, use UpdateTemplates() to update")
	}

	return nil
}

// DownloadTemplates 下载 nuclei-templates
func (s *TemplateInitService) DownloadTemplates(ctx context.Context) error {
	s.logger.Info("Starting nuclei-templates download...")

	// 创建模板目录
	if err := exec.Command("mkdir", "-p", s.templatesDir).Run(); err != nil {
		s.logger.Warn("Failed to create templates directory: %v", err)
	}

	// 执行 nuclei -update-templates
	cmd := exec.CommandContext(ctx, s.nucleiPath, "-update-templates", "-silent")
	cmd.Env = append(cmd.Env, "NUCLEI_TEMPLATES_DIR="+s.templatesDir)

	output, err := cmd.CombinedOutput()
	if err != nil {
		s.logger.Error(" nuclei -update-templates failed: %s", string(output))
		return err
	}

	s.logger.Info("✓ Templates downloaded successfully to %s", s.templatesDir)
	return nil
}

// UpdateTemplates 更新模板（用户手动触发）
func (s *TemplateInitService) UpdateTemplates(ctx context.Context) error {
	s.logger.Info("Updating nuclei-templates...")
	start := time.Now()

	if err := s.DownloadTemplates(ctx); err != nil {
		return err
	}

	duration := time.Since(start)
	s.logger.Info("✓ Templates updated in %s", duration)
	return nil
}

// GetTemplateStats 获取模板统计信息
func (s *TemplateInitService) GetTemplateStats() (count int, size int64, err error) {
	if _, statErr := filepath.Glob(filepath.Join(s.templatesDir, "*.yaml")); statErr != nil {
		return 0, 0, nil
	}

	// 统计 yaml 文件数量
	var yamlCount int
	filepath.Walk(s.templatesDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && filepath.Ext(path) == ".yaml" {
			yamlCount++
		}
		return nil
	})

	// 统计总大小
	var totalSize int64
	filepath.Walk(s.templatesDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			totalSize += info.Size()
		}
		return nil
	})

	return yamlCount, totalSize, nil
}
