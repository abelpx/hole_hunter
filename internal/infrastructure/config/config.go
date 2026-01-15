package config

import (
	"os"
	"path/filepath"
	"runtime"
)

// Config 应用配置
type Config struct {
	// 应用配置
	AppName string
	Version string
	DataDir string
	Debug   bool

	// 数据库配置
	DBPath string

	// 扫描器配置
	NucleiPath         string
	TemplatesDir       string
	CustomTemplatesDir string
	MaxConcurrent      int
	ScanTimeout        int // 秒

	// 日志配置
	LogLevel string
	LogFile  string
}

// Load 加载配置
func Load() *Config {
	dataDir := getUserDataDir()

	// 模板目录：优先使用应用包内的模板，如果不存在则使用用户数据目录
	templatesDir := getTemplatesDir(dataDir)

	return &Config{
		AppName: "HoleHunter",
		Version: "1.0.0",
		DataDir: dataDir,
		Debug:   os.Getenv("DEBUG") == "true" || os.Getenv("ENV") == "dev",

		DBPath: filepath.Join(dataDir, "holehunter.db"),

		NucleiPath:         getNucleiPath(),
		TemplatesDir:       templatesDir,
		CustomTemplatesDir: filepath.Join(dataDir, "custom-templates"),
		MaxConcurrent:      3,
		ScanTimeout:        300, // 5 分钟

		LogLevel: getLogLevel(),
		LogFile:  filepath.Join(dataDir, "app.log"),
	}
}

func getUserDataDir() string {
	// 优先使用环境变量
	if dir := os.Getenv("HH_DATA_DIR"); dir != "" {
		return dir
	}

	var baseDir string
	switch runtime.GOOS {
	case "darwin":
		homeDir, _ := os.UserHomeDir()
		baseDir = filepath.Join(homeDir, "Library", "Application Support")
	case "windows":
		baseDir = os.Getenv("LOCALAPPDATA")
		if baseDir == "" {
			baseDir = filepath.Join(os.Getenv("APPDATA"), "HoleHunter")
		}
	default: // linux
		homeDir, _ := os.UserHomeDir()
		baseDir = filepath.Join(homeDir, ".config")
	}

	return filepath.Join(baseDir, "HoleHunter")
}

func getNucleiPath() string {
	// 优先使用环境变量指定的路径
	if path := os.Getenv("NUCLEI_PATH"); path != "" {
		return path
	}

	// 开发环境可能使用本地 nuclei
	if _, err := os.Stat("./nuclei"); err == nil {
		return "./nuclei"
	}

	// 生产环境使用应用包内的 nuclei
	if exePath, err := os.Executable(); err == nil {
		appDir := filepath.Dir(exePath)
		nucleiPath := filepath.Join(appDir, "nuclei")
		if _, err := os.Stat(nucleiPath); err == nil {
			return nucleiPath
		}
	}

	return "nuclei"
}

func getTemplatesDir(dataDir string) string {
	// 1. 优先使用应用包内的模板目录（生产环境）
	if exePath, err := os.Executable(); err == nil {
		appDir := filepath.Dir(exePath)
		bundledTemplates := filepath.Join(appDir, "nuclei-templates")
		if _, err := os.Stat(bundledTemplates); err == nil {
			return bundledTemplates
		}
	}

	// 2. 使用用户数据目录的模板
	userTemplates := filepath.Join(dataDir, "nuclei-templates")
	if _, err := os.Stat(userTemplates); err == nil {
		return userTemplates
	}

	// 3. 创建用户数据目录的模板目录
	if err := os.MkdirAll(userTemplates, 0755); err != nil {
		// 如果创建失败，仍然返回路径，让调用方决定如何处理
	}
	return userTemplates
}

func getLogLevel() string {
	if level := os.Getenv("LOG_LEVEL"); level != "" {
		return level
	}

	if os.Getenv("ENV") == "dev" || os.Getenv("DEBUG") == "true" {
		return "debug"
	}

	return "info"
}
