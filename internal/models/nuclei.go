package models

// NucleiStatus represents the status of the nuclei binary
type NucleiStatus struct {
	Available     bool   `json:"available"`
	Version       string `json:"version"`
	Path          string `json:"path"`
	Embedded      bool   `json:"embedded"`
	Platform      string `json:"platform"`
	Installed     bool   `json:"installed"`
	TemplatesDir  string `json:"templates_dir,omitempty"`
	TemplateCount int    `json:"template_count,omitempty"`
	OfflineMode   bool   `json:"offline_mode"`
	Ready         bool   `json:"ready"`
}

// CustomTemplate represents a custom POC template
type CustomTemplate struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Path      string `json:"path"`
	Content   string `json:"content,omitempty"`
	Enabled   bool   `json:"enabled"`
	CreatedAt string `json:"created_at"`
}

// NucleiOutput represents the JSON output from Nuclei scanner
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
	Timestamp    string                 `json:"timestamp"`
}
