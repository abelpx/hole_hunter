package offline

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
)

// OfflineScanner 离线扫描器
type OfflineScanner struct {
	userDataDir    string
	templatesDir   string
	nucleiBinary   string
	platform       string
	isOfflineMode  bool
}

// NewOfflineScanner 创建离线扫描器
func NewOfflineScanner(userDataDir string) *OfflineScanner {
	platform := runtime.GOOS + "_" + runtime.GOARCH
	return &OfflineScanner{
		userDataDir:   userDataDir,
		templatesDir:  filepath.Join(userDataDir, "nuclei-templates"),
		platform:      platform,
		isOfflineMode: true,
	}
}

// Setup 设置离线扫描环境
func (s *OfflineScanner) Setup() error {
	// 1. 确保 nuclei 二进制文件存在
	if err := s.ensureNucleiBinary(); err != nil {
		return fmt.Errorf("failed to setup nuclei binary: %w", err)
	}

	// 2. 提取内嵌的模板
	if err := s.extractEmbeddedTemplates(); err != nil {
		return fmt.Errorf("failed to extract templates: %w", err)
	}

	// 3. 创建配置文件
	if err := s.createNucleiConfig(); err != nil {
		return fmt.Errorf("failed to create config: %w", err)
	}

	return nil
}

// ensureNucleiBinary 确保 nuclei 二进制文件存在
func (s *OfflineScanner) ensureNucleiBinary() error {
	// 检查用户目录中是否已有 nuclei
	nucleiPath := filepath.Join(s.userDataDir, "nuclei")
	if runtime.GOOS == "windows" {
		nucleiPath += ".exe"
	}

	if _, err := os.Stat(nucleiPath); err == nil {
		s.nucleiBinary = nucleiPath
		return nil
	}

	// 从应用的资源目录复制
	resourceDir, err := s.getResourceDir()
	if err != nil {
		return fmt.Errorf("failed to get resource directory: %w", err)
	}

	srcBinary := filepath.Join(resourceDir, "nuclei")
	if runtime.GOOS == "windows" {
		srcBinary += ".exe"
	}

	// 检查源文件是否存在
	if _, err := os.Stat(srcBinary); err != nil {
		return fmt.Errorf("nuclei binary not found in resources: %s", srcBinary)
	}

	// 复制二进制文件
	if err := copyFile(srcBinary, nucleiPath); err != nil {
		return fmt.Errorf("failed to copy nuclei binary: %w", err)
	}

	// 设置可执行权限
	if err := os.Chmod(nucleiPath, 0755); err != nil {
		return fmt.Errorf("failed to set executable permission: %w", err)
	}

	s.nucleiBinary = nucleiPath
	return nil
}

// extractEmbeddedTemplates 提取内嵌的模板
func (s *OfflineScanner) extractEmbeddedTemplates() error {
	// 检查模板目录是否已存在
	if _, err := os.Stat(s.templatesDir); err == nil {
		// 模板已存在
		return nil
	}

	// 创建模板目录
	if err := os.MkdirAll(s.templatesDir, 0755); err != nil {
		return fmt.Errorf("failed to create templates directory: %w", err)
	}

	// 尝试从多个位置复制模板
	templateSources := []string{}

	// 1. 从应用资源目录复制（生产环境）
	resourceDir, err := s.getResourceDir()
	if err == nil {
		templatesSrc := filepath.Join(resourceDir, "nuclei-templates")
		templateSources = append(templateSources, templatesSrc)
	}

	// 2. 从项目根目录复制（开发环境，git submodule）
	templateSources = append(templateSources, filepath.Join(".", "nuclei-templates"))
	templateSources = append(templateSources, filepath.Join("..", "nuclei-templates"))

	// 3. 尝试从用户数据目录的父级复制（macOS .app 结构）
	templateSources = append(templateSources, filepath.Join(s.userDataDir, "..", "nuclei-templates"))

	// 尝试所有可能的源
	for _, src := range templateSources {
		if src == "" {
			continue
		}
		// 规范化路径
		src = filepath.Clean(src)
		if _, err := os.Stat(src); err == nil {
			if err := copyDir(src, s.templatesDir); err == nil {
				return nil
			}
		}
	}

	return fmt.Errorf("unable to find nuclei-templates in any location. Please run: git submodule update --init --recursive")
}

