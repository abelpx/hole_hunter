package assets

import (
	_ "embed"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/holehunter/holehunter/internal/infrastructure/logger"
)

//go:embed nuclei.exe
var embeddedNuclei []byte

// InitResources 初始化资源（应用启动时调用）
// 1. 解压 nuclei.exe 到用户目录
// 2. 检查/下载 nuclei-templates
func InitResources(dataDir string, log *logger.Logger) error {
	return initResourcesInternal(dataDir, log)
}

func initResourcesInternal(dataDir string, log *logger.Logger) error {
	log.Info("Initializing HoleHunter resources...")
	start := time.Now()

	// 1. 解压 nuclei.exe
	nucleiPath := filepath.Join(dataDir, "nuclei")
	if runtime.GOOS == "windows" {
		nucleiPath += ".exe"
	}

	if _, err := os.Stat(nucleiPath); os.IsNotExist(err) {
		log.Info("Extracting nuclei.exe to %s", dataDir)
		if err := os.WriteFile(nucleiPath, embeddedNuclei, 0755); err != nil {
			log.Error("Failed to extract nuclei.exe: %v", err)
			return err
		}
		log.Info("  ✓ nuclei.exe ready")
	} else {
		log.Info("  ✓ nuclei.exe already exists")
	}

	// 2. 检查模板
	templatesDir := filepath.Join(dataDir, "nuclei-templates")
	templateCount := 0

	files, _ := filepath.Glob(filepath.Join(templatesDir, "*.yaml"))
	templateCount = len(files)

	if templateCount == 0 {
		log.Warn("No templates found. Downloading nuclei-templates...")
		log.Info("  This will take 5-10 minutes on first run...")

		// 自动下载模板
		if err := downloadTemplates(nucleiPath, templatesDir, log); err != nil {
			log.Warn("Failed to download templates automatically")
			log.Info("")
			log.Info("============================================")
			log.Info(" 首次运行需要下载模板")
			log.Info("============================================")
			log.Info("")
			log.Info("方法 1 - 自动下载（推荐）:")
			log.Info("  1. 确保网络连接正常")
			log.Info("  2. 点击应用内「设置」→「更新模板」")
			log.Info("")
			log.Info("方法 2 - 离线安装:")
			log.Info("  1. 访问 https://github.com/projectdiscovery/nuclei-templates")
			log.Info("  2. 下载 nuclei-templates-latest.zip")
			log.Info("  3. 解压到: %s", templatesDir)
			log.Info("============================================")
			log.Info("")
			log.Info("应用将继续启动，但扫描功能需要模板后可用。")
		}
	} else {
		log.Info("  ✓ Templates ready (%d files)", templateCount)
	}

	duration := time.Since(start)
	log.Info("Resource initialization completed in %s", duration)
	return nil
}

// downloadTemplates 下载 nuclei-templates
func downloadTemplates(nucleiPath, templatesDir string, log *logger.Logger) error {
	// 创建模板目录
	if err := os.MkdirAll(templatesDir, 0755); err != nil {
		return err
	}

	// 执行 nuclei -update-templates
	cmd := exec.Command(nucleiPath, "-update-templates", "-silent")
	cmd.Env = append(cmd.Env, "NUCLEI_TEMPLATES_DIR="+templatesDir)

	start := time.Now()
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Error("Download failed: %s", string(output))
		return err
	}

	// 统计下载的文件数
	yamlCount := 0
	filepath.Walk(templatesDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return err
		}
		if filepath.Ext(path) == ".yaml" {
			yamlCount++
		}
		return nil
	})

	duration := time.Since(start)
	log.Info("  ✓ Downloaded %d template files in %s", yamlCount, duration)
	return nil
}

// IsNucleiReady 检查 nuclei 是否就绪
func IsNucleiReady(dataDir string) bool {
	nucleiPath := filepath.Join(dataDir, "nuclei")
	if runtime.GOOS == "windows" {
		nucleiPath += ".exe"
	}
	_, err := os.Stat(nucleiPath)
	return err == nil
}

// AreTemplatesReady 检查模板是否就绪
func AreTemplatesReady(dataDir string) bool {
	templatesDir := filepath.Join(dataDir, "nuclei-templates")
	files, _ := filepath.Glob(filepath.Join(templatesDir, "*.yaml"))
	return len(files) > 100 // 至少有一些模板
}

// GetResourceStatus 获取资源状态信息
func GetResourceStatus(dataDir string) map[string]interface{} {
	nucleiPath := filepath.Join(dataDir, "nuclei")
	if runtime.GOOS == "windows" {
		nucleiPath += ".exe"
	}
	templatesDir := filepath.Join(dataDir, "nuclei-templates")

	nucleiReady := false
	templatesReady := false
	templateCount := 0

	if _, err := os.Stat(nucleiPath); err == nil {
		nucleiReady = true
	}

	if files, err := filepath.Glob(filepath.Join(templatesDir, "*.yaml")); err == nil {
		templateCount = len(files)
		templatesReady = templateCount > 100
	}

	return map[string]interface{}{
		"nuclei_ready":    nucleiReady,
		"templates_ready":  templatesReady,
		"template_count":   templateCount,
		"nuclei_path":     nucleiPath,
		"templates_dir":   templatesDir,
	}
}
