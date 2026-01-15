package app

import (
	"github.com/holehunter/holehunter/internal/models"
)

// ==================== Target ====================

// GetAllTargets 获取所有目标
func (a *App) GetAllTargets() ([]*models.Target, error) {
	return a.targetHandler.GetAll(a.ctx)
}

// GetTargetByID 根据 ID 获取目标
func (a *App) GetTargetByID(id int) (*models.Target, error) {
	return a.targetHandler.GetByID(a.ctx, id)
}

// CreateTarget 创建目标
func (a *App) CreateTarget(name, url, description string, tags []string) (*models.Target, error) {
	return a.targetHandler.Create(a.ctx, name, url, description, tags)
}

// UpdateTarget 更新目标
func (a *App) UpdateTarget(id int, name, url, description string, tags []string) error {
	return a.targetHandler.Update(a.ctx, id, name, url, description, tags)
}

// DeleteTarget 删除目标
func (a *App) DeleteTarget(id int) error {
	return a.targetHandler.Delete(a.ctx, id)
}

// ==================== Scan ====================

// GetAllScanTasks 获取所有扫描任务
func (a *App) GetAllScanTasks() ([]*models.ScanTask, error) {
	return a.scanHandler.GetAll(a.ctx)
}

// GetScanTaskByID 根据 ID 获取扫描任务
func (a *App) GetScanTaskByID(id int) (*models.ScanTask, error) {
	return a.scanHandler.GetByID(a.ctx, id)
}

// GetScanTasksByTargetID 根据目标 ID 获取扫描任务
func (a *App) GetScanTasksByTargetID(targetID int) ([]*models.ScanTask, error) {
	return a.scanHandler.GetByTargetID(a.ctx, targetID)
}

// CreateScanTask 创建扫描任务
func (a *App) CreateScanTask(name string, targetID int, strategy string, templates []string) (*models.ScanTask, error) {
	return a.scanHandler.Create(a.ctx, name, targetID, strategy, templates)
}

// StartScan 启动扫描任务
func (a *App) StartScan(taskID int) error {
	return a.scanHandler.Start(a.ctx, taskID)
}

// StopScan 停止扫描任务
func (a *App) StopScan(taskID int) error {
	return a.scanHandler.Stop(a.ctx, taskID)
}

// GetScanProgress 获取扫描进度
func (a *App) GetScanProgress(taskID int) (*models.ScanProgress, error) {
	return a.scanHandler.GetProgress(a.ctx, taskID)
}

// DeleteScanTask 删除扫描任务
func (a *App) DeleteScanTask(id int) error {
	return a.scanHandler.Delete(a.ctx, id)
}

// GetNucleiStatus 获取 Nuclei 状态
func (a *App) GetNucleiStatus() *models.NucleiStatus {
	return a.scanHandler.GetNucleiStatus()
}

// ==================== Vulnerability ====================

// GetAllVulnerabilities 获取所有漏洞
func (a *App) GetAllVulnerabilities() ([]*models.Vulnerability, error) {
	return a.vulnHandler.GetAll(a.ctx)
}

// GetVulnerabilitiesByTaskID 根据任务 ID 获取漏洞列表
func (a *App) GetVulnerabilitiesByTaskID(taskID int) ([]*models.Vulnerability, error) {
	return a.vulnHandler.GetByTaskID(a.ctx, taskID)
}

// GetVulnerabilityByID 根据 ID 获取漏洞
func (a *App) GetVulnerabilityByID(id int) (*models.Vulnerability, error) {
	return a.vulnHandler.GetByID(a.ctx, id)
}

// MarkVulnerabilityFalsePositive 标记误报
func (a *App) MarkVulnerabilityFalsePositive(id int, falsePositive bool) error {
	return a.vulnHandler.MarkFalsePositive(a.ctx, id, falsePositive)
}

// UpdateVulnerabilityNotes 更新漏洞备注
func (a *App) UpdateVulnerabilityNotes(id int, notes string) error {
	return a.vulnHandler.UpdateNotes(a.ctx, id, notes)
}

// DeleteVulnerability 删除漏洞
func (a *App) DeleteVulnerability(id int) error {
	return a.vulnHandler.Delete(a.ctx, id)
}

// ==================== Template ====================

// GetAllTemplates 获取所有模板
func (a *App) GetAllTemplates() ([]*models.NucleiTemplate, error) {
	return a.templateHandler.GetAll(a.ctx)
}

// GetTemplatesByCategory 根据分类获取模板
func (a *App) GetTemplatesByCategory(category string) ([]*models.NucleiTemplate, error) {
	return a.templateHandler.GetByCategory(a.ctx, category)
}

// GetTemplatesBySeverity 根据严重级别获取模板
func (a *App) GetTemplatesBySeverity(severity string) ([]*models.NucleiTemplate, error) {
	return a.templateHandler.GetBySeverity(a.ctx, severity)
}

// GetTemplateByID 根据 ID 获取模板
func (a *App) GetTemplateByID(id string) (*models.NucleiTemplate, error) {
	return a.templateHandler.GetByID(a.ctx, id)
}

// GetTemplateCategories 获取所有模板分类
func (a *App) GetTemplateCategories() ([]string, error) {
	return a.templateHandler.GetCategories(a.ctx)
}

// GetTemplateSeverities 获取所有模板严重级别
func (a *App) GetTemplateSeverities() ([]string, error) {
	return a.templateHandler.GetSeverities(a.ctx)
}

// ==================== Dashboard ====================

