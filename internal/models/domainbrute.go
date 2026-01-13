package models

// DomainBruteTask represents a domain brute force task
type DomainBruteTask struct {
	ID          int      `json:"id"`
	Domain      string   `json:"domain"`
	Wordlist    []string `json:"wordlist"`
	Timeout     int      `json:"timeout"`
	BatchSize   int      `json:"batch_size"`
	Status      string   `json:"status"`
	StartedAt   string   `json:"started_at"`
	CompletedAt string   `json:"completed_at"`
	CreatedAt   string   `json:"created_at"`
}

// DomainBruteResult represents a domain brute force result
type DomainBruteResult struct {
	ID       int      `json:"id"`
	TaskID   int      `json:"task_id"`
	Subdomain string  `json:"subdomain"`
	Resolved bool     `json:"resolved"`
	IPs      []string `json:"ips"`
	Latency  int      `json:"latency"`
}
