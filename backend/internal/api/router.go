package api

import (
	"github.com/gin-gonic/gin"
	"github.com/holehunter/backend/internal/services"
	"github.com/holehunter/backend/pkg/config"
)

func SetupRouter(cfg *config.Config, targetService *services.TargetService, scanService *services.ScanService, vulnService *services.VulnerabilityService, reportService *services.ReportService) *gin.Engine {
	router := gin.Default()

	// CORS middleware
	router.Use(CORSMiddleware())

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Target management
		targets := v1.Group("/targets")
		{
			targets.GET("", targetService.ListTargets)
			targets.POST("", targetService.CreateTarget)
			targets.GET("/:id", targetService.GetTarget)
			targets.PUT("/:id", targetService.UpdateTarget)
			targets.DELETE("/:id", targetService.DeleteTarget)
		}

		// Scan tasks
		scans := v1.Group("/scans")
		{
			scans.GET("", scanService.ListScans)
			scans.POST("", scanService.CreateScan)
			scans.GET("/:id", scanService.GetScan)
			scans.DELETE("/:id", scanService.CancelScan)
			scans.POST("/:id/start", scanService.StartScan)
		}

		// Vulnerabilities
		vulns := v1.Group("/vulnerabilities")
		{
			vulns.GET("", vulnService.ListVulnerabilities)
			vulns.GET("/:id", vulnService.GetVulnerability)
			vulns.PUT("/:id", vulnService.UpdateVulnerability)
			vulns.DELETE("/:id", vulnService.DeleteVulnerability)
		}

		// Templates
		templates := v1.Group("/templates")
		{
			templates.GET("", vulnService.ListTemplates)
			templates.GET("/categories", vulnService.ListTemplateCategories)
		}

		// Statistics
		stats := v1.Group("/stats")
		{
			stats.GET("/dashboard", vulnService.GetDashboardStats)
		}

		// Configuration
		config := v1.Group("/config")
		{
			config.GET("", GetConfig)
			config.PUT("", UpdateConfig)
		}

		// Reports
		reports := v1.Group("/reports")
		{
			reports.POST("/export", reportService.ExportReport)
		}

		// Health check
		v1.GET("/health", HealthCheck)

		// WebSocket endpoint
		v1.GET("/ws", func(c *gin.Context) {
			scanService.GetWebSocketHub().HandleWebSocket(c)
		})
	}

	return router
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func HealthCheck(c *gin.Context) {
	c.JSON(200, gin.H{
		"status": "ok",
		"message": "HoleHunter backend is running",
	})
}

func GetConfig(c *gin.Context) {
	// TODO: Implement config retrieval
	c.JSON(200, gin.H{})
}

func UpdateConfig(c *gin.Context) {
	// TODO: Implement config update
	c.JSON(200, gin.H{})
}
