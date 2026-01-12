package offline

import (
	"embed"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
)

//go:embed nuclei-templates/*
var templatesFS embed.FS

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

	// 优先从应用资源目录复制完整模板
	resourceDir, err := s.getResourceDir()
	if err == nil {
		templatesSrc := filepath.Join(resourceDir, "nuclei-templates")
		if _, err := os.Stat(templatesSrc); err == nil {
			// 复制模板目录
			if err := copyDir(templatesSrc, s.templatesDir); err == nil {
				return nil
			}
		}
	}

	// Fallback: 从 embed.FS 提取基础模板
	return extractEmbedFS(templatesFS, s.templatesDir, "nuclei-templates")
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
	// 1. 检查应用可执行文件所在目录（优先级最高）
	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		candidatePaths := []string{
			filepath.Join(exeDir, "nuclei"),
			filepath.Join(exeDir, "..", "Resources", "nuclei"),
			filepath.Join(exeDir, "..", "MacOS", "nuclei"),
		}
		for _, path := range candidatePaths {
			if _, err := os.Stat(path); err == nil {
				return filepath.Dir(path), nil
			}
		}
	}

	// 2. 开发模式：项目目录
	possibleDirs := []string{
		filepath.Join(".", "build", "binaries"),
		filepath.Join(".", "resources"),
		filepath.Join(".", "build", "nuclei-binaries", s.platform),
	}

	for _, dir := range possibleDirs {
		if _, err := os.Stat(dir); err == nil {
			return dir, nil
		}
	}

	// 3. 用户数据目录的父级（macOS .app 结构）
	if _, err := os.Stat(filepath.Join(s.userDataDir, "..", "Resources", "nuclei")); err == nil {
		return filepath.Join(s.userDataDir, "..", "Resources"), nil
	}

	return "", fmt.Errorf("nuclei not found in any resource directory")
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

// extractEmbedFS 从 embed.FS 提取文件到目标目录
func extractEmbedFS(embedFS embed.FS, destDir, prefix string) error {
	return fs.WalkDir(embedFS, prefix, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// 跳过根目录
		if path == prefix {
			return nil
		}

		// 计算相对路径
		relPath := path
		if len(path) > len(prefix) {
			relPath = path[len(prefix)+1:]
		}

		// 构建目标路径
		destPath := filepath.Join(destDir, relPath)

		if d.IsDir() {
			return os.MkdirAll(destPath, 0755)
		}

		// 读取文件内容
		data, err := embedFS.ReadFile(path)
		if err != nil {
			return err
		}

		// 写入文件
		return os.WriteFile(destPath, data, 0644)
	})
}
