package scanner

import (
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
)

// NucleiClient Nuclei 客户端
type NucleiClient struct {
	binaryPath   string
	templatesDir string
}

// NewNucleiClient 创建 Nuclei 客户端
func NewNucleiClient(userDataDir string) *NucleiClient {
	return &NucleiClient{
		binaryPath:   findNucleiBinaryInDir(userDataDir),
		templatesDir: filepath.Join(userDataDir, "nuclei-templates"),
	}
}

// NewNucleiClientWithTemplates 创建 Nuclei 客户端（指定模板目录）
func NewNucleiClientWithTemplates(userDataDir, templatesDir string) *NucleiClient {
	// 确定 binary 路径 - 优先从用户数据目录查找
	binaryPath := findNucleiBinaryInDir(userDataDir)

	// 确定 templates 路径
	templatePath := templatesDir
	if templatePath == "" {
		templatePath = filepath.Join(userDataDir, "nuclei-templates")
	}

	return &NucleiClient{
		binaryPath:   binaryPath,
		templatesDir: templatePath,
	}
}

// IsAvailable 检查 Nuclei 是否可用
func (n *NucleiClient) IsAvailable() bool {
	if n.binaryPath == "" {
		return false
	}
	if _, err := os.Stat(n.binaryPath); err != nil {
		return false
	}
	return true
}

// GetBinary 获取二进制路径
func (n *NucleiClient) GetBinary() string {
	return n.binaryPath
}

// GetVersion 获取版本
func (n *NucleiClient) GetVersion() string {
	if !n.IsAvailable() {
		return ""
	}

	cmd := exec.Command(n.binaryPath, "-version")
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}

	return strings.TrimSpace(string(output))
}

// BuildCommand 构建扫描命令
func (n *NucleiClient) BuildCommand(targetURL, strategy string, templates []string, customDir string) (*exec.Cmd, error) {
	if !n.IsAvailable() {
		return nil, errors.Internal("nuclei binary not found", nil)
	}

	args := n.buildArgs(targetURL, strategy, templates, customDir)
	cmd := exec.Command(n.binaryPath, args...)
	return cmd, nil
}

// buildArgs 构建命令参数
func (n *NucleiClient) buildArgs(targetURL, strategy string, templates []string, customDir string) []string {
	args := []string{
		"-u", targetURL,
		"-json",
		"-silent",
		"-no-color",
	}

	// 添加模板目录
	if n.templatesDir != "" {
		args = append(args, "-t", n.templatesDir)
	}

	// 添加自定义模板目录
	hasCustomTemplates := n.hasCustomTemplates(customDir)
	if hasCustomTemplates {
		args = append(args, "-t", customDir)
	}

	// 根据策略添加参数
	switch strategy {
	case "quick":
		args = append(args, "-severity", "critical,high,medium")
	case "deep":
		// 使用所有模板
	case "passive":
		args = append(args, "-passive")
	default:
		// 使用指定的模板
		if len(templates) > 0 {
			for _, template := range templates {
				if !isValidTemplateID(template) {
					continue
				}
				args = append(args, "-id", template)
			}
		}
	}

	return args
}

// isValidTemplateID 验证模板 ID 是否有效
// 只允许字母、数字、下划线、短横线和斜杠（用于分类）
func isValidTemplateID(id string) bool {
	if id == "" {
		return false
	}
	// 模板 ID 格式：cve/2021/CVE-2021-xxx 或技术分类/名称
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9_\-/]+$`, id)
	return matched
}

// hasCustomTemplates 检查是否有自定义模板
func (n *NucleiClient) hasCustomTemplates(customDir string) bool {
	if customDir == "" {
		return false
	}
	if _, err := os.Stat(customDir); os.IsNotExist(err) {
		return false
	}

	// 检查是否有 .yaml 文件
	files, err := filepath.Glob(filepath.Join(customDir, "*.yaml"))
	return err == nil && len(files) > 0
}

// findNucleiBinary 查找 Nuclei 二进制文件
func findNucleiBinary() string {
	return findNucleiBinaryInDir("")
}

// findNucleiBinaryInDir 在指定目录查找 Nuclei 二进制文件
func findNucleiBinaryInDir(userDataDir string) string {
	// 1. 优先查找用户数据目录（嵌入资源提取位置）
	if userDataDir != "" {
		binaryName := "nuclei"
		if runtime.GOOS == "windows" {
			binaryName = "nuclei.exe"
		}
		userNucleiPath := filepath.Join(userDataDir, binaryName)
		if _, err := os.Stat(userNucleiPath); err == nil {
			return userNucleiPath
		}
	}

	// 2. 优先使用环境变量指定的路径
	if path := os.Getenv("NUCLEI_PATH"); path != "" {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}

	// 3. 开发环境：检查项目根目录
	if _, err := os.Stat("./nuclei"); err == nil {
		return "./nuclei"
	}
	if runtime.GOOS == "windows" {
		if _, err := os.Stat("./nuclei.exe"); err == nil {
			return "./nuclei.exe"
		}
	}

	// 4. 开发环境：检查 build/bin 目录
	buildBinPath := filepath.Join("build", "bin", "nuclei")
	if runtime.GOOS == "windows" {
		buildBinPath += ".exe"
	}
	if _, err := os.Stat(buildBinPath); err == nil {
		return buildBinPath
	}

	// 5. 生产环境使用应用包内的 nuclei
	if exePath, err := os.Executable(); err == nil {
		appDir := filepath.Dir(exePath)
		nucleiPath := filepath.Join(appDir, "nuclei")
		if runtime.GOOS == "windows" {
			nucleiPath += ".exe"
		}
		if _, err := os.Stat(nucleiPath); err == nil {
			return nucleiPath
		}
	}

	// 6. 根据操作系统查找
	paths := []string{
		"nuclei",
		"/usr/local/bin/nuclei",
	}

	homeDir, _ := os.UserHomeDir()
	if homeDir != "" {
		paths = append(paths,
			filepath.Join(homeDir, "nuclei"),
			filepath.Join(homeDir, ".local", "bin", "nuclei"),
			filepath.Join(homeDir, "go", "bin", "nuclei"),
		)
	}

	if runtime.GOOS == "darwin" {
		paths = append(paths, "/opt/homebrew/bin/nuclei")
	}

	for _, path := range paths {
		if path != "" {
			if _, err := os.Stat(path); err == nil {
				return path
			}
		}
	}

	return ""
}
