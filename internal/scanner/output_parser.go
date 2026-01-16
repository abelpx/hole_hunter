package scanner

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
)

// NucleiOutput 表示 Nuclei 扫描器的 JSON 输出
type NucleiOutput struct {
	TemplateID   string                 `json:"template-id"`
	TemplatePath string                 `json:"template-path"`
	Info         map[string]interface{} `json:"info"`
	Severity     string                 `json:"severity"`
	Name         string                 `json:"name"`
	MatcherName  string                 `json:"matcher-name,omitempty"`
	Type         string                 `json:"type,omitempty"`
	Host         string                 `json:"host,omitempty"`
	Port         string                 `json:"port,omitempty"`
	Scheme       string                 `json:"scheme,omitempty"`
	URL          string                 `json:"url,omitempty"`
	MatchedAt    string                 `json:"matched-at,omitempty"`
	Extraction   []string               `json:"extraction,omitempty"`
	Request      string                 `json:"request,omitempty"`
	Response     string                 `json:"response,omitempty"`
	CURLCommand  string                 `json:"curl-command,omitempty"`
	Timestamp    time.Time              `json:"timestamp"`
}

// ScanProgress 表示扫描进度
type ScanProgress struct {
	TaskID          int    `json:"task_id"`
	Status          string `json:"status"`
	TotalTemplates  int    `json:"total_templates"`
	Executed        int    `json:"executed_templates"`
	Progress        int    `json:"progress"`
	CurrentTemplate string `json:"current_template"`
	VulnCount       int    `json:"vuln_count"`
	Error           string `json:"error,omitempty"`
}

// ParseScanJSONLine 解析 Nuclei JSON 输出的一行
func ParseScanJSONLine(line []byte) (*NucleiOutput, error) {
	var output NucleiOutput
	if err := json.Unmarshal(line, &output); err != nil {
		return nil, errors.Internal("failed to parse JSON", err)
	}
	return &output, nil
}

// ParseScanProgress 解析 Nuclei 进度输出
func ParseScanProgress(line string) (ScanProgress, bool) {
	// nuclei 的进度输出格式示例：
	// [INF] Current template: http/cves/2021/CVE-2021-XXXXX.yaml (0/12035)
	// [INF] [stats] requests: 123, findings: 5, rps: 10, duration: 12s

	// 尝试解析模板进度
	if strings.Contains(line, "Current template:") {
		return parseTemplateProgress(line)
	}

	// 尝试解析统计信息
	if strings.Contains(line, "[stats]") {
		return parseStatsProgress(line)
	}

	return ScanProgress{}, false
}

// parseTemplateProgress 解析模板进度行
func parseTemplateProgress(line string) (ScanProgress, bool) {
	parts := strings.Split(line, "(")
	if len(parts) != 2 {
		return ScanProgress{}, false
	}

	// 格式: (0/12035)
	progressStr := strings.TrimSuffix(parts[1], ")")
	progressParts := strings.Split(progressStr, "/")
	if len(progressParts) != 2 {
		return ScanProgress{}, false
	}

	var current, total int
	_, err1 := fmt.Sscanf(progressParts[0], "%d", &current)
	_, err2 := fmt.Sscanf(progressParts[1], "%d", &total)
	if err1 != nil || err2 != nil {
		return ScanProgress{}, false
	}

	// 防止除零
	if total <= 0 {
		return ScanProgress{}, false
	}

	// 提取模板名称
	templateName := strings.TrimSpace(strings.TrimPrefix(parts[0], "[INF] Current template:"))

	progress := int(float64(current) / float64(total) * 100)

	return ScanProgress{
		Status:          "running",
		Executed:        current,
		TotalTemplates:  total,
		Progress:        progress,
		CurrentTemplate: templateName,
	}, true
}

// parseStatsProgress 解析统计信息行
func parseStatsProgress(line string) (ScanProgress, bool) {
	// 提取发现数
	if !strings.Contains(line, "findings:") {
		return ScanProgress{}, false
	}

	parts := strings.Split(line, "findings:")
	if len(parts) != 2 {
		return ScanProgress{}, false
	}

	fields := strings.Fields(parts[1])
	if len(fields) == 0 {
		return ScanProgress{}, false
	}

	var findings int
	_, err := fmt.Sscanf(strings.TrimSpace(fields[0]), "%d", &findings)
	if err != nil {
		return ScanProgress{}, false
	}

	return ScanProgress{
		Status:    "running",
		VulnCount: findings,
	}, true
}

// OutputParser 解析 Nuclei 输出
type OutputParser struct {
	onVulnerability func(*NucleiOutput)
	onProgress      func(ScanProgress)
}

// NewOutputParser 创建输出解析器
func NewOutputParser(onVuln func(*NucleiOutput), onProgress func(ScanProgress)) *OutputParser {
	return &OutputParser{
		onVulnerability: onVuln,
		onProgress:      onProgress,
	}
}

// ParseStdout 解析标准输出（JSON 格式的漏洞结果）
func (p *OutputParser) ParseStdout(reader io.Reader) {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		line := scanner.Text()

		output, err := ParseScanJSONLine([]byte(line))
		if err != nil {
			continue
		}

		if p.onVulnerability != nil {
			p.onVulnerability(output)
		}
	}
}

// ParseStderr 解析标准错误输出（进度信息）
func (p *OutputParser) ParseStderr(reader io.Reader) {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		line := scanner.Text()

		progress, ok := ParseScanProgress(line)
		if ok && p.onProgress != nil {
			p.onProgress(progress)
		}
	}
}

// ParseOutput 从两个流解析输出
func (p *OutputParser) ParseOutput(stdout, stderr io.Reader) {
	go p.ParseStdout(stdout)
	go p.ParseStderr(stderr)
}

// CountVulnerabilities 计算漏洞数量
func CountVulnerabilities(outputs []NucleiOutput) map[string]int {
	counts := make(map[string]int)

	for _, output := range outputs {
		counts[output.Severity]++
	}

	return counts
}

// FilterBySeverity 按严重性过滤漏洞
func FilterBySeverity(outputs []NucleiOutput, severity string) []NucleiOutput {
	var filtered []NucleiOutput
	for _, output := range outputs {
		if strings.EqualFold(output.Severity, severity) {
			filtered = append(filtered, output)
		}
	}
	return filtered
}

// GetUniqueTemplates 获取唯一的模板列表
func GetUniqueTemplates(outputs []NucleiOutput) []string {
	seen := make(map[string]bool)
	var templates []string

	for _, output := range outputs {
		if !seen[output.TemplateID] {
			seen[output.TemplateID] = true
			templates = append(templates, output.TemplateID)
		}
	}

	return templates
}
