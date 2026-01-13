package models

// PortScanTask represents a port scan task
type PortScanTask struct {
	ID          int      `json:"id"`
	Target      string   `json:"target"`
	Ports       []int    `json:"ports"`
	Timeout     int      `json:"timeout"`
	BatchSize   int      `json:"batch_size"`
	Status      string   `json:"status"`
	StartedAt   string   `json:"started_at"`
	CompletedAt string   `json:"completed_at"`
	CreatedAt   string   `json:"created_at"`
}

// PortScanResult represents a port scan result
type PortScanResult struct {
	ID      int    `json:"id"`
	TaskID  int    `json:"task_id"`
	Port    int    `json:"port"`
	Status  string `json:"status"`
	Service string `json:"service"`
	Banner  string `json:"banner"`
	Latency int    `json:"latency"`
}
