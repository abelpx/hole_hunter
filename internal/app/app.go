package app

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/holehunter/holehunter/internal/assets"
	"github.com/holehunter/holehunter/internal/handler"
	"github.com/holehunter/holehunter/internal/infrastructure/config"
	"github.com/holehunter/holehunter/internal/infrastructure/database"
	appEvent "github.com/holehunter/holehunter/internal/infrastructure/event"
	"github.com/holehunter/holehunter/internal/infrastructure/logger"
	"github.com/holehunter/holehunter/internal/repo"
	"github.com/holehunter/holehunter/internal/svc"
	"github.com/holehunter/holehunter/internal/sync"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App 应用主结构
type App struct {
	ctx      context.Context
	config   *config.Config
	db       *sql.DB
	eventBus *appEvent.Bus
	logger   *logger.Logger

	// Handlers
	targetHandler      *handler.TargetHandler
	scanHandler        *handler.ScanHandler
	vulnHandler        *handler.VulnerabilityHandler
	templateHandler    *handler.TemplateHandler
	dashboardHandler   *handler.DashboardHandler
	scenarioHandler    *handler.ScenarioHandler
	httpHandler        *handler.HTTPHandler
	portScanHandler    *handler.PortScanHandler
	domainBruteHandler *handler.DomainBruteHandler
	bruteHandler       *handler.BruteHandler
	reportHandler      *handler.ReportHandler
}

// NewApp 创建新应用
func NewApp() *App {
	return &App{}
}

// Startup 应用启动
func (a *App) Startup(ctx context.Context) {
	if err := a.startup(ctx); err != nil {
		a.logger.Error("Application startup failed: %v", err)
		// 显示错误对话框
		if a.ctx != nil {
			runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
				Type:          runtime.ErrorDialog,
				Title:         "启动失败",
				Message:       fmt.Sprintf("应用启动失败: %v\n\n请检查数据库文件是否损坏，尝试删除后重启动。", err),
				Buttons:       []string{"确定"},
				DefaultButton: "确定",
			})
		}
	}
}

// startup 应用启动（内部方法）
func (a *App) startup(ctx context.Context) error {
	a.ctx = ctx

	// 加载配置
	a.config = config.Load()

	// 初始化日志
	a.logger = logger.New(a.config.LogLevel, a.config.LogFile)

	// 初始化资源（nuclei.exe + templates）- 必须在数据库之前
	if err := a.initResources(ctx); err != nil {
		a.logger.Warn("Resource initialization failed: %v", err)
		// 不阻塞启动，但记录警告
	}

	// 初始化数据库
	db, err := database.Open(a.config.DBPath)
	if err != nil {
		a.logger.Error("Failed to open database: %v", err)
		return err
	}
	a.db = db

	// 初始化数据库表结构
	if err := database.InitSchema(db); err != nil {
		a.logger.Error("Failed to initialize schema: %v", err)
		return err
	}

	// 初始化事件总线
	a.eventBus = appEvent.NewBus()

	// 初始化各个层
	a.initLayers()

	// 同步内置模板到数据库
	if err := a.syncTemplates(ctx); err != nil {
		a.logger.Warn("Failed to sync builtin templates: %v", err)
		// 不阻塞启动，只记录警告
	}

	// 设置事件转发
	a.setupEventForwarding()

	a.logger.Info("HoleHunter started successfully")
	return nil
}

// initResources 初始化资源（nuclei.exe + templates）
func (a *App) initResources(ctx context.Context) error {
	return assets.InitResources(a.config.DataDir, a.logger)
}

// GetResourceStatus 获取资源状态（供前端调用）
func (a *App) GetResourceStatus() map[string]interface{} {
	return assets.GetResourceStatus(a.config.DataDir)
}

// UpdateTemplates 更新模板（供前端调用）
func (a *App) UpdateTemplates(ctx context.Context) error {
	a.logger.Info("Updating nuclei-templates...")
	// 触发重新下载模板
	return assets.InitResources(a.config.DataDir, a.logger)
}