// createNucleiConfig 创建 nuclei 配置文件
func (s *OfflineScanner) createNucleiConfig() error {
	configPath := filepath.Join(s.userDataDir, "nuclei-config.yaml")

	// 检查配置是否已存在
	if _, err := os.Stat(configPath); err == nil {
		return nil
	}

	config := fmt.Sprintf(`
# HoleHunter Nuclei Configuration (Offline Mode)
# Auto-generated - Do not edit manually

# Disable version check
disable-update-check: true

# Template directory
templates-directory: %s

# Disable analytics
disable-splash: true
analytics: false

# Offline mode settings
no-color: true
json: true
silent: true

# Timeout settings
timeout: 10
rate-limit: 150

# Concurrency
concurrency: 25

# Retries
retries: 1
`, s.templatesDir)

	return os.WriteFile(configPath, []byte(config), 0644)
}

// GetNucleiBinary 返回 nuclei 二进制文件路径
func (s *OfflineScanner) GetNucleiBinary() string {
	return s.nucleiBinary
}

// GetTemplatesDir 返回模板目录路径
func (s *OfflineScanner) GetTemplatesDir() string {
	return s.templatesDir
}

// GetConfigPath 返回配置文件路径
func (s *OfflineScanner) GetConfigPath() string {
	return filepath.Join(s.userDataDir, "nuclei-config.yaml")
}

// IsReady 检查离线扫描器是否准备就绪
func (s *OfflineScanner) IsReady() bool {
	if s.nucleiBinary == "" {
		return false
	}
	if _, err := os.Stat(s.nucleiBinary); err != nil {
		return false
	}
	if _, err := os.Stat(s.templatesDir); err != nil {
		return false
	}
	return true
}

// GetTemplateStats 获取模板统计信息
func (s *OfflineScanner) GetTemplateStats() (map[string]int, error) {
	stats := make(map[string]int)

	// 统计模板目录中的文件数量
	err := filepath.Walk(s.templatesDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && filepath.Ext(path) == ".yaml" {
			stats["total"]++
			// 可以添加更多统计信息
		}
		return nil
	})

	return stats, err
}

// getResourceDir 获取应用资源目录
func (s *OfflineScanner) getResourceDir() (string, error) {
	// 1. 检查应用可执行文件所在目录（生产环境）
	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		candidatePaths := []string{
			// Windows/Linux: 直接在可执行文件旁边
			filepath.Join(exeDir, "nuclei-templates"),
			// macOS .app 结构
			filepath.Join(exeDir, "..", "Resources", "nuclei-templates"),
			filepath.Join(exeDir, "..", "..", "Resources", "nuclei-templates"),
			// 开发环境
			filepath.Join(exeDir, "..", "..", "build", "nuclei-templates"),
			filepath.Join(exeDir, "..", "..", "..", "build", "nuclei-templates"),
		}
		for _, path := range candidatePaths {
			normalizedPath := filepath.Clean(path)
			if info, err := os.Stat(normalizedPath); err == nil && info.IsDir() {
				// 检查目录是否包含 yaml 文件（确认为模板目录）
				yamlExists := false
				filepath.Walk(normalizedPath, func(subPath string, info os.FileInfo, err error) error {
					if !yamlExists && !info.IsDir() && filepath.Ext(subPath) == ".yaml" {
						yamlExists = true
					}
					return nil
				})
				if yamlExists {
					return normalizedPath, nil
				}
			}
		}
	}

	// 2. 开发模式：项目 build 目录
	possibleDirs := []string{
		filepath.Join(".", "build", "nuclei-templates"),
		filepath.Join(".", "nuclei-templates"),
		filepath.Join("..", "nuclei-templates"),
	}

	for _, dir := range possibleDirs {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			// 检查是否包含 yaml 文件
			yamlExists := false
			filepath.Walk(dir, func(subPath string, info os.FileInfo, err error) error {
				if !yamlExists && !info.IsDir() && filepath.Ext(subPath) == ".yaml" {
					yamlExists = true
				}
				return nil
			})
			if yamlExists {
				return dir, nil
			}
		}
	}

	return "", fmt.Errorf("nuclei templates not found in any resource directory")
}

// copyFile 复制文件
func copyFile(src, dst string) error {
	source, err := os.Open(src)
	if err != nil {
		return err
	}
	defer source.Close()

	destination, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destination.Close()

	_, err = io.Copy(destination, source)
	return err
}

// copyDir 递归复制目录
func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 计算相对路径
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}

		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(dstPath, info.Mode())
		}

		// 复制文件
		return copyFile(path, dstPath)
	})
}
