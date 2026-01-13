package models

type NucleiTemplate struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Severity    string   `json:"severity"`
	Author      string   `json:"author"`
	Path        string   `json:"path"`
	Category    string   `json:"category"`
	Tags        []string `json:"tags"`
	Enabled     bool     `json:"enabled"`
	Description string   `json:"description,omitempty"`
	Impact      string   `json:"impact,omitempty"`
	Remediation string   `json:"remediation,omitempty"`
	Reference   []string `json:"reference,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}
