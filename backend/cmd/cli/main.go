package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"

	"github.com/holehunter/backend/internal/services"
)

// CLI 命令
var (
	command      = flag.String("cmd", "", "Command to execute (scan, brute, records)")
	target       = flag.String("target", "", "Target for port scan")
	domain       = flag.String("domain", "", "Domain for brute force")
	ports        = flag.String("ports", "", "Comma-separated port list")
	timeout      = flag.Int("timeout", 2000, "Timeout in milliseconds")
	batchSize    = flag.Int("batch-size", 50, "Batch size for concurrent operations")
	recordType   = flag.String("type", "", "DNS record type (mx, ns, txt)")
	useStdin     = flag.Bool("use-stdin", false, "Read wordlist from stdin")
	jsonOutput   = flag.Bool("json", false, "Output in JSON format")
)

type CLIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func main() {
	flag.Parse()

	if *command == "" {
		printError("No command specified")
		os.Exit(1)
	}

	var response CLIResponse
	var err error

	switch *command {
	case "scan":
		response, err = runPortScan()
	case "brute":
		response, err = runDomainBrute()
	case "records":
		response, err = runDNSRecords()
	case "common-ports":
		response, err = getCommonPorts()
	case "wordlist":
		response, err = getWordlist()
	default:
		printError(fmt.Sprintf("Unknown command: %s", *command))
		os.Exit(1)
	}

	if err != nil {
		printError(err.Error())
		os.Exit(1)
	}

	printResponse(response)
}

func runPortScan() (CLIResponse, error) {
	if *target == "" {
		return CLIResponse{}, fmt.Errorf("target is required")
	}

	var portList []int
	if *ports != "" {
		parts := strings.Split(*ports, ",")
		for _, p := range parts {
			port, err := strconv.Atoi(strings.TrimSpace(p))
			if err != nil {
				return CLIResponse{}, fmt.Errorf("invalid port: %s", p)
			}
			portList = append(portList, port)
		}
	}

	scanner := services.NewPortScanner()
	options := services.PortScanOptions{
		Target:    *target,
		Ports:     portList,
		Timeout:   *timeout,
		BatchSize: *batchSize,
	}

	results, err := scanner.ScanPorts(options)
	if err != nil {
		return CLIResponse{}, err
	}

	return CLIResponse{Success: true, Data: results}, nil
}

func runDomainBrute() (CLIResponse, error) {
	if *domain == "" {
		return CLIResponse{}, fmt.Errorf("domain is required")
	}

	var wordlist []string
	if *useStdin {
		// 从 stdin 读取字典
		data, err := io.ReadAll(os.Stdin)
		if err != nil {
			return CLIResponse{}, fmt.Errorf("failed to read stdin: %w", err)
		}
		wordlist = strings.Split(strings.TrimSpace(string(data)), "\n")
	} else {
		// 使用默认字典
		wordlist = services.DefaultWordlist()
	}

	service := services.NewDomainBruteService()
	options := services.DomainBruteOptions{
		Domain:    *domain,
		Wordlist:  wordlist,
		Timeout:   *timeout,
		BatchSize: *batchSize,
	}

	results, err := service.BruteSubdomains(options)
	if err != nil {
		return CLIResponse{}, err
	}

	return CLIResponse{Success: true, Data: results}, nil
}

func runDNSRecords() (CLIResponse, error) {
	if *domain == "" {
		return CLIResponse{}, fmt.Errorf("domain is required")
	}
	if *recordType == "" {
		return CLIResponse{}, fmt.Errorf("record type is required")
	}

	service := services.NewDomainBruteService()
	var results []string
	var err error

	switch *recordType {
	case "mx":
		results, err = service.CheckMXRecords(*domain)
	case "ns":
		results, err = service.CheckNSRecords(*domain)
	case "txt":
		results, err = service.CheckTXTRecords(*domain)
	default:
		return CLIResponse{}, fmt.Errorf("invalid record type: %s", *recordType)
	}

	if err != nil {
		return CLIResponse{}, err
	}

	return CLIResponse{Success: true, Data: results}, nil
}

func getCommonPorts() (CLIResponse, error) {
	ports := services.CommonPorts()
	return CLIResponse{Success: true, Data: ports}, nil
}

func getWordlist() (CLIResponse, error) {
	wordlist := services.DefaultWordlist()
	return CLIResponse{Success: true, Data: wordlist}, nil
}

func printResponse(response CLIResponse) {
	data, err := json.Marshal(response)
	if err != nil {
		printError(err.Error())
		os.Exit(1)
	}
	fmt.Println(string(data))
}

func printError(message string) {
	response := CLIResponse{Success: false, Error: message}
	data, _ := json.Marshal(response)
	fmt.Println(string(data))
}
