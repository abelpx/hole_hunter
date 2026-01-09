package scanner

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/holehunter/backend/internal/models"
	"github.com/holehunter/backend/pkg/config"
)

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
	Timestamp    time.Time              `json:"timestamp"`
}

// NucleiProgress represents scan progress information
type NucleiProgress struct {
	TaskID         int       `json:"task_id"`
	Status         string    `json:"status"`
	TotalTemplates int       `json:"total_templates"`
	Executed       int       `json:"executed_templates"`
	Progress       int       `json:"progress"`
	CurrentTemplate string   `json:"current_template"`
	VulnCount      int       `json:"vuln_count"`
	Timestamp      time.Time `json:"timestamp"`
}

// ProgressCallback is a function to report scan progress
type ProgressCallback func(progress NucleiProgress)

// ScanResult represents the final result of a scan
type ScanResult struct {
	TaskID       int                `json:"task_id"`
	Status       string             `json:"status"`
	Error        string             `json:"error,omitempty"`
	Vulnerabilities []NucleiOutput  `json:"vulnerabilities"`
	Duration     time.Duration      `json:"duration"`
}

// NucleiScanner handles Nuclei execution
type NucleiScanner struct {
	cfg         *config.NucleiConfig
	scanCfg     *config.ScanConfig
	db          *sql.DB
	cmd         *exec.Cmd
	cancelFunc  context.CancelFunc
	progressCb  ProgressCallback
	mu          sync.Mutex
	running     map[int]bool
}

// NewNucleiScanner creates a new Nuclei scanner instance
func NewNucleiScanner(cfg *config.NucleiConfig, scanCfg *config.ScanConfig, db *sql.DB) *NucleiScanner {
	return &NucleiScanner{
		cfg:      cfg,
		scanCfg:  scanCfg,
		db:       db,
		running:  make(map[int]bool),
	}
}

// SetProgressCallback sets the callback for progress updates
func (n *NucleiScanner) SetProgressCallback(cb ProgressCallback) {
	n.mu.Lock()
	defer n.mu.Unlock()
	n.progressCb = cb
}

// Run executes a Nuclei scan
func (n *NucleiScanner) Run(taskID int, targetURL string, strategy string, templates []string, options models.ScanOptions) (*ScanResult, error) {
	// Check if scan is already running
	n.mu.Lock()
	if n.running[taskID] {
		n.mu.Unlock()
		return nil, fmt.Errorf("scan task %d is already running", taskID)
	}
	n.running[taskID] = true
	n.mu.Unlock()

	// Clean up running state when done
	defer func() {
		n.mu.Lock()
		delete(n.running, taskID)
		n.mu.Unlock()
	}()

	// Build Nuclei command
	args := n.buildArgs(targetURL, strategy, templates, options)
	cmd := exec.Command(n.cfg.BinaryPath, args...)

	// Setup pipes
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdout pipe: %w", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// Store command for cancellation
	n.mu.Lock()
	n.cmd = cmd
	n.mu.Unlock()

	// Start the command
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to start nuclei: %w", err)
	}

	startTime := time.Now()
	result := &ScanResult{
		TaskID: taskID,
		Status: "running",
	}

	// Parse output in real-time
	var vulnerabilities []NucleiOutput
	var vulnCount int
	var executedTemplates int
	var totalTemplates int

	// Scan stdout for JSON results
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()

		// Try to parse as JSON result
		var output NucleiOutput
		if err := json.Unmarshal([]byte(line), &output); err == nil {
			vulnerabilities = append(vulnerabilities, output)
			vulnCount++

			// Store vulnerability in database
			if err := n.storeVulnerability(taskID, output); err != nil {
				// Log error but continue scanning
				fmt.Printf("Error storing vulnerability: %v\n", err)
			}

			// Report progress
			n.reportProgress(NucleiProgress{
				TaskID:    taskID,
				Status:    "running",
				VulnCount: vulnCount,
				Timestamp: time.Now(),
			})
		}
	}

	// Check for scan errors
	if err := scanner.Err(); err != nil {
		result.Status = "failed"
		result.Error = fmt.Sprintf("scan error: %v", err)
		return result, err
	}

	// Read stderr for progress information
 stderrReader := bufio.NewScanner(stderr)
	for stderrReader.Scan() {
		line := stderrReader.Text()
		// Parse progress from stderr
		// Nuclei outputs progress info like: "Progress: 125/1000"
		if strings.Contains(line, "Progress:") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				progressStr := strings.TrimSuffix(parts[1], "/")
				fmt.Sscanf(progressStr, "%d", &executedTemplates)
				if len(parts) >= 3 {
					fmt.Sscanf(parts[2], "%d", &totalTemplates)
				}

				progress := 0
				if totalTemplates > 0 {
					progress = (executedTemplates * 100) / totalTemplates
				}

				n.reportProgress(NucleiProgress{
					TaskID:          taskID,
					Status:          "running",
					TotalTemplates:  totalTemplates,
					Executed:        executedTemplates,
					Progress:        progress,
					VulnCount:       vulnCount,
					Timestamp:       time.Now(),
				})
			}
		}
	}

	// Wait for command to complete
	if err := cmd.Wait(); err != nil {
		result.Status = "failed"
		result.Error = fmt.Sprintf("nuclei execution failed: %v", err)
		return result, err
	}

	result.Status = "completed"
	result.Vulnerabilities = vulnerabilities
	result.Duration = time.Since(startTime)

	return result, nil
}

