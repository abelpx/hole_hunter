package api

import (
	"github.com/gin-gonic/gin"
	"github.com/holehunter/backend/internal/services"
	"github.com/holehunter/backend/pkg/config"
)

func SetupRouter(cfg *config.Config, targetService *services.TargetService, scanService *services.ScanService, vulnService *services.VulnerabilityService, reportService *services.ReportService, replayService *services.ReplayService, bruteService *services.BruteService) *gin.Engine {
	router := gin.Default()

	// Initialize additional services
	portScanner := services.NewPortScanner()
	domainBrute := services.NewDomainBruteService()

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

		// HTTP Replay
		replay := v1.Group("/replay")
		{
			replay.GET("", replayService.ListRequests)
			replay.POST("", replayService.CreateRequest)
			replay.GET("/:id", replayService.GetRequest)
			replay.PUT("/:id", replayService.UpdateRequest)
			replay.DELETE("/:id", replayService.DeleteRequest)
			replay.POST("/:id/send", replayService.SendRequest)
			replay.GET("/:id/responses", replayService.GetResponseHistory)
			replay.GET("/responses/:id", replayService.GetResponse)
			replay.POST("/import", replayService.ImportRequest)
		}

		// Brute Force
		brute := v1.Group("/brute")
		{
			brute.GET("/tasks", bruteService.ListBruteTasks)
			brute.POST("/tasks", bruteService.CreateBruteTask)
			brute.GET("/tasks/:id", bruteService.GetBruteTask)
			brute.DELETE("/tasks/:id", bruteService.DeleteBruteTask)
			brute.POST("/tasks/:id/start", bruteService.StartBruteTask)
			brute.POST("/tasks/:id/cancel", bruteService.CancelBruteTask)
			brute.GET("/tasks/:id/results", bruteService.GetBruteResults)
			brute.POST("/tasks/:id/analyze", bruteService.AnalyzeResults)
			brute.GET("/payload-sets", bruteService.ListPayloadSets)
			brute.POST("/payload-sets", bruteService.CreatePayloadSet)
			brute.POST("/payload-sets/import", bruteService.ImportPayloads)
		}

		// Tools
		tools := v1.Group("/tools")
		{
			// Port Scanner
			tools.POST("/portscan", func(c *gin.Context) {
				var options services.PortScanOptions
				if err := c.ShouldBindJSON(&options); err != nil {
					c.JSON(400, gin.H{"error": err.Error()})
					return
				}

				results, err := portScanner.ScanPorts(options)
				if err != nil {
					c.JSON(500, gin.H{"error": err.Error()})
					return
				}

				c.JSON(200, gin.H{
					"success": true,
					"data":    results,
				})
			})

			tools.GET("/portscan/common-ports", func(c *gin.Context) {
				c.JSON(200, gin.H{
					"success": true,
					"data":    services.CommonPorts(),
				})
			})

			// Domain Brute
			tools.POST("/domainbrute", func(c *gin.Context) {
				var options services.DomainBruteOptions
				if err := c.ShouldBindJSON(&options); err != nil {
					c.JSON(400, gin.H{"error": err.Error()})
					return
				}

				results, err := domainBrute.BruteSubdomains(options)
				if err != nil {
					c.JSON(500, gin.H{"error": err.Error()})
					return
				}

				c.JSON(200, gin.H{
					"success": true,
					"data":    results,
				})
			})

			tools.GET("/domainbrute/wordlist", func(c *gin.Context) {
				c.JSON(200, gin.H{
					"success": true,
					"data":    services.DefaultWordlist(),
				})
			})

			tools.GET("/domainbrute/:domain/records", func(c *gin.Context) {
				domain := c.Param("domain")
				recordType := c.Query("type")

				switch recordType {
				case "mx":
					records, err := domainBrute.CheckMXRecords(domain)
					if err != nil {
						c.JSON(500, gin.H{"error": err.Error()})
						return
					}
					c.JSON(200, gin.H{"success": true, "data": records})
				case "ns":
					records, err := domainBrute.CheckNSRecords(domain)
					if err != nil {
						c.JSON(500, gin.H{"error": err.Error()})
						return
					}
					c.JSON(200, gin.H{"success": true, "data": records})
				case "txt":
					records, err := domainBrute.CheckTXTRecords(domain)
					if err != nil {
						c.JSON(500, gin.H{"error": err.Error()})
						return
					}
					c.JSON(200, gin.H{"success": true, "data": records})
				default:
					c.JSON(400, gin.H{"error": "invalid record type"})
				}
			})
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
		"status":  "ok",
		"service": "holehunter-backend",
		"version": "1.0.0-alpha",
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
