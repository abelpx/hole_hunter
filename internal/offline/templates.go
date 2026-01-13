package offline

import (
	"fmt"
	"os"
	"path/filepath"
)

// TemplateManager 模板管理器
type TemplateManager struct {
	templatesDir string
}

// NewTemplateManager 创建模板管理器
func NewTemplateManager(templatesDir string) *TemplateManager {
	return &TemplateManager{
		templatesDir: templatesDir,
	}
}

// TemplateInfo 模板信息
type TemplateInfo struct {
	Total      int                    `json:"total"`
	Categories map[string]int         `json:"categories"`
	Severities map[string]int         `json:"severities"`
	Types      map[string]int         `json:"types"`
	Custom     []string               `json:"custom_templates"`
	Metadata   map[string]interface{} `json:"metadata"`
}

// GetTemplateInfo 获取模板信息
func (tm *TemplateManager) GetTemplateInfo() (*TemplateInfo, error) {
	info := &TemplateInfo{
		Categories: make(map[string]int),
		Severities: make(map[string]int),
		Types:      make(map[string]int),
		Custom:     []string{},
		Metadata:   make(map[string]interface{}),
	}

	// 检查模板目录
	if _, err := os.Stat(tm.templatesDir); err != nil {
		return info, fmt.Errorf("templates directory not found: %w", err)
	}

	// 遍历模板目录
	err := filepath.Walk(tm.templatesDir, func(path string, fileInfo os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 跳过目录和非 YAML 文件
		if fileInfo.IsDir() || filepath.Ext(path) != ".yaml" {
			return nil
		}

		// 统计模板
		info.Total++

		// 相对路径用于分类
		relPath, _ := filepath.Rel(tm.templatesDir, path)
		dir := filepath.Dir(relPath)

		// 统计分类
		if dir != "." {
			info.Categories[dir]++
		}

		// 可以添加更多解析逻辑来读取 severity、type 等

		return nil
	})

	return info, err
}

// ExtractEmbeddedTemplates 提取内嵌的模板到目标目录
func (tm *TemplateManager) ExtractEmbeddedTemplates() error {
	// 检查是否已经提取过
	if _, err := os.Stat(tm.templatesDir); err == nil {
		// 检查是否有模板文件
		files, _ := os.ReadDir(tm.templatesDir)
		if len(files) > 0 {
			return nil // 已经提取过
		}
	}

	// 创建目标目录
	if err := os.MkdirAll(tm.templatesDir, 0755); err != nil {
		return fmt.Errorf("failed to create templates directory: %w", err)
	}

	// 尝试从多个位置复制模板
	templateSources := []string{}

	// 1. 从项目根目录复制（开发环境，git submodule）
	templateSources = append(templateSources, filepath.Join(".", "nuclei-templates"))
	templateSources = append(templateSources, filepath.Join("..", "nuclei-templates"))

	// 2. 从应用资源目录复制（生产环境）
	templateSources = append(templateSources, filepath.Join(tm.templatesDir, "..", "nuclei-templates"))

	// 尝试所有可能的源
	for _, src := range templateSources {
		if src == "" {
			continue
		}
		// 规范化路径
		src = filepath.Clean(src)
		if _, err := os.Stat(src); err == nil {
			if err := copyDir(src, tm.templatesDir); err == nil {
				return nil
			}
		}
	}

	return fmt.Errorf("unable to find nuclei-templates in any location. Please run: git submodule update --init --recursive")
}

// ValidateTemplates 验证模板完整性
func (tm *TemplateManager) ValidateTemplates() ([]string, error) {
	var issues []string

	// 检查模板目录
	if _, err := os.Stat(tm.templatesDir); err != nil {
		return nil, fmt.Errorf("templates directory not found: %w", err)
	}

	// 检查是否有模板文件
	hasTemplates := false
	err := filepath.Walk(tm.templatesDir, func(path string, fileInfo os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !fileInfo.IsDir() && filepath.Ext(path) == ".yaml" {
			hasTemplates = true

			// 读取并验证 YAML 文件
			data, err := os.ReadFile(path)
			if err != nil {
				issues = append(issues, fmt.Sprintf("无法读取 %s: %v", path, err))
				return nil
			}

			// 基本验证：检查文件是否为空
			if len(data) == 0 {
				issues = append(issues, fmt.Sprintf("空模板文件: %s", path))
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	if !hasTemplates {
		issues = append(issues, "未找到任何模板文件")
	}

	return issues, nil
}

// GetTemplateList 获取模板列表（按分类）
func (tm *TemplateManager) GetTemplateList() (map[string][]string, error) {
	result := make(map[string][]string)

	err := filepath.Walk(tm.templatesDir, func(path string, fileInfo os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if fileInfo.IsDir() || filepath.Ext(path) != ".yaml" {
			return nil
		}

		// 获取相对路径用于分类
		relPath, _ := filepath.Rel(tm.templatesDir, path)
		dir := filepath.Dir(relPath)
		if dir == "." {
			dir = "root"
		}

		result[dir] = append(result[dir], relPath)

		return nil
	})

	return result, err
}
