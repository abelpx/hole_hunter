package models

// DashboardStats represents dashboard statistics
type DashboardStats struct {
	TotalTargets        int `json:"total_targets"`
	TotalScans          int `json:"total_scans"`
	RunningScans        int `json:"running_scans"`
	TotalVulnerabilities int `json:"total_vulnerabilities"`
	CriticalVulns       int `json:"critical_vulns"`
	HighVulns           int `json:"high_vulns"`
	MediumVulns         int `json:"medium_vulns"`
	LowVulns            int `json:"low_vulns"`
}
