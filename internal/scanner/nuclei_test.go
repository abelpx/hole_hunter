package scanner

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestNewNucleiClient(t *testing.T) {
	client := NewNucleiClient("/tmp/test")
	if client == nil {
		t.Fatal("NewNucleiClient returned nil")
	}
	if client.templatesDir != "/tmp/test/nuclei-templates" {
		t.Errorf("expected templatesDir /tmp/test/nuclei-templates, got %s", client.templatesDir)
	}
}

func TestNucleiClient_IsAvailable(t *testing.T) {
	client := NewNucleiClient("/tmp/test")

	// 在大多数 CI 环境中，nuclei 二进制不存在
	// 所以我们测试二进制不存在的情况
	if client.IsAvailable() {
		t.Log("nuclei binary is available (unexpected in CI)")
	}
}

func TestNucleiClient_GetBinary(t *testing.T) {
	client := NewNucleiClient("/tmp/test")
	binary := client.GetBinary()

	// binaryPath 应该是空字符串或有效路径
	if binary != "" {
		// 如果返回了路径，验证它存在
		if _, err := os.Stat(binary); err != nil {
			t.Logf("binary path returned but doesn't exist: %s", binary)
		}
	}
}

func TestNucleiClient_GetVersion(t *testing.T) {
	t.Run("nuclei not available", func(t *testing.T) {
		client := &NucleiClient{binaryPath: "", templatesDir: "/tmp"}
		version := client.GetVersion()

		if version != "" {
			t.Errorf("expected empty version when nuclei is not available, got %q", version)
		}
	})

	t.Run("nuclei available but fake binary", func(t *testing.T) {
		tmpDir := t.TempDir()
		fakeNuclei := filepath.Join(tmpDir, "nuclei")
		file, err := os.Create(fakeNuclei)
		if err != nil {
			t.Fatal(err)
		}
		file.Close()

		client := &NucleiClient{binaryPath: fakeNuclei, templatesDir: tmpDir}
		version := client.GetVersion()

		// 假二进制执行会失败，应该返回 "unknown"
		if version != "unknown" {
			t.Logf("GetVersion() with fake binary returned %q (expected 'unknown')", version)
		}
	})
}

func TestIsValidTemplateID(t *testing.T) {
	tests := []struct {
		name string
		id   string
		want bool
	}{
		{"valid cve id", "cve-2021-44228", true},
		{"valid with slash", "cves/2021/CVE-2021-44228", true},
		{"valid with underscore", "technology_xss", true},
		{"empty string", "", false},
		{"invalid with space", "cve 2021", false},
		{"invalid with special chars", "cve@2021", false},
		{"invalid with dot", "template.yaml", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isValidTemplateID(tt.id)
			if got != tt.want {
				t.Errorf("isValidTemplateID(%q) = %v, want %v", tt.id, got, tt.want)
			}
		})
	}
}

func TestBuildCommand(t *testing.T) {
	t.Run("unavailable nuclei", func(t *testing.T) {
		client := &NucleiClient{binaryPath: "", templatesDir: "/tmp"}
		cmd, err := client.BuildCommand("https://example.com", "fast", nil, "")

		if err == nil {
			t.Error("BuildCommand() should return error when nuclei binary is empty")
		}
		if cmd != nil {
			t.Error("BuildCommand() should return nil cmd when error")
		}
	})

	t.Run("available nuclei with valid params", func(t *testing.T) {
		// 创建假的 nuclei 二进制
		tmpDir := t.TempDir()
		fakeNuclei := filepath.Join(tmpDir, "nuclei")
		file, err := os.Create(fakeNuclei)
		if err != nil {
			t.Fatal(err)
		}
		file.Close()

		client := &NucleiClient{binaryPath: fakeNuclei, templatesDir: tmpDir}
		cmd, err := client.BuildCommand("https://example.com", "fast", nil, "")

		if err != nil {
			t.Errorf("BuildCommand() unexpected error: %v", err)
		}
		if cmd == nil {
			t.Error("BuildCommand() should return non-nil cmd")
		}
	})
}

