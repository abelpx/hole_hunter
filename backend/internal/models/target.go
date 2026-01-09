package models

import (
	"encoding/json"
	"time"
)

type Target struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	DESC      string    `json:"description,omitempty"`
	Tags      []string  `json:"tags"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type VulnCount struct {
	Critical int `json:"critical"`
	High     int `json:"high"`
	Medium   int `json:"medium"`
	Low      int `json:"low"`
	Info     int `json:"info"`
}

func (t *Target) ScanTags(tags string) error {
	if tags == "" {
		t.Tags = []string{}
		return nil
	}
	return json.Unmarshal([]byte(tags), &t.Tags)
}

func (t *Target) TagsJSON() string {
	if t.Tags == nil {
		return "[]"
	}
	data, _ := json.Marshal(t.Tags)
	return string(data)
}

type ScanTask struct {
	ID                int       `json:"id"`
	TargetID          int       `json:"target_id"`
	Status            string    `json:"status"`
	Strategy          string    `json:"strategy"`
	TemplatesUsed     []string  `json:"templates_used"`
	StartedAt         *time.Time `json:"started_at,omitempty"`
	CompletedAt       *time.Time `json:"completed_at,omitempty"`
	TotalTemplates    int       `json:"total_templates"`
	ExecutedTemplates int       `json:"executed_templates"`
	Progress          int       `json:"progress"`
	CurrentTemplate   *string   `json:"current_template,omitempty"`
	Error             *string   `json:"error,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

func (s *ScanTask) ScanTemplates(templates string) error {
	if templates == "" {
		s.TemplatesUsed = []string{}
		return nil
	}
	return json.Unmarshal([]byte(templates), &s.TemplatesUsed)
}

func (s *ScanTask) TemplatesJSON() string {
	if s.TemplatesUsed == nil {
		return "[]"
	}
	data, _ := json.Marshal(s.TemplatesUsed)
	return string(data)
}

type Vulnerability struct {
	ID              int        `json:"id"`
	TaskID          int        `json:"task_id"`
	TemplateID      string     `json:"template_id"`
	Severity        string     `json:"severity"`
	Name            string     `json:"name"`
	Description     string     `json:"description,omitempty"`
	URL             string     `json:"url"`
	MatchedAt       string     `json:"matched_at"`
	RequestResponse string     `json:"request_response,omitempty"`
	FalsePositive   bool       `json:"false_positive"`
	Notes           string     `json:"notes,omitempty"`
	CVE             string     `json:"cve,omitempty"`
	CVSS            float64    `json:"cvss,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

type CreateTargetRequest struct {
	Name string   `json:"name" binding:"required"`
	URL  string   `json:"url" binding:"required,url"`
	DESC string   `json:"description,omitempty"`
	Tags []string `json:"tags,omitempty"`
}

type CreateScanRequest struct {
	TargetID  int                 `json:"target_id" binding:"required"`
	Strategy  string              `json:"strategy" binding:"required,oneof=quick deep custom"`
	Templates []string            `json:"templates,omitempty"`
	Options   ScanOptions         `json:"options,omitempty"`
}

type ScanOptions struct {
	RateLimit  int `json:"rate_limit,omitempty"`
	Timeout    int `json:"timeout,omitempty"`
	Concurrent int `json:"concurrent,omitempty"`
	Retries    int `json:"retries,omitempty"`
}
