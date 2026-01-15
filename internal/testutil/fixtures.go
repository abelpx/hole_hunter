package testutil

import (
	"github.com/holehunter/holehunter/internal/models"
)

// NewMockScanTask 创建模拟扫描任务
func NewMockScanTask(id int) *models.ScanTask {
	name := "test-scan"
	return &models.ScanTask{
		ID:          id,
		Name:        &name,
		TargetID:    1,
		Strategy:    "fast",
		Status:      "pending",
		Progress:    0,
	}
}

// NewMockScanTaskWithName 创建带名称的模拟扫描任务
func NewMockScanTaskWithName(id int, name string) *models.ScanTask {
	return &models.ScanTask{
		ID:       id,
		Name:     &name,
		TargetID: 1,
		Strategy: "fast",
		Status:   "pending",
		Progress: 0,
	}
}

// NewMockVulnerability 创建模拟漏洞
func NewMockVulnerability(id int) *models.Vulnerability {
	return &models.Vulnerability{
		ID:          id,
		TaskID:      1,
		TemplateID:  "cve-2021-44228",
		Severity:    "critical",
		URL:         "https://example.com",
		Name:        "Log4j RCE",
		Description: "Apache Log4j2 JNDI features do not protect against attacker controlled LDAP",
		Tags:        []string{"cve", "rce", "oast"},
	}
}

// NewMockTarget 创建模拟目标
func NewMockTarget(id int) *models.Target {
	return &models.Target{
		ID:          id,
		Name:        "test-target",
		URL:         "https://example.com",
		Tags:        []string{"test"},
		Description: "",
	}
}

// NewMockTargetWithURL 创建带URL的模拟目标
func NewMockTargetWithURL(id int, name, url string) *models.Target {
	return &models.Target{
		ID:          id,
		Name:        name,
		URL:         url,
		Tags:        []string{"test"},
		Description: "",
	}
}

// NewMockTemplate 创建模拟模板
func NewMockTemplate(id string) *models.NucleiTemplate {
	return &models.NucleiTemplate{
		ID:          id,
		Name:        "Test Template",
		Severity:    "critical",
		Tags:        []string{"cve"},
		Path:        "/templates/test.yaml",
		Enabled:     true,
		Description: "Test template description",
	}
}

// StringPtr 返回字符串指针
func StringPtr(s string) *string {
	return &s
}

// IntPtr 返回int指针
func IntPtr(i int) *int {
	return &i
}