func TestFindNucleiBinary(t *testing.T) {
	// 测试环境变量
	oldEnv := os.Getenv("NUCLEI_PATH")
	defer os.Setenv("NUCLEI_PATH", oldEnv)

	// 创建临时文件作为测试
	tmpDir := t.TempDir()
	fakeBinary := filepath.Join(tmpDir, "nuclei")
	file, err := os.Create(fakeBinary)
	if err != nil {
		t.Fatal(err)
	}
	file.Close()

	// 设置可执行权限
	if runtime.GOOS != "windows" {
		os.Chmod(fakeBinary, 0755)
	}

	os.Setenv("NUCLEI_PATH", fakeBinary)

	result := findNucleiBinary()
	if result != fakeBinary {
		t.Errorf("findNucleiBinary() = %v, want %v", result, fakeBinary)
	}
}

func TestHasCustomTemplates(t *testing.T) {
	client := NewNucleiClient("/tmp/test")

	// 空目录
	if client.hasCustomTemplates("") {
		t.Error("expected false for empty customDir")
	}

	// 不存在的目录
	if client.hasCustomTemplates("/nonexistent/path") {
		t.Error("expected false for nonexistent directory")
	}

	// 存在的目录但没有 yaml 文件
	tmpDir := t.TempDir()
	if client.hasCustomTemplates(tmpDir) {
		t.Error("expected false for directory without yaml files")
	}

	// 存在的目录有 yaml 文件
	emptyYaml := filepath.Join(tmpDir, "test.yaml")
	file, err := os.Create(emptyYaml)
	if err != nil {
		t.Fatal(err)
	}
	file.Close()

	if !client.hasCustomTemplates(tmpDir) {
		t.Error("expected true for directory with yaml files")
	}
}

func TestBuildArgs(t *testing.T) {
	client := NewNucleiClient("/tmp/test")

	tests := []struct {
		name      string
		targetURL string
		strategy  string
		templates []string
		customDir string
		checkFn   func(*testing.T, []string)
	}{
		{
			name:      "quick strategy",
			targetURL: "https://example.com",
			strategy:  "quick",
			checkFn: func(t *testing.T, args []string) {
				found := false
				for i, arg := range args {
					if arg == "-severity" && i+1 < len(args) && args[i+1] == "critical,high,medium" {
						found = true
						break
					}
				}
				if !found {
					t.Error("quick strategy should include severity filter")
				}
			},
		},
		{
			name:      "passive strategy",
			targetURL: "https://example.com",
			strategy:  "passive",
			checkFn: func(t *testing.T, args []string) {
				found := false
				for _, arg := range args {
					if arg == "-passive" {
						found = true
						break
					}
				}
				if !found {
					t.Error("passive strategy should include -passive flag")
				}
			},
		},
		{
			name:      "custom templates",
			targetURL: "https://example.com",
			strategy:  "custom",
			templates: []string{"cve-2021-44228", "technology-xss"},
			checkFn: func(t *testing.T, args []string) {
				foundCVE := false
				foundTech := false
				for i, arg := range args {
					if arg == "-id" {
						if i+1 < len(args) {
							if args[i+1] == "cve-2021-44228" {
								foundCVE = true
							}
							if args[i+1] == "technology-xss" {
								foundTech = true
							}
						}
					}
				}
				if !foundCVE {
					t.Error("custom templates should include cve-2021-44228")
				}
				if !foundTech {
					t.Error("custom templates should include technology-xss")
				}
			},
		},
		{
			name:      "invalid template id filtered",
			targetURL: "https://example.com",
			strategy:  "custom",
			templates: []string{"valid-id", "invalid@id"},
			checkFn: func(t *testing.T, args []string) {
				// invalid@id 应该被过滤掉
				for _, arg := range args {
					if arg == "invalid@id" {
						t.Error("invalid template ID should be filtered")
					}
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			args := client.buildArgs(tt.targetURL, tt.strategy, tt.templates, tt.customDir)
			if tt.checkFn != nil {
				tt.checkFn(t, args)
			}
		})
	}
}

// Benchmark
func BenchmarkIsValidTemplateID(b *testing.B) {
	for i := 0; i < b.N; i++ {
		isValidTemplateID("cve-2021-44228")
	}
}

func BenchmarkFindNucleiBinary(b *testing.B) {
	// 设置环境变量避免实际查找
	os.Setenv("NUCLEI_PATH", "/tmp/fake-nuclei")
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		findNucleiBinary()
	}
}
