package app

import (
	"errors"
	"github.com/holehunter/holehunter/internal/models"
)

// ==================== Target ====================

// GetAllTargets 获取所有目标
func (a *App) GetAllTargets() ([]*models.Target, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.targetHandler.GetAll(a.ctx)
}

// GetTargetByID 根据 ID 获取目标
func (a *App) GetTargetByID(id int) (*models.Target, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.targetHandler.GetByID(a.ctx, id)
}

// CreateTarget 创建目标
func (a *App) CreateTarget(name, url, description string, tags []string) (*models.Target, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.targetHandler.Create(a.ctx, name, url, description, tags)
}

// UpdateTarget 更新目标
func (a *App) UpdateTarget(id int, name, url, description string, tags []string) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.targetHandler.Update(a.ctx, id, name, url, description, tags)
}

// DeleteTarget 删除目标
func (a *App) DeleteTarget(id int) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.targetHandler.Delete(a.ctx, id)
}

// ==================== Scan ====================

// GetAllScanTasks 获取所有扫描任务
func (a *App) GetAllScanTasks() ([]*models.ScanTask, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.scanHandler.GetAll(a.ctx)
}

// GetScanTaskByID 根据 ID 获取扫描任务
func (a *App) GetScanTaskByID(id int) (*models.ScanTask, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.scanHandler.GetByID(a.ctx, id)
}

// GetScanTasksByTargetID 根据目标 ID 获取扫描任务
func (a *App) GetScanTasksByTargetID(targetID int) ([]*models.ScanTask, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.scanHandler.GetByTargetID(a.ctx, targetID)
}

// CreateScanTask 创建扫描任务
func (a *App) CreateScanTask(name string, targetID int, strategy string, templates []string) (*models.ScanTask, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.scanHandler.Create(a.ctx, name, targetID, strategy, templates)
}

// StartScan 启动扫描任务
func (a *App) StartScan(taskID int) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.scanHandler.Start(a.ctx, taskID)
}

// StopScan 停止扫描任务
func (a *App) StopScan(taskID int) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.scanHandler.Stop(a.ctx, taskID)
}

// GetScanProgress 获取扫描进度
func (a *App) GetScanProgress(taskID int) (*models.ScanProgress, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.scanHandler.GetProgress(a.ctx, taskID)
}

// DeleteScanTask 删除扫描任务
func (a *App) DeleteScanTask(id int) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.scanHandler.Delete(a.ctx, id)
}

// GetNucleiStatus 获取 Nuclei 状态
func (a *App) GetNucleiStatus() *models.NucleiStatus {
	if a.scanHandler == nil {
		return &models.NucleiStatus{Installed: false, Version: ""}
	}
	return a.scanHandler.GetNucleiStatus()
}

// ==================== Vulnerability ====================

// GetAllVulnerabilities 获取所有漏洞
func (a *App) GetAllVulnerabilities() ([]*models.Vulnerability, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.vulnHandler.GetAll(a.ctx)
}

// GetVulnerabilitiesByTaskID 根据任务 ID 获取漏洞列表
func (a *App) GetVulnerabilitiesByTaskID(taskID int) ([]*models.Vulnerability, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.vulnHandler.GetByTaskID(a.ctx, taskID)
}

// GetVulnerabilityByID 根据 ID 获取漏洞
func (a *App) GetVulnerabilityByID(id int) (*models.Vulnerability, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.vulnHandler.GetByID(a.ctx, id)
}

// MarkVulnerabilityFalsePositive 标记误报
func (a *App) MarkVulnerabilityFalsePositive(id int, falsePositive bool) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.vulnHandler.MarkFalsePositive(a.ctx, id, falsePositive)
}

// UpdateVulnerabilityNotes 更新漏洞备注
func (a *App) UpdateVulnerabilityNotes(id int, notes string) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.vulnHandler.UpdateNotes(a.ctx, id, notes)
}

// DeleteVulnerability 删除漏洞
func (a *App) DeleteVulnerability(id int) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.vulnHandler.Delete(a.ctx, id)
}

// GetVulnerabilitiesPage 获取分页漏洞
func (a *App) GetVulnerabilitiesPage(page, pageSize int) ([]*models.Vulnerability, int, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, 0, err
	}
	return a.vulnHandler.GetPage(a.ctx, page, pageSize)
}

// GetVulnerabilitiesPageByFilter 根据过滤条件获取分页漏洞
func (a *App) GetVulnerabilitiesPageByFilter(filter *models.VulnerabilityFilter, page, pageSize int) ([]*models.Vulnerability, int, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, 0, err
	}
	return a.vulnHandler.GetPageByFilter(a.ctx, filter, page, pageSize)
}

// ==================== Template ====================

