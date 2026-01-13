package parser

import (
	"strings"
	"testing"
)

// TestParseDescription 测试 description 字段解析
func TestParseDescription(t *testing.T) {
	tests := []struct {
		name     string
		yaml     string
		expected string
	}{
		{
			name: "多行 description 使用 | 符号",
			yaml: `info:
  name: Test Template
  severity: high
  description: |
    This is a multi-line description
    that spans multiple lines
    and should be combined.
  tags: test,parser`,
			expected: "This is a multi-line description that spans multiple lines and should be combined.",
		},
		{
			name: "单行 description",
			yaml: `info:
  name: Test Template
  description: Single line description
  tags: test`,
			expected: "Single line description",
		},
		{
			name: "带引号的单行 description",
			yaml: `info:
  name: Test Template
  description: "Quoted description"
  tags: test`,
			expected: "Quoted description",
		},
		{
			name: "description 后面跟着其他字段",
			yaml: `info:
  name: Test Template
  description: |
    First line
    Second line
  impact: |
    Impact content
  tags: test`,
			expected: "First line Second line",
		},
		{
			name: "空 description",
			yaml: `info:
  name: Test Template
  severity: high`,
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractDescription(tt.yaml)
			if result != tt.expected {
				t.Errorf("extractDescription() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestParseSeverity 测试 severity 字段解析
func TestParseSeverity(t *testing.T) {
	tests := []struct {
		name     string
		yaml     string
		expected string
	}{
		{
			name: "标准 severity 值",
			yaml: `info:
  name: Test Template
  severity: high
  author: test`,
			expected: "high",
		},
		{
			name: "critical severity",
			yaml: `info:
  name: Test Template
  severity: critical`,
			expected: "critical",
		},
		{
			name: "info severity",
			yaml: `info:
  name: Test Template
  severity: info`,
			expected: "info",
		},
		{
			name: "带空格的 severity",
			yaml: `info:
  name: Test Template
  severity:  high  `,
			expected: "high",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractSeverity(tt.yaml)
			if result != tt.expected {
				t.Errorf("extractSeverity() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestParseTags 测试 tags 字段解析
func TestParseTags(t *testing.T) {
	tests := []struct {
		name     string
		yaml     string
		expected []string
	}{
		{
			name: "逗号分隔的 tags",
			yaml: `info:
  name: Test Template
  tags: cloud,devops,aws,amazon`,
			expected: []string{"cloud", "devops", "aws", "amazon"},
		},
		{
			name: "带空格的逗号分隔 tags",
			yaml: `info:
  name: Test Template
  tags: cloud, devops, aws, amazon`,
			expected: []string{"cloud", "devops", "aws", "amazon"},
		},
		{
			name: "多行 YAML 列表格式 tags",
			yaml: `info:
  name: Test Template
  tags:
    - cloud
    - devops
    - aws`,
			expected: []string{"cloud", "devops", "aws"},
		},
		{
			name: "单 tag",
			yaml: `info:
  name: Test Template
  tags: single`,
			expected: []string{"single"},
		},
		{
			name: "tags 后面跟着 reference 字段",
			yaml: `info:
  name: Test Template
  tags: cloud,devops,aws
  reference:
    - https://example.com`,
			expected: []string{"cloud", "devops", "aws"},
		},
		{
			name: "空 tags",
			yaml: `info:
  name: Test Template
  severity: high`,
			expected: []string(nil),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractTags(tt.yaml)
			if !equalStringSlices(result, tt.expected) {
				t.Errorf("extractTags() = %v, want %v", result, tt.expected)
			}
		})
	}
}

// TestParseImpact 测试 impact 字段解析
func TestParseImpact(t *testing.T) {
	tests := []struct {
		name     string
		yaml     string
		expected string
	}{
		{
			name: "多行 impact 使用 | 符号",
			yaml: `info:
  name: Test Template
  impact: |
    This is the impact
    spanning multiple lines
  remediation: Fix it`,
			expected: "This is the impact spanning multiple lines",
		},
		{
			name: "单行 impact",
			yaml: `info:
  name: Test Template
  impact: Single line impact
  remediation: Fix it`,
			expected: "Single line impact",
		},
		{
			name: "空 impact",
			yaml: `info:
  name: Test Template
  severity: high`,
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractImpact(tt.yaml)
			if result != tt.expected {
				t.Errorf("extractImpact() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestParseRemediation 测试 remediation 字段解析
func TestParseRemediation(t *testing.T) {
	tests := []struct {
		name     string
		yaml     string
		expected string
	}{
		{
			name: "多行 remediation 使用 | 符号",
			yaml: `info:
  name: Test Template
  remediation: |
    This is the remediation
    with multiple steps
    to fix the issue.
  tags: test`,
			expected: "This is the remediation with multiple steps to fix the issue.",
		},
		{
			name: "单行 remediation",
			yaml: `info:
  name: Test Template
  remediation: Fix the issue
  tags: test`,
			expected: "Fix the issue",
		},
		{
			name: "空 remediation",
			yaml: `info:
  name: Test Template
  severity: high`,
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractRemediation(tt.yaml)
			if result != tt.expected {
				t.Errorf("extractRemediation() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestParseAuthor 测试 author 字段解析
func TestParseAuthor(t *testing.T) {
	tests := []struct {
		name     string
		yaml     string
		expected string
	}{
		{
			name: "单个作者",
			yaml: `info:
  name: Test Template
  author: john
  severity: high`,
			expected: "john",
		},
		{
			name: "多个作者用逗号分隔",
			yaml: `info:
  name: Test Template
  author: john,jane,bob
  severity: high`,
			expected: "john,jane,bob",
		},
		{
			name: "长作者名应该被截断",
			yaml: `info:
  name: Test Template
  author: very-long-author-name-that-exceeds-thirty-characters-limit
  severity: high`,
			expected: "very-long-author-name-that-exc...",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractAuthor(tt.yaml)
			if result != tt.expected {
				t.Errorf("extractAuthor() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestRealACMTemplate 测试真实的 ACM 模板
func TestRealACMTemplate(t *testing.T) {
	yamlContent := `id: acm-cert-expired

info:
  name: Expired ACM Certificates
  author: princechaddha
  severity: high
  description: |
    Ensure removal of expired SSL/TLS certificates in AWS Certificate Manager to comply with Amazon Security Best Practices.
  impact: |
    Expired certificates can lead to service interruptions and expose applications to man-in-the-middle attacks.
  remediation: |
    Regularly review ACM for expired certificates and delete them or replace with updated versions.
  reference:
    - https://docs.aws.amazon.com/acm/latest/userguide/acm-certificate.html
  tags: cloud,devops,aws,amazon,acm,aws-cloud-config

# Digest: xxx
`

	// 测试 description
	desc := extractDescription(yamlContent)
	expectedDesc := "Ensure removal of expired SSL/TLS certificates in AWS Certificate Manager to comply with Amazon Security Best Practices."
	if desc != expectedDesc {
		t.Errorf("Description = %q, want %q", desc, expectedDesc)
	}

	// 测试 severity
	sev := extractSeverity(yamlContent)
	if sev != "high" {
		t.Errorf("Severity = %q, want %q", sev, "high")
	}

	// 测试 author
	author := extractAuthor(yamlContent)
	if author != "princechaddha" {
		t.Errorf("Author = %q, want %q", author, "princechaddha")
	}

	// 测试 impact
	impact := extractImpact(yamlContent)
	expectedImpact := "Expired certificates can lead to service interruptions and expose applications to man-in-the-middle attacks."
	if impact != expectedImpact {
		t.Errorf("Impact = %q, want %q", impact, expectedImpact)
	}

	// 测试 remediation
	rem := extractRemediation(yamlContent)
	expectedRem := "Regularly review ACM for expired certificates and delete them or replace with updated versions."
	if rem != expectedRem {
		t.Errorf("Remediation = %q, want %q", rem, expectedRem)
	}

	// 测试 tags
	tags := extractTags(yamlContent)
	expectedTags := []string{"cloud", "devops", "aws", "amazon", "acm", "aws-cloud-config"}
	if !equalStringSlices(tags, expectedTags) {
		t.Errorf("Tags = %v, want %v", tags, expectedTags)
	}
}

// TestDeprecatedTLSTemplate 测试真实的 deprecated-tls 模板
func TestDeprecatedTLSTemplate(t *testing.T) {
	yamlContent := `id: deprecated-tls

info:
  name: Deprecated TLS Detection
  author: righettod,forgedhallpass
  severity: info
  description: |
    Both TLS 1.1 and SSLv3 are deprecated in favor of stronger encryption.
  remediation: |
    Update the web server's TLS configuration to disable TLS 1.1 and SSLv3.
  reference:
    - https://ssl-config.mozilla.org/#config=intermediate
  metadata:
    max-request: 3
    shodan-query: ssl.version:sslv2 ssl.version:sslv3 ssl.version:tlsv1 ssl.version:tlsv1.1
  tags: ssl,tls,vuln
ssl:
  - address: "{{Host}}:{{Port}}"
`

	// 测试 description
	desc := extractDescription(yamlContent)
	expectedDesc := "Both TLS 1.1 and SSLv3 are deprecated in favor of stronger encryption."
	if desc != expectedDesc {
		t.Errorf("Description = %q, want %q", desc, expectedDesc)
	}

	// 测试 severity
	sev := extractSeverity(yamlContent)
	if sev != "info" {
		t.Errorf("Severity = %q, want %q", sev, "info")
	}

	// 测试 tags
	tags := extractTags(yamlContent)
	expectedTags := []string{"ssl", "tls", "vuln"}
	if !equalStringSlices(tags, expectedTags) {
		t.Errorf("Tags = %v, want %v", tags, expectedTags)
	}
}

// TestKubernetesFakeCertTemplate 测试真实的 kubernetes-fake-certificate 模板
func TestKubernetesFakeCertTemplate(t *testing.T) {
	yamlContent := `id: kubernetes-fake-certificate

info:
  name: Kubernetes Fake Ingress Certificate - Detect
  author: kchason
  severity: low
  description: |
    Kubernetes Fake Ingress Certificate is a feature in Kubernetes that allows users to create and use fake or self-signed SSL/TLS certificates for testing purposes without having to obtain a real SSL/TLS certificate from a trusted Certificate Authority (CA).
  remediation: Purchase or generate a proper SSL certificate for this service.
  reference:
    - https://snyk.io/blog/setting-up-ssl-tls-for-kubernetes-ingress/
  metadata:
    verified: true
    max-request: 1
    shodan-query: ssl:"Kubernetes Ingress Controller Fake Certificate"
  tags: ssl,tls,kubernetes,self-signed,vuln
`

	// 测试 description
	desc := extractDescription(yamlContent)
	expectedDesc := "Kubernetes Fake Ingress Certificate is a feature in Kubernetes that allows users to create and use fake or self-signed SSL/TLS certificates for testing purposes without having to obtain a real SSL/TLS certificate from a trusted Certificate Authority (CA)."
	if desc != expectedDesc {
		t.Errorf("Description = %q, want %q", desc, expectedDesc)
	}

	// 测试 severity
	sev := extractSeverity(yamlContent)
	if sev != "low" {
		t.Errorf("Severity = %q, want %q", sev, "low")
	}

	// 测试 tags
	tags := extractTags(yamlContent)
	expectedTags := []string{"ssl", "tls", "kubernetes", "self-signed", "vuln"}
	if !equalStringSlices(tags, expectedTags) {
		t.Errorf("Tags = %v, want %v", tags, expectedTags)
	}
}

// ========== 辅助函数 ==========

// extractDescription 从 info 块中提取 description
func extractDescription(infoBlock string) string {
	// 提取 info 块
	infoStart := strings.Index(infoBlock, "info:")
	if infoStart < 0 {
		return ""
	}
	infoBlock = infoBlock[infoStart:]

	if idx := strings.Index(infoBlock, "description:"); idx > 0 {
		lineStart := idx + 12
		remainder := infoBlock[lineStart:]
		remainder = strings.TrimLeft(remainder, " \t\n\r")

		// 检查是否有多行标记（| 或 |-）
		if strings.HasPrefix(remainder, "|") {
			// 多行格式，读取所有缩进的行
			pipeIdx := strings.Index(remainder, "\n")
			if pipeIdx >= 0 {
				contentAfterPipe := remainder[pipeIdx+1:]
				lines := strings.Split(contentAfterPipe, "\n")
				var descLines []string
				for _, line := range lines {
					trimmed := strings.TrimSpace(line)
					if trimmed == "" {
						continue
					}
					// 遇到下一个字段就停止
					if strings.HasPrefix(line, "  ") && !strings.HasPrefix(line, "    ") {
						if strings.Contains(trimmed, ":") {
							break
						}
					}
					// 只添加有4+空格缩进的内容行
					if strings.HasPrefix(line, "    ") || strings.HasPrefix(line, "\t") {
						descLines = append(descLines, trimmed)
					}
				}
				return strings.Join(descLines, " ")
			}
		} else {
			// 单行格式
			endIdx := strings.Index(remainder, "\n")
			if endIdx > 0 {
				return strings.Trim(strings.TrimSpace(remainder[:endIdx]), "\"")
			}
			return strings.Trim(strings.TrimSpace(remainder), "\"")
		}
	}
	return ""
}

// extractSeverity 从 info 块中提取 severity
func extractSeverity(infoBlock string) string {
	infoStart := strings.Index(infoBlock, "info:")
	if infoStart < 0 {
		return ""
	}
	infoBlock = infoBlock[infoStart:]

	if idx := strings.Index(infoBlock, "severity:"); idx > 0 {
		endIdx := strings.Index(infoBlock[idx:], "\n")
		if endIdx > 0 {
			sevLine := strings.TrimSpace(infoBlock[idx+9 : idx+endIdx])
			return strings.Trim(strings.TrimSpace(sevLine), "\"")
		} else {
			// 处理 severity 在最后的情况（没有换行符）
			sevLine := strings.TrimSpace(infoBlock[idx+9:])
			return strings.Trim(strings.TrimSpace(sevLine), "\"")
		}
	}
	return ""
}

// extractTags 从 info 块中提取 tags
func extractTags(infoBlock string) []string {
	infoStart := strings.Index(infoBlock, "info:")
	if infoStart < 0 {
		return nil
	}
	infoBlock = infoBlock[infoStart:]

	if idx := strings.Index(infoBlock, "tags:"); idx > 0 {
		lineStart := idx + 5
		remainder := infoBlock[lineStart:]

		lines := strings.Split(remainder, "\n")
		var tags []string

		for i, line := range lines {
			originalLine := line
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}

			// 第一行可能是逗号分隔的 tag 列表
			if i == 0 && !strings.HasPrefix(line, "-") && !strings.Contains(line, ":") {
				tagList := strings.Split(line, ",")
				for _, t := range tagList {
					t = strings.TrimSpace(t)
					if t != "" {
						tags = append(tags, t)
					}
				}
				// 第一行处理完就结束，因为逗号分隔的 tags 在同一行
				return tags
			}

			// 处理列表项格式
			if strings.HasPrefix(line, "-") {
				tag := strings.TrimSpace(strings.TrimPrefix(line, "-"))
				tag = strings.Trim(tag, "\"'")
				if tag != "" {
					tags = append(tags, tag)
				}
			} else if strings.HasPrefix(originalLine, "    ") {
				tag := strings.Trim(line, "\"'")
				if tag != "" && !strings.Contains(tag, ":") {
					tags = append(tags, tag)
				}
			}

			// 遇到新的顶级字段就停止（检查是否有冒号且不是内容行）
			trimmed := strings.TrimSpace(originalLine)
			if trimmed != "" && !strings.HasPrefix(originalLine, " ") && !strings.HasPrefix(originalLine, "\t") {
				// 这是新的顶级字段，停止
				break
			}
			// 检查是否是字段定义（2空格开头且包含冒号）
			if strings.HasPrefix(originalLine, "  ") && !strings.HasPrefix(originalLine, "    ") && strings.Contains(trimmed, ":") {
				break
			}
		}
		return tags
	}
	return nil
}

// extractImpact 从 info 块中提取 impact
func extractImpact(infoBlock string) string {
	infoStart := strings.Index(infoBlock, "info:")
	if infoStart < 0 {
		return ""
	}
	infoBlock = infoBlock[infoStart:]

	if idx := strings.Index(infoBlock, "impact:"); idx > 0 {
		lineStart := idx + 7
		remainder := infoBlock[lineStart:]
		remainder = strings.TrimLeft(remainder, " \t\n\r")

		if strings.HasPrefix(remainder, "|") {
			pipeIdx := strings.Index(remainder, "\n")
			if pipeIdx >= 0 {
				contentAfterPipe := remainder[pipeIdx+1:]
				lines := strings.Split(contentAfterPipe, "\n")
				var impactLines []string
				for _, line := range lines {
					trimmed := strings.TrimSpace(line)
					if trimmed == "" {
						continue
					}
					if strings.HasPrefix(line, "  ") && !strings.HasPrefix(line, "    ") {
						if strings.Contains(trimmed, ":") {
							break
						}
					}
					if strings.HasPrefix(line, "    ") || strings.HasPrefix(line, "\t") {
						impactLines = append(impactLines, trimmed)
					}
				}
				return strings.Join(impactLines, " ")
			}
		} else {
			endIdx := strings.Index(remainder, "\n")
			if endIdx > 0 {
				return strings.Trim(strings.TrimSpace(remainder[:endIdx]), "\"")
			}
			return strings.Trim(strings.TrimSpace(remainder), "\"")
		}
	}
	return ""
}

// extractRemediation 从 info 块中提取 remediation
func extractRemediation(infoBlock string) string {
	infoStart := strings.Index(infoBlock, "info:")
	if infoStart < 0 {
		return ""
	}
	infoBlock = infoBlock[infoStart:]

	if idx := strings.Index(infoBlock, "remediation:"); idx > 0 {
		lineStart := idx + 12
		remainder := infoBlock[lineStart:]
		remainder = strings.TrimLeft(remainder, " \t\n\r")

		if strings.HasPrefix(remainder, "|") {
			pipeIdx := strings.Index(remainder, "\n")
			if pipeIdx >= 0 {
				contentAfterPipe := remainder[pipeIdx+1:]
				lines := strings.Split(contentAfterPipe, "\n")
				var remLines []string
				for _, line := range lines {
					trimmed := strings.TrimSpace(line)
					if trimmed == "" {
						continue
					}
					if strings.HasPrefix(line, "  ") && !strings.HasPrefix(line, "    ") {
						if strings.Contains(trimmed, ":") {
							break
						}
					}
					if strings.HasPrefix(line, "    ") || strings.HasPrefix(line, "\t") {
						remLines = append(remLines, trimmed)
					}
				}
				return strings.Join(remLines, " ")
			}
		} else {
			endIdx := strings.Index(remainder, "\n")
			if endIdx > 0 {
				return strings.Trim(strings.TrimSpace(remainder[:endIdx]), "\"")
			}
			return strings.Trim(strings.TrimSpace(remainder), "\"")
		}
	}
	return ""
}

// extractAuthor 从 info 块中提取 author
func extractAuthor(infoBlock string) string {
	infoStart := strings.Index(infoBlock, "info:")
	if infoStart < 0 {
		return ""
	}
	infoBlock = infoBlock[infoStart:]

	if idx := strings.Index(infoBlock, "author:"); idx > 0 {
		endIdx := strings.Index(infoBlock[idx:], "\n")
		if endIdx > 0 {
			authorLine := strings.TrimSpace(infoBlock[idx+7 : idx+endIdx])
			author := strings.Trim(strings.TrimSpace(authorLine), "\"")
			if len(author) > 30 {
				author = author[:30] + "..."
			}
			return author
		}
	}
	return ""
}

// equalStringSlices 比较两个字符串切片是否相等
func equalStringSlices(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
