package nuclei

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
)

// BinaryInfo nuclei 二进制文件信息
type BinaryInfo struct {
	Version    string
	Platform   string
	Path       string
	Embedded   bool
	Executable bool
}

//go:generate go run scripts/download-nuclei-gen.go

// IsEmbeddedBinaryAvailable 检查是否有嵌入的 nuclei 二进制文件
func IsEmbeddedBinaryAvailable() bool {
	// 检查构建时是否嵌入了二进制文件
	// 这需要在编译时通过 go build 的 ldflags 设置
	return false
}

// ExtractBinary 提取嵌入的二进制文件到指定目录
func ExtractBinary(destDir string) (string, error) {
	// 确定平台
	platform := runtime.GOOS + "_" + runtime.GOARCH

	// 映射到 nuclei 的文件名格式
	var destFile string

	switch platform {
	case "darwin_arm64", "darwin_amd64":
		destFile = filepath.Join(destDir, "nuclei")
	case "linux_arm64", "linux_amd64":
		destFile = filepath.Join(destDir, "nuclei")
	case "windows_amd64":
		destFile = filepath.Join(destDir, "nuclei.exe")
	default:
		return "", fmt.Errorf("unsupported platform: %s", platform)
	}

	// 检查是否已经存在
	if _, err := os.Stat(destFile); err == nil {
		return destFile, nil
	}

	// 尝试从 build/binaries 目录复制
	srcPath := filepath.Join("build", "binaries", "nuclei")
	if runtime.GOOS == "windows" {
		srcPath += ".exe"
	}

	// 检查源文件是否存在
	if _, err := os.Stat(srcPath); err != nil {
		return "", fmt.Errorf("nuclei binary not found in build/binaries. Please run 'make nuclei-download' first")
	}

	// 复制文件
	srcFile, err := os.Open(srcPath)
	if err != nil {
		return "", fmt.Errorf("failed to open source nuclei binary: %w", err)
	}
	defer srcFile.Close()

	// 创建目标文件
	dstFile, err := os.Create(destFile)
	if err != nil {
		return "", fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dstFile.Close()

	// 复制文件
	if _, err := io.Copy(dstFile, srcFile); err != nil {
		return "", fmt.Errorf("failed to copy nuclei binary: %w", err)
	}

	// 设置可执行权限
	if err := dstFile.Chmod(0755); err != nil {
		return "", fmt.Errorf("failed to set executable permission: %w", err)
	}

	return destFile, nil
}

// GetBinaryInfo 获取 nuclei 二进制文件信息
func GetBinaryInfo() (*BinaryInfo, error) {
	info := &BinaryInfo{
		Version:  "v3.3.5",
		Platform: runtime.GOOS + "_" + runtime.GOARCH,
		Embedded: IsEmbeddedBinaryAvailable(),
	}

	return info, nil
}

// EnsureBinary 确保 nuclei 二进制文件存在并返回其路径
func EnsureBinary(userDataDir string) (string, error) {
	// 首先检查用户数据目录
	binaryPath := filepath.Join(userDataDir, "nuclei")
	if runtime.GOOS == "windows" {
		binaryPath += ".exe"
	}

	// 如果已存在，直接返回
	if _, err := os.Stat(binaryPath); err == nil {
		return binaryPath, nil
	}

	// 尝试从 build/binaries 目录复制
	extractedPath, err := ExtractBinary(userDataDir)
	if err != nil {
		return "", fmt.Errorf("failed to extract nuclei binary: %w", err)
	}

	return extractedPath, nil
}
