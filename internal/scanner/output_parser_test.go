package scanner

import (
	"testing"
)

func TestParseScanJSONLine(t *testing.T) {
	tests := []struct {
		name    string
		input   []byte
		want    *NucleiOutput
		wantErr bool
	}{
		{
			name:  "valid json output",
			input: []byte(`{"template-id":"cve-2021-44228","severity":"critical","host":"https://example.com"}`),
			want: &NucleiOutput{
				TemplateID: "cve-2021-44228",
				Severity:   "critical",
				Host:       "https://example.com",
			},
			wantErr: false,
		},
		{
			name:    "invalid json",
			input:   []byte(`not json`),
			want:    nil,
			wantErr: true,
		},
		{
			name:    "empty input",
			input:   []byte(``),
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseScanJSONLine(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseScanJSONLine() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr {
				if got == nil {
					t.Errorf("ParseScanJSONLine() returned nil, want non-nil")
					return
				}
				if got.TemplateID != tt.want.TemplateID {
					t.Errorf("ParseScanJSONLine() TemplateID = %v, want %v", got.TemplateID, tt.want.TemplateID)
				}
				if got.Severity != tt.want.Severity {
					t.Errorf("ParseScanJSONLine() Severity = %v, want %v", got.Severity, tt.want.Severity)
				}
				if got.Host != tt.want.Host {
					t.Errorf("ParseScanJSONLine() Host = %v, want %v", got.Host, tt.want.Host)
				}
			}
		})
	}
}

func TestParseScanProgress(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		wantValid bool
		wantCount int
		wantTotal int
	}{
		{
			name:      "valid template progress",
			input:     "[INF] Current template: http/cves/2021/CVE-2021-XXXXX.yaml (10/100)",
			wantValid: true,
			wantCount: 10,
			wantTotal: 100,
		},
		{
			name:      "valid stats progress",
			input:     "[INF] [stats] requests: 123, findings: 5, rps: 10, duration: 12s",
			wantValid: true,
		},
		{
			name:      "invalid progress",
			input:     "[INF] Some other message",
			wantValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := ParseScanProgress(tt.input)
			if ok != tt.wantValid {
				t.Errorf("ParseScanProgress() ok = %v, wantValid %v", ok, tt.wantValid)
				return
			}
			if tt.wantValid && tt.wantTotal > 0 {
				if got.Executed != tt.wantCount {
					t.Errorf("ParseScanProgress() Executed = %v, want %v", got.Executed, tt.wantCount)
				}
				if got.TotalTemplates != tt.wantTotal {
					t.Errorf("ParseScanProgress() TotalTemplates = %v, want %v", got.TotalTemplates, tt.wantTotal)
				}
			}
		})
	}
}

// TestParseScanProgress_EdgeCases 测试边界情况和错误处理
func TestParseScanProgress_EdgeCases(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		wantValid bool
	}{
		{
			name:      "总模板数为0",
			input:     "[INF] Current template: test.yaml (0/0)",
			wantValid: false, // 应该返回 false，因为除零
		},
		{
			name:      "负数进度",
			input:     "[INF] Current template: test.yaml (-1/100)",
			wantValid: false, // 解析失败但返回0
		},
		{
			name:      "无效数字格式",
			input:     "[INF] Current template: test.yaml (abc/100)",
			wantValid: false,
		},
		{
			name:      "括号内格式错误",
			input:     "[INF] Current template: test.yaml (100)",
			wantValid: false,
		},
		{
			name:      "空括号",
			input:     "[INF] Current template: test.yaml ()",
			wantValid: false,
		},
		{
			name:      "stats 格式错误",
			input:     "[INF] [stats] requests: 123, findings:",
			wantValid: false,
		},
		{
			name:      "stats findings 无效数字",
			input:     "[INF] [stats] requests: 123, findings: abc",
			wantValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, ok := ParseScanProgress(tt.input)
			if ok != tt.wantValid {
				t.Errorf("ParseScanProgress(%q) ok = %v, wantValid %v", tt.input, ok, tt.wantValid)
			}
		})
	}
}