// initLayers 初始化各个层
func (a *App) initLayers() {
	// 初始化 Repository
	targetRepo := repo.NewTargetRepository(a.db)
	scanRepo := repo.NewScanRepository(a.db, a.logger)
	vulnRepo := repo.NewVulnerabilityRepository(a.db)
	dashboardRepo := repo.NewDashboardRepository(a.db)
	templateRepo := repo.NewTemplateRepository(a.db)
	scenarioRepo := repo.NewScenarioRepository(a.db)
	httpRequestRepo := repo.NewHTTPRequestRepository(a.db)
	httpResponseRepo := repo.NewHTTPResponseRepository(a.db)
	portScanRepo := repo.NewPortScanRepository(a.db)
	domainBruteRepo := repo.NewDomainBruteRepository(a.db)
	bruteRepo := repo.NewBruteRepository(a.db)
	reportRepo := repo.NewReportRepository(a.db)

	// 初始化 Service
	targetSvc := svc.NewTargetService(targetRepo, a.eventBus)
	scanSvc := svc.NewScanService(scanRepo, targetRepo, a.eventBus, a.logger, a.config)
	vulnSvc := svc.NewVulnerabilityService(vulnRepo)
	dashboardSvc := svc.NewDashboardService(dashboardRepo)
	templateSvc := svc.NewTemplateService(templateRepo)
	scenarioSvc := svc.NewScenarioService(scenarioRepo)
	httpSvc := svc.NewHTTPService(httpRequestRepo, httpResponseRepo)
	portScanSvc := svc.NewPortScanService(portScanRepo)
	domainBruteSvc := svc.NewDomainBruteService(domainBruteRepo)
	bruteSvc := svc.NewBruteService(bruteRepo)
	reportSvc := svc.NewReportService(reportRepo, scanRepo, vulnRepo, a.config.DataDir)

	// 初始化 Handler
	a.targetHandler = handler.NewTargetHandler(targetSvc)
	a.scanHandler = handler.NewScanHandler(scanSvc)
	a.vulnHandler = handler.NewVulnerabilityHandler(vulnSvc)
	a.dashboardHandler = handler.NewDashboardHandler(dashboardSvc)
	a.templateHandler = handler.NewTemplateHandler(templateSvc)
	a.scenarioHandler = handler.NewScenarioHandler(scenarioSvc)
	a.httpHandler = handler.NewHTTPHandler(httpSvc)
	a.portScanHandler = handler.NewPortScanHandler(portScanSvc)
	a.domainBruteHandler = handler.NewDomainBruteHandler(domainBruteSvc)
	a.bruteHandler = handler.NewBruteHandler(bruteSvc)
	a.reportHandler = handler.NewReportHandler(reportSvc)

	// 设置事件处理器（处理业务逻辑事件）
	eventHandler := appEvent.NewEventHandler(vulnSvc, a.logger)
	a.setupEventHandlers(eventHandler)
}

// Shutdown 应用关闭
func (a *App) Shutdown(ctx context.Context) {
	a.logger.Info("Shutting down HoleHunter...")

	if a.logger != nil {
		a.logger.Close()
	}

	if a.db != nil {
		a.db.Close()
	}
}

// isInitialized 检查应用是否已正确初始化
func (a *App) isInitialized() bool {
	return a.targetHandler != nil &&
		a.scanHandler != nil &&
		a.vulnHandler != nil &&
		a.dashboardHandler != nil &&
		a.templateHandler != nil &&
		a.scenarioHandler != nil
}

// checkInitialized 检查应用是否已初始化，如果未初始化则返回错误
func (a *App) checkInitialized() error {
	if !a.isInitialized() {
		return fmt.Errorf("application not properly initialized")
	}
	return nil
}

