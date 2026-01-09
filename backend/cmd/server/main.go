package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/holehunter/backend/internal/api"
	"github.com/holehunter/backend/internal/database"
	"github.com/holehunter/backend/internal/services"
	"github.com/holehunter/backend/pkg/config"
	"go.uber.org/zap"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("Failed to create logger: %v", err)
	}
	defer logger.Sync()

	zap.ReplaceGlobals(logger)

	zap.L().Info("Starting HoleHunter backend server",
		zap.String("version", "1.0.0"),
		zap.String("port", cfg.Server.Port),
	)

	// Initialize database
	db, err := database.Initialize(cfg.Database.Path)
	if err != nil {
		zap.L().Fatal("Failed to initialize database", zap.Error(err))
	}
	defer db.Close()

	// Initialize services
	targetService := services.NewTargetService(db)
	scanService := services.NewScanService(db, &cfg.Nuclei)
	vulnService := services.NewVulnerabilityService(db)

	// Setup router
	router := api.SetupRouter(cfg, targetService, scanService, vulnService)

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
	}

	// Start server in a goroutine
	go func() {
		zap.L().Info("Server started", zap.String("address", srv.Addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			zap.L().Fatal("Server failed", zap.Error(err))
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	zap.L().Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		zap.L().Fatal("Server forced to shutdown", zap.Error(err))
	}

	zap.L().Info("Server exited")
}