// GetAllTemplates 获取所有模板
func (a *App) GetAllTemplates() ([]*models.Template, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.templateHandler.GetAll(a.ctx)
}

// GetTemplateByID 根据 ID 获取模板
func (a *App) GetTemplateByID(id int) (*models.Template, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.templateHandler.GetByID(a.ctx, id)
}

// GetTemplatesPage 获取分页模板
func (a *App) GetTemplatesPage(page, pageSize int) ([]*models.Template, int, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, 0, err
	}
	return a.templateHandler.GetPage(a.ctx, page, pageSize)
}

// GetTemplatesPageByFilter 根据过滤条件获取分页模板
func (a *App) GetTemplatesPageByFilter(filter *models.TemplateFilterUnified, page, pageSize int) ([]*models.Template, int, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, 0, err
	}
	return a.templateHandler.GetPageByFilter(a.ctx, filter, page, pageSize)
}

// GetTemplateStats 获取模板统计信息
func (a *App) GetTemplateStats() (map[string]int, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.templateHandler.GetStats(a.ctx)
}

// GetTemplateCategories 获取所有模板分类
func (a *App) GetTemplateCategories() ([]string, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.templateHandler.GetCategories(a.ctx)
}

// GetTemplateAuthors 获取所有模板作者
func (a *App) GetTemplateAuthors() ([]string, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.templateHandler.GetAuthors(a.ctx)
}

// GetTemplateSeverities 获取所有模板严重级别
func (a *App) GetTemplateSeverities() ([]string, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.templateHandler.GetSeverities(a.ctx)
}

// CreateCustomTemplate 创建自定义模板
func (a *App) CreateCustomTemplate(req *models.CreateTemplateRequest) (*models.Template, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.templateHandler.CreateCustomTemplate(a.ctx, req)
}

// UpdateCustomTemplate 更新自定义模板
func (a *App) UpdateCustomTemplate(id int, req *models.UpdateTemplateRequest) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.templateHandler.UpdateCustomTemplate(a.ctx, id, req)
}

// DeleteCustomTemplate 删除自定义模板
func (a *App) DeleteCustomTemplate(id int) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.templateHandler.DeleteCustomTemplate(a.ctx, id)
}

// ToggleCustomTemplate 切换自定义模板启用状态
func (a *App) ToggleCustomTemplate(id int, enabled bool) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.templateHandler.ToggleCustomTemplate(a.ctx, id, enabled)
}

// ==================== Dashboard ====================

// GetDashboardStats 获取仪表板统计数据
func (a *App) GetDashboardStats() (*models.DashboardStats, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.dashboardHandler.GetStats(a.ctx)
}

// ==================== Scenario Group ====================

// GetAllScenarioGroups 获取所有场景分组
func (a *App) GetAllScenarioGroups() ([]*models.ScenarioGroup, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.scenarioHandler.GetAll(a.ctx)
}

// GetScenarioGroupByID 根据 ID 获取场景分组
func (a *App) GetScenarioGroupByID(id string) (*models.ScenarioGroup, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.scenarioHandler.GetByID(a.ctx, id)
}

// CreateScenarioGroup 创建场景分组
func (a *App) CreateScenarioGroup(id, name, description string, templateIDs []string) (*models.ScenarioGroup, error) {
	if err := a.checkInitialized(); err != nil {
		return nil, err
	}
	return a.scenarioHandler.Create(a.ctx, id, name, description, templateIDs)
}

// UpdateScenarioGroup 更新场景分组
func (a *App) UpdateScenarioGroup(id string, name, description *string, templateIDs []string) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.scenarioHandler.Update(a.ctx, id, name, description, templateIDs)
}

// DeleteScenarioGroup 删除场景分组
func (a *App) DeleteScenarioGroup(id string) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.scenarioHandler.Delete(a.ctx, id)
}

// AddTemplatesToScenarioGroup 添加模板到场景分组
func (a *App) AddTemplatesToScenarioGroup(id string, templateIDs []string) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.scenarioHandler.AddTemplates(a.ctx, id, templateIDs)
}

// RemoveTemplatesFromScenarioGroup 从场景分组移除模板
func (a *App) RemoveTemplatesFromScenarioGroup(id string, templateIDs []string) error {
	if err := a.checkInitialized(); err != nil {
		return err
	}
	return a.scenarioHandler.RemoveTemplates(a.ctx, id, templateIDs)
}

// ==================== HTTP Request/Response ====================

// GetAllHttpRequests 获取所有 HTTP 请求
func (a *App) GetAllHttpRequests() ([]*models.HttpRequest, error) {
	if a.httpHandler == nil {
		return nil, errors.New("http handler not initialized")
	}
	return a.httpHandler.GetAllRequests(a.ctx)
}