// setupEventHandlers 设置事件处理器（处理业务逻辑事件）
func (a *App) setupEventHandlers(handler *appEvent.EventHandlerImpl) {
	// 漏洞事件
	a.eventBus.Subscribe(appEvent.EventVulnFound, func(ctx context.Context, e appEvent.Event) error {
		if data, ok := e.Data.(map[string]interface{}); ok {
			if err := handler.HandleEventVulnFound(ctx, data); err != nil {
				a.logger.Error("Failed to handle vuln found: %v", err)
			}
		}
		// 转发到前端
		runtime.EventsEmit(a.ctx, "vulnerability.found", e.Data)
		return nil
	})
}

// setupEventForwarding 设置事件转发到前端
func (a *App) setupEventForwarding() {
	// 扫描事件
	a.eventBus.Subscribe(appEvent.EventScanStarted, func(ctx context.Context, e appEvent.Event) error {
		runtime.EventsEmit(a.ctx, "scan.started", e.Data)
		return nil
	})

	a.eventBus.Subscribe(appEvent.EventScanProgress, func(ctx context.Context, e appEvent.Event) error {
		runtime.EventsEmit(a.ctx, "scan.progress", e.Data)
		return nil
	})

	a.eventBus.Subscribe(appEvent.EventScanCompleted, func(ctx context.Context, e appEvent.Event) error {
		runtime.EventsEmit(a.ctx, "scan.completed", e.Data)
		return nil
	})

	a.eventBus.Subscribe(appEvent.EventScanFailed, func(ctx context.Context, e appEvent.Event) error {
		runtime.EventsEmit(a.ctx, "scan.failed", e.Data)
		return nil
	})

	a.eventBus.Subscribe(appEvent.EventScanStopped, func(ctx context.Context, e appEvent.Event) error {
		runtime.EventsEmit(a.ctx, "scan.stopped", e.Data)
		return nil
	})

	// 目标事件
	a.eventBus.Subscribe(appEvent.EventTargetCreated, func(ctx context.Context, e appEvent.Event) error {
		runtime.EventsEmit(a.ctx, "target.created", e.Data)
		return nil
	})

	a.eventBus.Subscribe(appEvent.EventTargetDeleted, func(ctx context.Context, e appEvent.Event) error {
		runtime.EventsEmit(a.ctx, "target.deleted", e.Data)
		return nil
	})

	// Brute 事件
	a.eventBus.Subscribe(appEvent.EventBruteStarted, func(ctx context.Context, e appEvent.Event) error {
		runtime.EventsEmit(a.ctx, "brute.started", e.Data)
		return nil
	})

	a.eventBus.Subscribe(appEvent.EventBruteProgress, func(ctx context.Context, e appEvent.Event) error {
		runtime.EventsEmit(a.ctx, "brute.progress", e.Data)
		return nil
	})

	a.eventBus.Subscribe(appEvent.EventBruteCompleted, func(ctx context.Context, e appEvent.Event) error {
		runtime.EventsEmit(a.ctx, "brute.completed", e.Data)
		return nil
	})

	a.eventBus.Subscribe(appEvent.EventBruteFailed, func(ctx context.Context, e appEvent.Event) error {
		runtime.EventsEmit(a.ctx, "brute.failed", e.Data)
		return nil
	})
}

// LogFromFrontend 前端日志
func (a *App) LogFromFrontend(level, message string) {
	switch level {
	case "debug":
		a.logger.Debug("%s", message)
	case "info":
		a.logger.Info("%s", message)
	case "warn":
		a.logger.Warn("%s", message)
	case "error":
		a.logger.Error("%s", message)
	default:
		a.logger.Info("%s", message)
	}
}

// syncTemplates 同步内置模板到数据库
func (a *App) syncTemplates(ctx context.Context) error {
	// 创建模板同步器
	syncer := sync.NewTemplateSyncer(
		a.templateHandler.GetTemplateService(),
		a.config.TemplatesDir,
		a.logger,
	)

	// 执行同步
	return syncer.SyncBuiltinTemplates(ctx)
}
