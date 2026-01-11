package services

import (
	"context"
	"fmt"
	"net"
	"sync"
	"time"
)

// DomainBruteService handles domain brute forcing operations
type DomainBruteService struct {
	timeout time.Duration
}

// NewDomainBruteService creates a new domain brute service instance
func NewDomainBruteService() *DomainBruteService {
	return &DomainBruteService{
		timeout: 3 * time.Second,
	}
}

// SubdomainResult represents the result of checking a subdomain
type SubdomainResult struct {
	Subdomain string `json:"subdomain"`
	Resolved  bool   `json:"resolved"`
	IPs       []string `json:"ips,omitempty"`
	Latency   int    `json:"latency,omitempty"` // in milliseconds
}

// DomainBruteOptions represents options for domain brute forcing
type DomainBruteOptions struct {
	Domain    string   `json:"domain"`
	Wordlist  []string `json:"wordlist"`
	Timeout   int      `json:"timeout"` // in seconds
	BatchSize int      `json:"batch_size"`
}

// DefaultWordlist returns the default subdomain wordlist
func DefaultWordlist() []string {
	return []string{
		"www", "mail", "ftp", "localhost", "webmail", "smtp", "pop", "ns1", "ns2",
		"admin", "api", "test", "dev", "staging", "production", "blog", "shop",
		"app", "mobile", "cdn", "static", "media", "img", "image", "video",
		"m", "mobile", "help", "support", "docs", "wiki", "forum", "community",
		"portal", "dashboard", "panel", "cpanel", "webdisk", "ftp",
		"remote", "bbs", "forum", "blog", "site", "cms", "shop", "store",
	}
}

// BruteSubdomains performs subdomain brute forcing
func (s *DomainBruteService) BruteSubdomains(options DomainBruteOptions) ([]SubdomainResult, error) {
	if options.Timeout > 0 {
		s.timeout = time.Duration(options.Timeout) * time.Second
	}

	// Use default wordlist if none provided
	wordlist := options.Wordlist
	if len(wordlist) == 0 {
		wordlist = DefaultWordlist()
	}

	// Set default batch size
	batchSize := options.BatchSize
	if batchSize <= 0 {
		batchSize = 100 // Check 100 subdomains concurrently
	}

	results := make([]SubdomainResult, 0)
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	// Process subdomains in batches
	for i := 0; i < len(wordlist); i += batchSize {
		select {
		case <-ctx.Done():
			wg.Wait()
			return results, fmt.Errorf("scan cancelled or timed out")
		default:
		}

		end := i + batchSize
		if end > len(wordlist) {
			end = len(wordlist)
		}
		batch := wordlist[i:end]

		wg.Add(len(batch))
		for _, word := range batch {
			go func(sub string) {
				defer wg.Done()
				result := s.checkSubdomain(ctx, options.Domain, sub)
				if result.Resolved {
					mu.Lock()
					results = append(results, result)
					mu.Unlock()
				}
			}(word)
		}
		wg.Wait()
	}

	return results, nil
}

// checkSubdomain checks if a subdomain exists
func (s *DomainBruteService) checkSubdomain(ctx context.Context, domain, subdomain string) SubdomainResult {
	fullDomain := fmt.Sprintf("%s.%s", subdomain, domain)
	startTime := time.Now()

	// Create resolver with timeout
	resolver := &net.Resolver{
		PreferGo: true,
	}

	// Try to resolve A record
	ips, err := resolver.LookupHost(ctx, fullDomain)
	latency := int(time.Since(startTime).Milliseconds())

	if err != nil {
		return SubdomainResult{
			Subdomain: fullDomain,
			Resolved:  false,
		}
	}

	return SubdomainResult{
		Subdomain: fullDomain,
		Resolved:  true,
		IPs:      ips,
		Latency:  latency,
	}
}

// CheckMXRecords checks MX records for a domain
func (s *DomainBruteService) CheckMXRecords(domain string) ([]string, error) {
	resolver := &net.Resolver{
		PreferGo: true,
	}

	ctx, cancel := context.WithTimeout(context.Background(), s.timeout)
	defer cancel()

	mxRecords, err := resolver.LookupMX(ctx, domain)
	if err != nil {
		return nil, err
	}

	results := make([]string, 0, len(mxRecords))
	for _, mx := range mxRecords {
		results = append(results, mx.Host)
	}

	return results, nil
}

// CheckTXTRecords checks TXT records for a domain
func (s *DomainBruteService) CheckTXTRecords(domain string) ([]string, error) {
	resolver := &net.Resolver{
		PreferGo: true,
	}

	ctx, cancel := context.WithTimeout(context.Background(), s.timeout)
	defer cancel()

	txtRecords, err := resolver.LookupTXT(ctx, domain)
	if err != nil {
		return nil, err
	}

	return txtRecords, nil
}

// CheckNSRecords checks NS records for a domain
func (s *DomainBruteService) CheckNSRecords(domain string) ([]string, error) {
	resolver := &net.Resolver{
		PreferGo: true,
	}

	ctx, cancel := context.WithTimeout(context.Background(), s.timeout)
	defer cancel()

	nsRecords, err := resolver.LookupNS(ctx, domain)
	if err != nil {
		return nil, err
	}

	results := make([]string, 0, len(nsRecords))
	for _, ns := range nsRecords {
		results = append(results, ns.Host)
	}

	return results, nil
}
