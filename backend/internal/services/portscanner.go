package services

import (
	"net"
	"strconv"
	"sync"
	"time"
)

// PortScanner handles port scanning operations
type PortScanner struct {
	timeout time.Duration
}

// NewPortScanner creates a new port scanner instance
func NewPortScanner() *PortScanner {
	return &PortScanner{
		timeout: 5 * time.Second,
	}
}

// PortScanResult represents the result of scanning a single port
type PortScanResult struct {
	Port     int    `json:"port"`
	Status   string `json:"status"` // open, closed, filtered
	Service  string `json:"service,omitempty"`
	Latency  int    `json:"latency,omitempty"` // in milliseconds
}

// PortScanOptions represents options for port scanning
type PortScanOptions struct {
	Target    string   `json:"target"`
	Ports     []int    `json:"ports"`
	Timeout   int      `json:"timeout"` // in seconds
	BatchSize int      `json:"batch_size"`
}

// CommonPorts returns a list of common ports and their services
func CommonPorts() []int {
	return []int{
		21, 22, 23, 25, 53, 80, 110, 143, 443, 445,
		3306, 3389, 5432, 6379, 8080, 8443, 27017,
	}
}

// GetServiceName returns the common service name for a port
func GetServiceName(port int) string {
	services := map[int]string{
		21:     "FTP",
		22:     "SSH",
		23:     "Telnet",
		25:     "SMTP",
		53:     "DNS",
		80:     "HTTP",
		110:    "POP3",
		143:    "IMAP",
		443:    "HTTPS",
		445:    "SMB",
		3306:   "MySQL",
		3389:   "RDP",
		5432:   "PostgreSQL",
		6379:   "Redis",
		8080:   "HTTP-Proxy",
		8443:   "HTTPS-Alt",
		27017:  "MongoDB",
	}
	if service, ok := services[port]; ok {
		return service
	}
	return ""
}

// ScanPorts scans the specified ports on a target
func (s *PortScanner) ScanPorts(options PortScanOptions) ([]PortScanResult, error) {
	if options.Timeout > 0 {
		s.timeout = time.Duration(options.Timeout) * time.Second
	}

	// Default to common ports if no ports specified
	ports := options.Ports
	if len(ports) == 0 {
		ports = CommonPorts()
	}

	// Set default batch size
	batchSize := options.BatchSize
	if batchSize <= 0 {
		batchSize = 50 // Scan 50 ports concurrently
	}

	results := make([]PortScanResult, 0, len(ports))
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Process ports in batches
	for i := 0; i < len(ports); i += batchSize {
		end := i + batchSize
		if end > len(ports) {
			end = len(ports)
		}
		batch := ports[i:end]

		wg.Add(len(batch))
		for _, port := range batch {
			go func(p int) {
				defer wg.Done()
				result := s.scanPort(options.Target, p)
				mu.Lock()
				results = append(results, result)
				mu.Unlock()
			}(port)
		}
		wg.Wait()
	}

	// Sort results by port number
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[i].Port > results[j].Port {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	return results, nil
}

// scanPort scans a single port
func (s *PortScanner) scanPort(target string, port int) PortScanResult {
	startTime := time.Now()

	// Try to connect to the port
	address := net.JoinHostPort(target, strconv.Itoa(port))
	conn, err := net.DialTimeout("tcp", address, s.timeout)

	latency := int(time.Since(startTime).Milliseconds())

	if err != nil {
		// Check if it's a timeout (filtered) or connection refused (closed)
		if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
			return PortScanResult{
				Port:   port,
				Status: "filtered",
			}
		}
		return PortScanResult{
			Port:   port,
			Status: "closed",
		}
	}

	defer conn.Close()

	return PortScanResult{
		Port:    port,
		Status:  "open",
		Service: GetServiceName(port),
		Latency: latency,
	}
}

// ScanPortRange scans a range of ports
func (s *PortScanner) ScanPortRange(target string, startPort, endPort int, batchSize int) ([]PortScanResult, error) {
	ports := make([]int, 0, endPort-startPort+1)
	for i := startPort; i <= endPort; i++ {
		ports = append(ports, i)
	}

	return s.ScanPorts(PortScanOptions{
		Target:    target,
		Ports:     ports,
		BatchSize: batchSize,
	})
}
