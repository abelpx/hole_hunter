package resources

import (
	"archive/zip"
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"

	"github.com/holehunter/holehunter/internal/infrastructure/logger"
)

const (
	// 资源版本，用于判断是否需要重新提取
	nucleiVersion     = "v1.0.0"
	templatesVersion  = "v1.0.0"
	extractedMarker   = ".extracted"
)

// Extractor 资源提取器
type Extractor struct {
	dataDir string
	logger  *logger.Logger
}

// NewExtractor 创建资源提取器
func NewExtractor(dataDir string, log *logger.Logger) *Extractor {
	return &Extractor{
		dataDir: dataDir,
		logger:  log,
	}
}

// ExtractNucleiBinary 提取 nuclei 二进制文件
func (e *Extractor) ExtractNucleiBinary(data []byte) error {
	if len(data) == 0 {
		return errors.New("nuclei binary data is empty")
	}

	// 检查是否已提取
	if e.isNucleiExtracted() {
		e.logger.Debug("Nuclei binary already extracted, skipping")
		return nil
	}

	e.logger.Info("Extracting nuclei binary...")

	// 确定输出文件名
	binaryName := "nuclei"
	if runtime.GOOS == "windows" {
		binaryName = "nuclei.exe"
	}
	destPath := filepath.Join(e.dataDir, binaryName)

	// 写入文件
	if err := os.WriteFile(destPath, data, 0755); err != nil {
		return fmt.Errorf("failed to write nuclei binary: %w", err)
	}

	// 写入版本标记
	if err := e.writeExtractedMarker(binaryName, nucleiVersion); err != nil {
		e.logger.Warn("Failed to write nuclei version marker: %v", err)
	}

	e.logger.Info("Nuclei binary extracted to: %s", destPath)
	return nil
}

// ExtractTemplatesFromZip 从 zip 数据解压模板
func (e *Extractor) ExtractTemplatesFromZip(zipData []byte) error {
	if len(zipData) == 0 {
		return errors.New("templates zip data is empty")
	}

	// 检查是否已提取
	if e.isTemplatesExtracted() {
		e.logger.Debug("Templates already extracted, skipping")
		return nil
	}

	e.logger.Info("Extracting templates from zip...")

	// 打开 zip
	reader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		return fmt.Errorf("failed to open zip: %w", err)
	}

	// 目标目录
	destDir := filepath.Join(e.dataDir, "nuclei-templates")

	// 解压每个文件
	for _, file := range reader.File {
		if err := e.extractZipFile(file, destDir); err != nil {
			return fmt.Errorf("failed to extract %s: %w", file.Name, err)
		}
	}

	// 写入版本标记
	if err := e.writeExtractedMarker("nuclei-templates", templatesVersion); err != nil {
		e.logger.Warn("Failed to write templates version marker: %v", err)
	}

	e.logger.Info("Templates extracted to: %s", destDir)
	return nil
}

// extractZipFile 解压单个 zip 文件
func (e *Extractor) extractZipFile(file *zip.File, destDir string) error {
	// 去掉 zip 中的 poc-templates/ 前缀
	fileName := file.Name
	if len(fileName) > len("poc-templates/") && fileName[:len("poc-templates/")] == "poc-templates/" {
		fileName = fileName[len("poc-templates/"):]
	}
	// 跳过 poc-templates 目录本身
	if fileName == "" || fileName == "poc-templates" {
		return nil
	}

	// 构建目标路径
	destPath := filepath.Join(destDir, fileName)

	// 确保目标路径在 destDir 内（防止 zip slip 攻击）
	if !filepath.IsLocal(fileName) || filepath.HasPrefix(fileName, "..") {
		return fmt.Errorf("invalid file path: %s", fileName)
	}

	// 创建目录
	if file.FileInfo().IsDir() {
		return os.MkdirAll(destPath, file.FileInfo().Mode())
	}

	// 确保父目录存在
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return err
	}

	// 打开文件
	rc, err := file.Open()
	if err != nil {
		return err
	}
	defer rc.Close()

	// 创建目标文件
	fw, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, file.FileInfo().Mode())
	if err != nil {
		return err
	}
	defer fw.Close()

	// 复制数据
	if _, err := io.Copy(fw, rc); err != nil {
		return err
	}

	return nil
}

// isNucleiExtracted 检查 nuclei 是否已提取
func (e *Extractor) isNucleiExtracted() bool {
	binaryName := "nuclei"
	if runtime.GOOS == "windows" {
		binaryName = "nuclei.exe"
	}

	// 检查二进制文件是否存在
	binaryPath := filepath.Join(e.dataDir, binaryName)
	if _, err := os.Stat(binaryPath); err != nil {
		return false
	}

	// 检查版本是否匹配
	return e.checkVersion(binaryName, nucleiVersion)
}

// isTemplatesExtracted 检查模板是否已提取
func (e *Extractor) isTemplatesExtracted() bool {
	// 检查目录是否存在
	templatesDir := filepath.Join(e.dataDir, "nuclei-templates")
	if _, err := os.Stat(templatesDir); err != nil {
		return false
	}

	// 检查是否有文件
	files, err := os.ReadDir(templatesDir)
	if err != nil || len(files) == 0 {
		return false
	}

	// 检查版本是否匹配
	return e.checkVersion("nuclei-templates", templatesVersion)
}

// checkVersion 检查版本是否匹配
func (e *Extractor) checkVersion(name, expectedVersion string) bool {
	markerPath := filepath.Join(e.dataDir, "."+name+"-version")

	data, err := os.ReadFile(markerPath)
	if err != nil {
		return false
	}

	return string(data) == expectedVersion
}

// writeExtractedMarker 写入提取标记
func (e *Extractor) writeExtractedMarker(name, version string) error {
	markerPath := filepath.Join(e.dataDir, "."+name+"-version")
	return os.WriteFile(markerPath, []byte(version), 0644)
}

// GetNucleiPath 获取 nuclei 二进制路径
func (e *Extractor) GetNucleiPath() string {
	binaryName := "nuclei"
	if runtime.GOOS == "windows" {
		binaryName = "nuclei.exe"
	}
	return filepath.Join(e.dataDir, binaryName)
}

// GetTemplatesPath 获取模板目录路径
func (e *Extractor) GetTemplatesPath() string {
	return filepath.Join(e.dataDir, "nuclei-templates")
}