// GetDashboardStats 获取仪表板统计数据
func (a *App) GetDashboardStats() (*models.DashboardStats, error) {
	return a.dashboardHandler.GetStats(a.ctx)
}

// ==================== Scenario Group ====================

// GetAllScenarioGroups 获取所有场景分组
func (a *App) GetAllScenarioGroups() ([]*models.ScenarioGroup, error) {
	return a.scenarioHandler.GetAll(a.ctx)
}

// GetScenarioGroupByID 根据 ID 获取场景分组
func (a *App) GetScenarioGroupByID(id string) (*models.ScenarioGroup, error) {
	return a.scenarioHandler.GetByID(a.ctx, id)
}

// CreateScenarioGroup 创建场景分组
func (a *App) CreateScenarioGroup(id, name, description string, templateIDs []string) (*models.ScenarioGroup, error) {
	return a.scenarioHandler.Create(a.ctx, id, name, description, templateIDs)
}

// UpdateScenarioGroup 更新场景分组
func (a *App) UpdateScenarioGroup(id string, name, description *string, templateIDs []string) error {
	return a.scenarioHandler.Update(a.ctx, id, name, description, templateIDs)
}

// DeleteScenarioGroup 删除场景分组
func (a *App) DeleteScenarioGroup(id string) error {
	return a.scenarioHandler.Delete(a.ctx, id)
}

// AddTemplatesToScenarioGroup 添加模板到场景分组
func (a *App) AddTemplatesToScenarioGroup(id string, templateIDs []string) error {
	return a.scenarioHandler.AddTemplates(a.ctx, id, templateIDs)
}

// RemoveTemplatesFromScenarioGroup 从场景分组移除模板
func (a *App) RemoveTemplatesFromScenarioGroup(id string, templateIDs []string) error {
	return a.scenarioHandler.RemoveTemplates(a.ctx, id, templateIDs)
}

// ==================== HTTP Request/Response ====================

// GetAllHttpRequests 获取所有 HTTP 请求
func (a *App) GetAllHttpRequests() ([]*models.HttpRequest, error) {
	return a.httpHandler.GetAllRequests(a.ctx)
}

// GetHttpRequestByID 根据 ID 获取 HTTP 请求
func (a *App) GetHttpRequestByID(id int) (*models.HttpRequest, error) {
	return a.httpHandler.GetRequestByID(a.ctx, id)
}

// CreateHttpRequest 创建 HTTP 请求
func (a *App) CreateHttpRequest(name, method, url string, headers map[string]string, body, contentType string, tags []string) (*models.HttpRequest, error) {
	return a.httpHandler.CreateRequest(a.ctx, name, method, url, headers, body, contentType, tags)
}

// UpdateHttpRequest 更新 HTTP 请求
func (a *App) UpdateHttpRequest(id int, name, method, url *string, headers map[string]string, body, contentType *string, tags []string) error {
	return a.httpHandler.UpdateRequest(a.ctx, id, name, method, url, headers, body, contentType, tags)
}

// DeleteHttpRequest 删除 HTTP 请求
func (a *App) DeleteHttpRequest(id int) error {
	return a.httpHandler.DeleteRequest(a.ctx, id)
}

// SendHttpRequest 发送 HTTP 请求
func (a *App) SendHttpRequest(requestID int, timeoutSec int) (*models.HttpResponse, error) {
	return a.httpHandler.SendRequest(a.ctx, requestID, timeoutSec)
}

// ==================== Port Scan ====================

// CreatePortScanTask 创建端口扫描任务
func (a *App) CreatePortScanTask(target string, ports []int, timeout, batchSize int) (int, error) {
	return a.portScanHandler.CreateTask(a.ctx, target, ports, timeout, batchSize)
}

// GetPortScanResults 获取端口扫描结果
func (a *App) GetPortScanResults(taskID int) ([]*models.PortScanResult, error) {
	return a.portScanHandler.GetResults(a.ctx, taskID)
}

// ==================== Domain Brute ====================

// CreateDomainBruteTask 创建域名暴力破解任务
func (a *App) CreateDomainBruteTask(domain string, wordlist []string, timeout, batchSize int) (int, error) {
	return a.domainBruteHandler.CreateTask(a.ctx, domain, wordlist, timeout, batchSize)
}

// GetDomainBruteResults 获取域名暴力破解结果
func (a *App) GetDomainBruteResults(taskID int) ([]*models.DomainBruteResult, error) {
	return a.domainBruteHandler.GetResults(a.ctx, taskID)
}

// ==================== Brute ====================

// GetAllBruteTasks 获取所有暴力破解任务
func (a *App) GetAllBruteTasks() ([]*models.BruteTask, error) {
	return a.bruteHandler.GetAllTasks(a.ctx)
}

// CreateBruteTask 创建暴力破解任务
func (a *App) CreateBruteTask(name string, requestID int, bruteType string) (int, error) {
	return a.bruteHandler.CreateTask(a.ctx, name, requestID, bruteType)
}

// DeleteBruteTask 删除暴力破解任务
func (a *App) DeleteBruteTask(id int) error {
	return a.bruteHandler.DeleteTask(a.ctx, id)
}

// GetAllBrutePayloadSets 获取所有载荷集
func (a *App) GetAllBrutePayloadSets() ([]*models.BrutePayloadSet, error) {
	return a.bruteHandler.GetAllPayloadSets(a.ctx)
}

// CreateBrutePayloadSet 创建载荷集
func (a *App) CreateBrutePayloadSet(name string, bruteType string, config map[string]interface{}) (int, error) {
	return a.bruteHandler.CreatePayloadSet(a.ctx, name, bruteType, config)
}
