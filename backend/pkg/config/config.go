package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Nuclei   NucleiConfig   `mapstructure:"nuclei"`
	Scan     ScanConfig     `mapstructure:"scan"`
	Log      LogConfig      `mapstructure:"log"`
}

type ServerConfig struct {
	Port         string `mapstructure:"port"`
	ReadTimeout  int    `mapstructure:"read_timeout"`
	WriteTimeout int    `mapstructure:"write_timeout"`
}

type DatabaseConfig struct {
	Path string `mapstructure:"path"`
}

type NucleiConfig struct {
	BinaryPath  string `mapstructure:"binary_path"`
	TemplatesDir string `mapstructure:"templates_dir"`
}

type ScanConfig struct {
	DefaultRateLimit  int `mapstructure:"default_rate_limit"`
	DefaultTimeout   int `mapstructure:"default_timeout"`
	MaxConcurrent    int `mapstructure:"max_concurrent"`
	DefaultRetries   int `mapstructure:"default_retries"`
}

type LogConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
	Output string `mapstructure:"output"`
}

func Load() (*Config, error) {
	viper.SetDefault("server.port", "8080")
	viper.SetDefault("server.read_timeout", 30)
	viper.SetDefault("server.write_timeout", 30)

	viper.SetDefault("database.path", "./holehunter.db")

	viper.SetDefault("nuclei.binary_path", "nuclei")
	viper.SetDefault("nuclei.templates_dir", "./templates")

	viper.SetDefault("scan.default_rate_limit", 150)
	viper.SetDefault("scan.default_timeout", 10)
	viper.SetDefault("scan.max_concurrent", 5)
	viper.SetDefault("scan.default_retries", 1)

	viper.SetDefault("log.level", "info")
	viper.SetDefault("log.format", "json")
	viper.SetDefault("log.output", "stdout")

	// Set config file path
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get home directory: %w", err)
	}

	configDir := filepath.Join(homeDir, ".holehunter")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create config directory: %w", err)
	}

	configFile := filepath.Join(configDir, "config.yaml")
	viper.SetConfigFile(configFile)

	viper.SetConfigType("yaml")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		// Config file doesn't exist, create default
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			if err := viper.SafeWriteConfigAs(configFile); err != nil {
				return nil, fmt.Errorf("failed to create default config: %w", err)
			}
		} else {
			return nil, fmt.Errorf("failed to read config: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &config, nil
}