// GetHttpRequestByID 根据 ID 获取 HTTP 请求
func (a *App) GetHttpRequestByID(id int) (*models.HttpRequest, error) {
	if a.httpHandler == nil {
		return nil, errors.New("http handler not initialized")
	}
	return a.httpHandler.GetRequestByID(a.ctx, id)
}

// CreateHttpRequest 创建 HTTP 请求
func (a *App) CreateHttpRequest(name, method, url string, headers map[string]string, body, contentType string, tags []string) (*models.HttpRequest, error) {
	if a.httpHandler == nil {
		return nil, errors.New("http handler not initialized")
	}
	return a.httpHandler.CreateRequest(a.ctx, name, method, url, headers, body, contentType, tags)
}

// UpdateHttpRequest 更新 HTTP 请求
func (a *App) UpdateHttpRequest(id int, name, method, url *string, headers map[string]string, body, contentType *string, tags []string) error {
	if a.httpHandler == nil {
		return errors.New("http handler not initialized")
	}
	return a.httpHandler.UpdateRequest(a.ctx, id, name, method, url, headers, body, contentType, tags)
}

// DeleteHttpRequest 删除 HTTP 请求
func (a *App) DeleteHttpRequest(id int) error {
	if a.httpHandler == nil {
		return errors.New("http handler not initialized")
	}
	return a.httpHandler.DeleteRequest(a.ctx, id)
}

// SendHttpRequest 发送 HTTP 请求
func (a *App) SendHttpRequest(requestID int, timeoutSec int) (*models.HttpResponse, error) {
	if a.httpHandler == nil {
		return nil, errors.New("http handler not initialized")
	}
	return a.httpHandler.SendRequest(a.ctx, requestID, timeoutSec)
}

// ==================== Port Scan ====================

// CreatePortScanTask 创建端口扫描任务
func (a *App) CreatePortScanTask(target string, ports []int, timeout, batchSize int) (int, error) {
	if a.portScanHandler == nil {
		return 0, errors.New("port scan handler not initialized")
	}
	return a.portScanHandler.CreateTask(a.ctx, target, ports, timeout, batchSize)
}

// GetPortScanResults 获取端口扫描结果
func (a *App) GetPortScanResults(taskID int) ([]*models.PortScanResult, error) {
	if a.portScanHandler == nil {
		return nil, errors.New("port scan handler not initialized")
	}
	return a.portScanHandler.GetResults(a.ctx, taskID)
}

// ==================== Domain Brute ====================

// CreateDomainBruteTask 创建域名暴力破解任务
func (a *App) CreateDomainBruteTask(domain string, wordlist []string, timeout, batchSize int) (int, error) {
	if a.domainBruteHandler == nil {
		return 0, errors.New("domain brute handler not initialized")
	}
	return a.domainBruteHandler.CreateTask(a.ctx, domain, wordlist, timeout, batchSize)
}

// GetDomainBruteResults 获取域名暴力破解结果
func (a *App) GetDomainBruteResults(taskID int) ([]*models.DomainBruteResult, error) {
	if a.domainBruteHandler == nil {
		return nil, errors.New("domain brute handler not initialized")
	}
	return a.domainBruteHandler.GetResults(a.ctx, taskID)
}

// ==================== Brute ====================

// GetAllBruteTasks 获取所有暴力破解任务
func (a *App) GetAllBruteTasks() ([]*models.BruteTask, error) {
	if a.bruteHandler == nil {
		return nil, errors.New("brute handler not initialized")
	}
	return a.bruteHandler.GetAllTasks(a.ctx)
}

// CreateBruteTask 创建暴力破解任务
func (a *App) CreateBruteTask(name string, requestID int, bruteType string) (int, error) {
	if a.bruteHandler == nil {
		return 0, errors.New("brute handler not initialized")
	}
	return a.bruteHandler.CreateTask(a.ctx, name, requestID, bruteType)
}

// DeleteBruteTask 删除暴力破解任务
func (a *App) DeleteBruteTask(id int) error {
	if a.bruteHandler == nil {
		return errors.New("brute handler not initialized")
	}
	return a.bruteHandler.DeleteTask(a.ctx, id)
}

// GetAllBrutePayloadSets 获取所有载荷集
func (a *App) GetAllBrutePayloadSets() ([]*models.BrutePayloadSet, error) {
	if a.bruteHandler == nil {
		return nil, errors.New("brute handler not initialized")
	}
	return a.bruteHandler.GetAllPayloadSets(a.ctx)
}

// CreateBrutePayloadSet 创建载荷集
func (a *App) CreateBrutePayloadSet(name string, bruteType string, config map[string]interface{}) (int, error) {
	if a.bruteHandler == nil {
		return 0, errors.New("brute handler not initialized")
	}
	return a.bruteHandler.CreatePayloadSet(a.ctx, name, bruteType, config)
}
