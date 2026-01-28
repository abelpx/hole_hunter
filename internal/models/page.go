package models

// VulnerabilityPageResult 分页漏洞结果
type VulnerabilityPageResult struct {
	Vulnerabilities []*Vulnerability `json:"vulnerabilities"`
	Total           int               `json:"total"`
}

// TemplatePageResult 分页模板结果
type TemplatePageResult struct {
	Templates []*Template `json:"templates"`
	Total     int         `json:"total"`
}