// buildArgs constructs the command line arguments for Nuclei
func (n *NucleiScanner) buildArgs(targetURL string, strategy string, templates []string, options models.ScanOptions) []string {
	args := []string{
		"-u", targetURL,
		"-json",
		"-silent",
	}

	// Add rate limit
	rateLimit := options.RateLimit
	if rateLimit == 0 {
		rateLimit = n.scanCfg.DefaultRateLimit
	}
	args = append(args, "-rate-limit", fmt.Sprintf("%d", rateLimit))

	// Add timeout
	timeout := options.Timeout
	if timeout == 0 {
		timeout = n.scanCfg.DefaultTimeout
	}
	args = append(args, "-timeout", fmt.Sprintf("%d", timeout))

	// Add templates based on strategy
	switch strategy {
	case "quick":
		// Quick scan: only critical and high severity
		args = append(args, "-severity", "critical,high")
	case "deep":
		// Deep scan: all severities
		args = append(args, "-severity", "critical,high,medium,low,info")
	case "custom":
		// Custom scan: use specified templates
		if len(templates) > 0 {
			for _, tpl := range templates {
				args = append(args, "-templates", tpl)
			}
		}
	}

	// Add templates directory
	if n.cfg.TemplatesDir != "" {
		args = append(args, "-t", n.cfg.TemplatesDir)
	}

	return args
}

// storeVulnerability stores a vulnerability in the database
func (n *NucleiScanner) storeVulnerability(taskID int, output NucleiOutput) error {
	// Extract CVE if present
	var cve string
	if cveList, ok := output.Info["cve-id"].([]interface{}); ok && len(cveList) > 0 {
		if cveStr, ok := cveList[0].(string); ok {
			cve = cveStr
		}
	}

	// Extract CVSS if present
	var cvss float64
	if cvssVal, ok := output.Info["cvss"].(float64); ok {
		cvss = cvssVal
	}

	// Build description
	description := ""
	if desc, ok := output.Info["description"].(string); ok {
		description = desc
	}

	// Build request/response as JSON
	requestResponse := ""
	if output.Request != "" || output.Response != "" {
		rrMap := map[string]string{
			"request":  output.Request,
			"response": output.Response,
		}
		if data, err := json.Marshal(rrMap); err == nil {
			requestResponse = string(data)
		}
	}

	_, err := n.db.Exec(`
		INSERT INTO vulnerabilities (
			task_id, template_id, severity, name, description, url,
			matched_at, request_response, cve, cvss
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, taskID, output.TemplateID, output.Severity, output.Name,
		description, output.URL, output.MatchedAt, requestResponse, cve, cvss)

	return err
}

// reportProgress reports scan progress via callback
func (n *NucleiScanner) reportProgress(progress NucleiProgress) {
	n.mu.Lock()
	cb := n.progressCb
	n.mu.Unlock()

	if cb != nil {
		cb(progress)
	}
}

// Cancel stops a running scan
func (n *NucleiScanner) Cancel(taskID int) error {
	n.mu.Lock()
	defer n.mu.Unlock()

	if n.cmd == nil || n.cmd.Process == nil {
		return fmt.Errorf("no running scan for task %d", taskID)
	}

	// Kill the process
	if err := n.cmd.Process.Kill(); err != nil {
		return fmt.Errorf("failed to kill scan process: %w", err)
	}

	// Clear command
	n.cmd = nil

	return nil
}

// IsRunning checks if a scan is currently running
func (n *NucleiScanner) IsRunning(taskID int) bool {
	n.mu.Lock()
	defer n.mu.Unlock()
	return n.running[taskID]
}
