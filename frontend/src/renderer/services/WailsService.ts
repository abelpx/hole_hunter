/**
 * Wails 服务层
 * 使用 Wails 生成的 Go 绑定来替代 Electron IPC
 * 在浏览器环境下自动切换到 Mock 服务
 */

import { mockService } from './MockService';
import {
  Target,
  Vulnerability,
  ScanTask,
  CreateTargetRequest,
  UpdateTargetRequest,
  CreateScanRequest,
  HttpRequest,
  HttpResponse,
  CreateHttpRequest,
  BruteTask,
  BrutePayloadSet,
  BruteResult,
} from '../types';

// 导入 Wails 自动生成的绑定
// 使用相对路径，从 src/renderer/services 导入 wailsjs
import * as WailsApp from '../../../wailsjs/wailsjs/go/main/App';

// 运行环境类型
type RuntimeEnvironment = 'wails' | 'electron' | 'browser';

// Wails 绑定的类型定义（用于浏览器模式）
interface WailsBindings {
  GetAllTargets(): Promise<any[]>;
  GetTargetByID(id: number): Promise<any>;
  CreateTarget(name: string, url: string, description: string, tags: string[]): Promise<number>;
  UpdateTarget(id: number, name: string, url: string, description: string, tags: string[]): Promise<void>;
  DeleteTarget(id: number): Promise<void>;
  GetAllScanTasks(): Promise<any[]>;
  GetScanTaskByID(id: number): Promise<any>;
  CreateScanTask(targetId: number, strategy: string, templates: string[]): Promise<number>;
  UpdateScanTaskStatus(id: number, status: string): Promise<void>;
  DeleteScanTask(id: number): Promise<void>;
  GetAllVulnerabilities(): Promise<any[]>;
  GetVulnerabilityByID(id: number): Promise<any>;
  UpdateVulnerability(id: number, falsePositive: boolean, notes: string): Promise<void>;
  DeleteVulnerability(id: number): Promise<void>;
  HealthCheck(): Promise<boolean>;
  GetDashboardStats(): Promise<any>;
  GetDatabaseInfo(): Promise<any>;
  GetAllHttpRequests(): Promise<any[]>;
  GetHttpRequestByID(id: number): Promise<any>;
  CreateHttpRequest(name: string, method: string, url: string, headers: any, body: string, contentType: string, tags: string[]): Promise<number>;
  UpdateHttpRequest(id: number, name: string, method: string, url: string, headers: any, body: string, contentType: string, tags: string[]): Promise<void>;
  DeleteHttpRequest(id: number): Promise<void>;
  GetHttpResponseHistory(requestId: number): Promise<any[]>;
  GetAllBruteTasks(): Promise<any[]>;
  CreateBruteTask(name: string, requestId: number, type: string): Promise<number>;
  DeleteBruteTask(id: number): Promise<void>;
  GetAllBrutePayloadSets(): Promise<any[]>;
  CreateBrutePayloadSet(name: string, type: string, config: any): Promise<number>;
  CreatePortScanTask(target: string, ports: number[], timeout: number, batchSize: number): Promise<number>;
  GetPortScanResults(taskId: number): Promise<any[]>;
  CreateDomainBruteTask(domain: string, wordlist: string[], timeout: number, batchSize: number): Promise<number>;
  GetDomainBruteResults(taskId: number): Promise<any[]>;
  // Custom Templates
  GetAllCustomTemplates(): Promise<any[]>;
  GetCustomTemplateByID(id: number): Promise<any>;
  CreateCustomTemplate(name: string, content: string): Promise<number>;
  UpdateCustomTemplate(id: number, name: string, content: string): Promise<void>;
  DeleteCustomTemplate(id: number): Promise<void>;
  ToggleCustomTemplate(id: number, enabled: boolean): Promise<void>;
  ValidateCustomTemplate(content: string): Promise<any>;
  GetCustomTemplatesStats(): Promise<any>;
}

interface WailsRuntime {
  EventsOn(event: string, callback: Function): void;
  EventsOff(event: string, callback?: Function): void;
  EventsEmit(event: string, data?: any): void;
}

// 获取 Wails 绑定 - 直接使用导入的模块
function getWailsApp(): WailsBindings | null {
  // 在 Wails 环境中，导入的 WailsApp 模块会自动绑定
  // 如果绑定失败（比如在浏览器环境），返回 null
  try {
    // 尝试调用一个简单的方法来测试绑定是否可用
    // 实际调用会在每个方法中进行
    return WailsApp as any;
  } catch (error) {
    console.log('[getWailsApp] Wails bindings not available:', error);
    return null;
  }
}

function getWailsRuntime(): WailsRuntime | null {
  if (typeof window === 'undefined') return null;

  const w = window as any;

  // 方式1: 直接从 window.runtime 获取
  if (w?.runtime?.EventsOn) {
    return w.runtime;
  }

  // 方式2: 从 window.wailsjs 获取
  if (w?.wailsjs?.runtime) {
    return w.wailsjs.runtime;
  }

  return null;
}

// 检测运行环境
function detectEnvironment(): RuntimeEnvironment {
  if (typeof window === 'undefined') {
    return 'browser';
  }

  const w = window as any;

  console.log('[detectEnvironment] Checking window object keys:', Object.keys(w).filter(k => k.includes('go') || k.includes('wails') || k.includes('Wails')));
  console.log('[detectEnvironment] window._WailsRuntime_:', (w as any)._WailsRuntime_);
  console.log('[detectEnvironment] window.go:', w.go);

  // 检测 Wails - 检查是否有 Wails 运行时
  // Wails v2 在打包后会有 _WailsRuntime_ 对象
  if ((w as any)._WailsRuntime_ !== undefined || w.go !== undefined) {
    console.log('[detectEnvironment] Detected Wails environment');
    return 'wails';
  }

  // 检测 Electron
  if (w.electronAPI !== undefined) {
    console.log('[detectEnvironment] Detected Electron environment');
    return 'electron';
  }

  console.log('[detectEnvironment] No desktop environment detected, using browser mode');
  return 'browser';
}

// 当前环境
const currentEnvironment = detectEnvironment();

// Wails 服务实现
class WailsServiceImpl {
  private getApp(): WailsBindings | null {
    // 直接返回导入的 WailsApp 模块
    // 在 Wails 环境中，这个模块会自动绑定到 Go 后端
    // 在浏览器环境中，调用会失败并返回 null
    return WailsApp as any;
  }

  private getRuntime(): WailsRuntime | null {
    return getWailsRuntime();
  }

  // ==================== 目标管理 ====================

  async getAllTargets(): Promise<Target[]> {
    console.log('[WailsService] getAllTargets called');
    const App = this.getApp();
    if (!App) {
      console.warn('[WailsService] getAllTargets: App not available, returning empty array');
      return [];
    }
    console.log('[WailsService] Calling App.GetAllTargets...');
    const targets = await App.GetAllTargets();
    console.log('[WailsService] GetAllTargets result:', targets);
    const result = targets ? targets.map(t => ({
      ...t,
      tags: t.tags || []
    })) : [];
    console.log('[WailsService] Returning', result.length, 'targets');
    return result;
  }

  async getTargetById(id: number): Promise<Target> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    const target = await App.GetTargetByID(id);
    return {
      ...target,
      tags: target.tags || []
    };
  }

  async createTarget(data: CreateTargetRequest): Promise<Target> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    const id = await App.CreateTarget(
      data.name,
      data.url,
      data.description || '',
      data.tags || []
    );
    return await this.getTargetById(Number(id));
  }

  async updateTarget(id: number, data: UpdateTargetRequest): Promise<Target> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.UpdateTarget(
      id,
      data.name,
      data.url,
      data.description || '',
      data.tags || []
    );
    return await this.getTargetById(id);
  }

  async deleteTarget(id: number): Promise<void> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.DeleteTarget(id);
  }

  async batchDeleteTargets(ids: number[]): Promise<void> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    for (const id of ids) {
      await App.DeleteTarget(id);
    }
  }

  // ==================== 扫描管理 ====================

  async createScan(data: CreateScanRequest): Promise<ScanTask> {
    console.log('[WailsService] createScan called with data:', data);
    const App = this.getApp();
    if (!App) {
      console.error('[WailsService] createScan: Wails bindings not available');
      throw new Error('Wails bindings not available');
    }
    console.log('[WailsService] Calling App.CreateScanTask...');
    const id = await App.CreateScanTask(
      data.name || null,
      data.target_id,
      data.strategy,
      data.templates || []
    );
    console.log('[WailsService] CreateScanTask returned id:', id);
    console.log('[WailsService] Calling App.GetScanTaskByID...');
    const scan = await App.GetScanTaskByID(Number(id));
    console.log('[WailsService] GetScanTaskByID returned:', scan);
    return scan;
  }

  async cancelScan(id: number): Promise<void> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.UpdateScanTaskStatus(id, 'cancelled');
  }

  async deleteScan(id: number): Promise<void> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.DeleteScanTask(id);
  }

  async getAllScans(): Promise<ScanTask[]> {
    const App = this.getApp();
    if (!App) return [];
    return await App.GetAllScanTasks() || [];
  }

  async getScanById(id: number): Promise<ScanTask> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    return await App.GetScanTaskByID(id);
  }

  async getScanProgress(id: number): Promise<any> {
    const App = this.getApp();
    if (!App) return { progress: 0, status: 'unknown' };
    const task = await App.GetScanTaskByID(id);
    return {
      progress: task.progress,
      status: task.status,
      total_templates: task.total_templates,
      executed_templates: task.executed_templates,
      current_template: task.current_template,
    };
  }

  async getScanLogs(id: number): Promise<string[]> {
    const App = this.getApp();
    if (!App) return [];
    const task = await App.GetScanTaskByID(id);
    if (task.logs && Array.isArray(task.logs)) {
      return task.logs;
    }
    return [];
  }

  // ==================== 漏洞管理 ====================

  async getAllVulnerabilities(): Promise<Vulnerability[]> {
    const App = this.getApp();
    if (!App) {
      console.warn('[WailsService] getAllVulnerabilities: App not available');
      return [];
    }
    console.log('[WailsService] Calling GetAllVulnerabilities...');
    const result = await App.GetAllVulnerabilities();
    console.log('[WailsService] GetAllVulnerabilities raw result:', result);
    console.log('[WailsService] Result length:', result?.length);
    if (!result) {
      console.warn('[WailsService] GetAllVulnerabilities returned null/undefined');
      return [];
    }

    // 转换 Go 后端格式到前端期望格式
    const mapped = result.map((v: any) => ({
      id: String(v.id),
      name: v.name,
      severity: v.severity || 'info',
      url: v.url || '',
      template_id: v.template_id || '',
      cve: v.cve ? [v.cve] : [],
      cvss: v.cvss,
      description: v.description || '',
      reference: [],
      tags: [], // Go 后端暂不支持 tags
      target_id: v.task_id || 0,
      scan_id: v.task_id || 0,
      discovered_at: v.matched_at || v.created_at,
      is_false_positive: v.false_positive || false,
      false_positive: v.false_positive || false, // 同时保留两个字段以兼容
      created_at: v.created_at,
    }));
    console.log('[WailsService] Mapped vulnerabilities:', mapped);
    return mapped;
  }

  async getVulnerabilityById(id: string): Promise<Vulnerability> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    const v = await App.GetVulnerabilityByID(Number(id));
    // 转换格式
    return {
      id: String(v.id),
      name: v.name,
      severity: v.severity || 'info',
      url: v.url || '',
      template_id: v.template_id || '',
      cve: v.cve ? [v.cve] : [],
      cvss: v.cvss,
      description: v.description || '',
      reference: [],
      tags: [],
      target_id: v.task_id || 0,
      scan_id: v.task_id || 0,
      discovered_at: v.matched_at || v.created_at,
      is_false_positive: v.false_positive || false,
      false_positive: v.false_positive || false,
      created_at: v.created_at,
    };
  }

  async updateVulnerability(id: string, data: any): Promise<Vulnerability> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.UpdateVulnerability(
      Number(id),
      data.false_positive || data.is_false_positive || false,
      data.notes || ''
    );
    return await this.getVulnerabilityById(id);
  }

  async markVulnerabilityAsFalsePositive(id: string, isFalsePositive: boolean): Promise<Vulnerability> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.UpdateVulnerability(
      Number(id),
      isFalsePositive,
      ''
    );
    return await this.getVulnerabilityById(id);
  }

  async deleteVulnerability(id: string): Promise<void> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.DeleteVulnerability(Number(id));
  }

  // ==================== 数据库 ====================

  async checkDatabaseHealth(): Promise<{ healthy: boolean; type: string; message?: string }> {
    const App = this.getApp();
    if (!App) {
      return {
        healthy: false,
        type: 'none',
        message: 'Wails bindings not available'
      };
    }
    try {
      await App.HealthCheck();
      return {
        healthy: true,
        type: 'sqlite'
      };
    } catch (error: any) {
      return {
        healthy: false,
        type: 'sqlite',
        message: error?.message || 'Database connection failed'
      };
    }
  }

  async getDatabaseStats(): Promise<any> {
    const App = this.getApp();
    if (!App) {
      return {
        total_targets: 0,
        total_scans: 0,
        running_scans: 0,
        total_vulnerabilities: 0,
        critical_vulns: 0,
        high_vulns: 0,
        medium_vulns: 0,
        low_vulns: 0,
      };
    }
    const stats = await App.GetDashboardStats();
    return {
      total_targets: stats.TotalTargets,
      total_scans: stats.TotalScans,
      running_scans: stats.RunningScans,
      total_vulnerabilities: stats.TotalVulnerabilities,
      critical_vulns: stats.CriticalVulns,
      high_vulns: stats.HighVulns,
      medium_vulns: stats.MediumVulns,
      low_vulns: stats.LowVulns,
    };
  }

  async getDatabaseInfo(): Promise<any> {
    const App = this.getApp();
    if (!App) {
      return {
        dbPath: 'N/A (Wails bindings not available)',
        databaseExists: false,
        tableStats: {},
      };
    }
    try {
      const info = await App.GetDatabaseInfo();
      console.log('[WailsService] Database info:', info);
      return info;
    } catch (error: any) {
      console.error('[WailsService] Failed to get database info:', error);
      return {
        dbPath: 'Error',
        error: error?.message || 'Unknown error',
        databaseExists: false,
        tableStats: {},
      };
    }
  }

  // ==================== 应用信息 ====================

  async getAppVersion(): Promise<string> {
    return '2.0.0';
  }

  getPlatform(): string {
    return 'desktop';
  }

  // ==================== 自定义 POC 模板 ====================

  async getAllCustomTemplates(): Promise<any[]> {
    const App = this.getApp();
    if (!App) return [];
    return await App.GetAllCustomTemplates() || [];
  }

  async getCustomTemplateById(id: number): Promise<any> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    return await App.GetCustomTemplateByID(id);
  }

  async createCustomTemplate(name: string, content: string): Promise<number> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    return await App.CreateCustomTemplate(name, content);
  }

  async updateCustomTemplate(id: number, name: string, content: string): Promise<void> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.UpdateCustomTemplate(id, name, content);
  }

  async deleteCustomTemplate(id: number): Promise<void> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.DeleteCustomTemplate(id);
  }

  async toggleCustomTemplate(id: number, enabled: boolean): Promise<void> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.ToggleCustomTemplate(id, enabled);
  }

  async validateCustomTemplate(content: string): Promise<any> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    return await App.ValidateCustomTemplate(content);
  }

  async getCustomTemplatesStats(): Promise<any> {
    const App = this.getApp();
    if (!App) return { total: 0, enabled: 0, disabled: 0 };
    return await App.GetCustomTemplatesStats();
  }

  // ==================== 事件监听 ====================

  onScanProgress(callback: Function): void {
    const runtime = this.getRuntime();
    if (runtime) runtime.EventsOn('scan-progress', callback);
  }

  onScanLog(callback: Function): void {
    const runtime = this.getRuntime();
    if (runtime) runtime.EventsOn('scan-log', callback);
  }

  onVulnFound(callback: Function): void {
    const runtime = this.getRuntime();
    if (runtime) runtime.EventsOn('vuln-found', callback);
  }

  offScanProgress(callback?: Function): void {
    const runtime = this.getRuntime();
    if (runtime) runtime.EventsOff('scan-progress', callback);
  }

  // ==================== HTTP 重放 ====================

  async getAllHttpRequests(): Promise<HttpRequest[]> {
    const App = this.getApp();
    if (!App) return [];
    return await App.GetAllHttpRequests() || [];
  }

  async getHttpRequestById(id: number): Promise<HttpRequest> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    return await App.GetHttpRequestByID(id);
  }

  async createHttpRequest(data: CreateHttpRequest): Promise<HttpRequest> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    const id = await App.CreateHttpRequest(
      data.name,
      data.method,
      data.url,
      data.headers || {},
      data.body || '',
      data.content_type || 'application/json',
      data.tags || []
    );
    return await App.GetHttpRequestByID(Number(id));
  }

  async updateHttpRequest(id: number, data: Partial<CreateHttpRequest>): Promise<void> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.UpdateHttpRequest(
      id,
      data.name || '',
      data.method || 'GET',
      data.url || '',
      data.headers || {},
      data.body,
      data.content_type,
      data.tags
    );
  }

  async deleteHttpRequest(id: number): Promise<void> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.DeleteHttpRequest(id);
  }

  async sendHttpRequest(id: number): Promise<HttpResponse> {
    return {
      id: 0,
      request_id: id,
      status_code: 200,
      status_text: 'OK',
      headers: {},
      body: '',
      response_time: 0,
      timestamp: new Date().toISOString()
    };
  }

  async getHttpResponseHistory(requestId: number): Promise<HttpResponse[]> {
    const App = this.getApp();
    if (!App) return [];
    return await App.GetHttpResponseHistory(requestId) || [];
  }

  async importHttpRequest(data: { data: string; type: 'curl' | 'http' }): Promise<HttpRequest> {
    throw new Error('Import not implemented yet');
  }

  // ==================== 暴力破解 ====================

  async getAllBruteTasks(): Promise<BruteTask[]> {
    const App = this.getApp();
    if (!App) return [];
    return await App.GetAllBruteTasks() || [];
  }

  async getBruteTask(id: number): Promise<BruteTask> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    const tasks = await App.GetAllBruteTasks() || [];
    const task = tasks.find(t => t.id === id);
    if (!task) {
      throw new Error('Brute task not found');
    }
    return task;
  }

  async createBruteTask(data: any): Promise<BruteTask> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    const id = await App.CreateBruteTask(
      data.name,
      data.request_id,
      data.type
    );
    const tasks = await App.GetAllBruteTasks() || [];
    const task = tasks.find(t => t.id === Number(id));
    if (!task) {
      throw new Error('Failed to create brute task');
    }
    return task;
  }

  async startBruteTask(id: number): Promise<void> {
    // TODO: 实现启动逻辑
  }

  async cancelBruteTask(id: number): Promise<void> {
    // TODO: 实现取消逻辑
  }

  async deleteBruteTask(id: number): Promise<void> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.DeleteBruteTask(id);
  }

  async getBruteTaskResults(id: number): Promise<BruteResult[]> {
    return [];
  }

  async getAllBrutePayloadSets(): Promise<BrutePayloadSet[]> {
    const App = this.getApp();
    if (!App) return [];
    return await App.GetAllBrutePayloadSets() || [];
  }

  async createBrutePayloadSet(data: any): Promise<BrutePayloadSet> {
    const App = this.getApp();
    if (!App) throw new Error('Wails bindings not available');
    await App.CreateBrutePayloadSet(
      data.name,
      data.type,
      data.config || {}
    );
    const sets = await App.GetAllBrutePayloadSets() || [];
    return sets[sets.length - 1];
  }

  // ==================== 报告管理 ====================

  async getAllReports(): Promise<any[]> {
    return [];
  }

  async getReportById(id: number): Promise<any> {
    return {};
  }

  async createReport(data: { scan_id: number; format: string; name: string }): Promise<any> {
    return {};
  }

  async deleteReport(id: number): Promise<void> {
    // TODO: 实现删除报告
  }

  async exportReport(data: {
    task_id?: number;
    target_id?: number;
    severity?: string[];
    format: 'json' | 'html' | 'csv' | 'pdf' | 'word';
  }): Promise<Blob> {
    throw new Error('Export not implemented yet');
  }

  // ==================== 工具箱扩展工具 ====================

  async scanPorts(options: {
    target: string;
    ports?: number[];
    timeout?: number;
    batch_size?: number;
  }): Promise<any[]> {
    const App = this.getApp();
    if (!App) return [];
    const taskId = await App.CreatePortScanTask(
      options.target,
      options.ports || [],
      options.timeout || 2000,
      options.batch_size || 50
    );
    return await App.GetPortScanResults(Number(taskId)) || [];
  }

  async getCommonPorts(): Promise<number[]> {
    return [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 1723, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 8888, 9200, 27017];
  }

  async bruteSubdomains(options: {
    domain: string;
    wordlist?: string[];
    timeout?: number;
    batch_size?: number;
  }): Promise<any[]> {
    const App = this.getApp();
    if (!App) return [];
    const taskId = await App.CreateDomainBruteTask(
      options.domain,
      options.wordlist || [],
      options.timeout || 2000,
      options.batch_size || 50
    );
    return await App.GetDomainBruteResults(Number(taskId)) || [];
  }

  async getDomainWordlist(): Promise<string[]> {
    return [
      'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'ns2',
      'admin', 'api', 'test', 'dev', 'staging', 'production', 'blog', 'shop',
      'app', 'mobile', 'cdn', 'static', 'media', 'img', 'image', 'video',
      'm', 'help', 'support', 'docs', 'wiki', 'forum', 'community'
    ];
  }

  async getDomainRecords(domain: string, type: 'mx' | 'ns' | 'txt'): Promise<string[]> {
    return [];
  }
}

// 统一的服务接口
class UnifiedService {
  private wailsService: WailsServiceImpl;
  private environment: RuntimeEnvironment;

  constructor() {
    this.environment = currentEnvironment;
    this.wailsService = new WailsServiceImpl();

    const envName = this.environment === 'wails' ? 'Wails (Go Desktop)' :
                    this.environment === 'electron' ? 'Electron' : 'Browser (Demo Mode)';
    console.log(`[UnifiedService] Running in ${envName} environment`);

    // 在 Wails 环境下，验证绑定是否可用
    if (this.environment === 'wails') {
      const wailsApp = getWailsApp();
      if (wailsApp) {
        console.log('[UnifiedService] Wails bindings are available via window.go.main.App');
      } else {
        console.warn('[UnifiedService] Wails bindings NOT found on window object');
      }
    }
  }

  getEnvironment(): RuntimeEnvironment {
    return this.environment;
  }

  isBrowserMode(): boolean {
    return this.environment === 'browser';
  }

  isDesktopMode(): boolean {
    return this.environment === 'wails' || this.environment === 'electron';
  }

  // 代理所有方法到对应的服务实现
  async getAllTargets(): Promise<Target[]> {
    return this.isBrowserMode() ? mockService.getAllTargets() : this.wailsService.getAllTargets();
  }

  async getTargetById(id: number): Promise<Target> {
    return this.isBrowserMode() ? mockService.getTargetById(id) : this.wailsService.getTargetById(id);
  }

  async createTarget(data: CreateTargetRequest): Promise<Target> {
    return this.isBrowserMode() ? mockService.createTarget(data) : this.wailsService.createTarget(data);
  }

  async updateTarget(id: number, data: UpdateTargetRequest): Promise<Target> {
    return this.isBrowserMode() ? mockService.updateTarget(id, data) : this.wailsService.updateTarget(id, data);
  }

  async deleteTarget(id: number): Promise<void> {
    return this.isBrowserMode() ? mockService.deleteTarget(id) : this.wailsService.deleteTarget(id);
  }

  async batchDeleteTargets(ids: number[]): Promise<void> {
    return this.isBrowserMode() ? mockService.batchDeleteTargets(ids) : this.wailsService.batchDeleteTargets(ids);
  }

  async createScan(data: CreateScanRequest): Promise<ScanTask> {
    console.log('[UnifiedService] createScan called, environment:', this.environment, 'isBrowserMode:', this.isBrowserMode());
    return this.isBrowserMode() ? mockService.createScan(data) : this.wailsService.createScan(data);
  }

  async cancelScan(id: number): Promise<void> {
    return this.isBrowserMode() ? mockService.cancelScan(id) : this.wailsService.cancelScan(id);
  }

  async deleteScan(id: number): Promise<void> {
    return this.isBrowserMode() ? mockService.deleteScan(id) : this.wailsService.deleteScan(id);
  }

  async getAllScans(): Promise<ScanTask[]> {
    return this.isBrowserMode() ? mockService.getAllScans() : this.wailsService.getAllScans();
  }

  async getScanById(id: number): Promise<ScanTask> {
    return this.isBrowserMode() ? mockService.getScanById(id) : this.wailsService.getScanById(id);
  }

  async getScanProgress(id: number): Promise<any> {
    return this.isBrowserMode() ? mockService.getScanProgress(id) : this.wailsService.getScanProgress(id);
  }

  async getScanLogs(id: number): Promise<string[]> {
    return this.isBrowserMode() ? mockService.getScanLogs(id) : this.wailsService.getScanLogs(id);
  }

  async getAllVulnerabilities(): Promise<Vulnerability[]> {
    return this.isBrowserMode() ? mockService.getAllVulnerabilities() : this.wailsService.getAllVulnerabilities();
  }

  async getVulnerabilityById(id: string): Promise<Vulnerability> {
    return this.isBrowserMode() ? mockService.getVulnerabilityById(id) : this.wailsService.getVulnerabilityById(id);
  }

  async updateVulnerability(id: string, data: any): Promise<Vulnerability> {
    return this.isBrowserMode() ? mockService.updateVulnerability(id, data) : this.wailsService.updateVulnerability(id, data);
  }

  async markVulnerabilityAsFalsePositive(id: string, isFalsePositive: boolean): Promise<Vulnerability> {
    return this.isBrowserMode() ? mockService.markVulnerabilityAsFalsePositive(id, isFalsePositive) : this.wailsService.markVulnerabilityAsFalsePositive(id, isFalsePositive);
  }

  async deleteVulnerability(id: string): Promise<void> {
    return this.isBrowserMode() ? mockService.deleteVulnerability(id) : this.wailsService.deleteVulnerability(id);
  }

  async checkDatabaseHealth(): Promise<{ healthy: boolean; type: string; message?: string }> {
    return this.isBrowserMode() ? mockService.checkDatabaseHealth() : this.wailsService.checkDatabaseHealth();
  }

  async getDatabaseStats(): Promise<any> {
    return this.isBrowserMode() ? mockService.getDatabaseStats() : this.wailsService.getDatabaseStats();
  }

  async getDatabaseInfo(): Promise<any> {
    return this.isBrowserMode() ? mockService.getDatabaseInfo() : this.wailsService.getDatabaseInfo();
  }

  async getAppVersion(): Promise<string> {
    return this.isBrowserMode() ? mockService.getAppVersion() : this.wailsService.getAppVersion();
  }

  getPlatform(): string {
    return this.isBrowserMode() ? mockService.getPlatform() : this.wailsService.getPlatform();
  }

  // Custom Templates
  async getAllCustomTemplates(): Promise<any[]> {
    return this.isBrowserMode() ? mockService.getAllCustomTemplates() : this.wailsService.getAllCustomTemplates();
  }

  async getCustomTemplateById(id: number): Promise<any> {
    return this.isBrowserMode() ? mockService.getCustomTemplateById(id) : this.wailsService.getCustomTemplateById(id);
  }

  async createCustomTemplate(name: string, content: string): Promise<number> {
    return this.isBrowserMode() ? mockService.createCustomTemplate(name, content) : this.wailsService.createCustomTemplate(name, content);
  }

  async updateCustomTemplate(id: number, name: string, content: string): Promise<void> {
    return this.isBrowserMode() ? mockService.updateCustomTemplate(id, name, content) : this.wailsService.updateCustomTemplate(id, name, content);
  }

  async deleteCustomTemplate(id: number): Promise<void> {
    return this.isBrowserMode() ? mockService.deleteCustomTemplate(id) : this.wailsService.deleteCustomTemplate(id);
  }

  async toggleCustomTemplate(id: number, enabled: boolean): Promise<void> {
    return this.isBrowserMode() ? mockService.toggleCustomTemplate(id, enabled) : this.wailsService.toggleCustomTemplate(id, enabled);
  }

  async validateCustomTemplate(content: string): Promise<any> {
    return this.isBrowserMode() ? mockService.validateCustomTemplate(content) : this.wailsService.validateCustomTemplate(content);
  }

  async getCustomTemplatesStats(): Promise<any> {
    return this.isBrowserMode() ? mockService.getCustomTemplatesStats() : this.wailsService.getCustomTemplatesStats();
  }

  onScanProgress(callback: Function): void {
    return this.isBrowserMode() ? mockService.onScanProgress(callback) : this.wailsService.onScanProgress(callback);
  }

  onScanLog(callback: Function): void {
    return this.isBrowserMode() ? mockService.onScanLog(callback) : this.wailsService.onScanLog(callback);
  }

  onVulnFound(callback: Function): void {
    return this.isBrowserMode() ? mockService.onVulnFound(callback) : this.wailsService.onVulnFound(callback);
  }

  offScanProgress(callback?: Function): void {
    return this.isBrowserMode() ? mockService.offScanProgress(callback) : this.wailsService.offScanProgress(callback);
  }

  async getAllHttpRequests(): Promise<HttpRequest[]> {
    return this.isBrowserMode() ? mockService.getAllHttpRequests() : this.wailsService.getAllHttpRequests();
  }

  async getHttpRequestById(id: number): Promise<HttpRequest> {
    return this.isBrowserMode() ? mockService.getHttpRequestById(id) : this.wailsService.getHttpRequestById(id);
  }

  async createHttpRequest(data: CreateHttpRequest): Promise<HttpRequest> {
    return this.isBrowserMode() ? mockService.createHttpRequest(data) : this.wailsService.createHttpRequest(data);
  }

  async updateHttpRequest(id: number, data: Partial<CreateHttpRequest>): Promise<void> {
    return this.isBrowserMode() ? mockService.updateHttpRequest(id, data) : this.wailsService.updateHttpRequest(id, data);
  }

  async deleteHttpRequest(id: number): Promise<void> {
    return this.isBrowserMode() ? mockService.deleteHttpRequest(id) : this.wailsService.deleteHttpRequest(id);
  }

  async sendHttpRequest(id: number): Promise<HttpResponse> {
    return this.isBrowserMode() ? mockService.sendHttpRequest(id) : this.wailsService.sendHttpRequest(id);
  }

  async getHttpResponseHistory(requestId: number): Promise<HttpResponse[]> {
    return this.isBrowserMode() ? mockService.getHttpResponseHistory(requestId) : this.wailsService.getHttpResponseHistory(requestId);
  }

  async importHttpRequest(data: { data: string; type: 'curl' | 'http' }): Promise<HttpRequest> {
    return this.isBrowserMode() ? mockService.importHttpRequest(data) : this.wailsService.importHttpRequest(data);
  }

  async getAllBruteTasks(): Promise<BruteTask[]> {
    return this.isBrowserMode() ? mockService.getAllBruteTasks() : this.wailsService.getAllBruteTasks();
  }

  async getBruteTask(id: number): Promise<BruteTask> {
    return this.isBrowserMode() ? mockService.getBruteTask(id) : this.wailsService.getBruteTask(id);
  }

  async createBruteTask(data: any): Promise<BruteTask> {
    return this.isBrowserMode() ? mockService.createBruteTask(data) : this.wailsService.createBruteTask(data);
  }

  async startBruteTask(id: number): Promise<void> {
    return this.isBrowserMode() ? mockService.startBruteTask(id) : this.wailsService.startBruteTask(id);
  }

  async cancelBruteTask(id: number): Promise<void> {
    return this.isBrowserMode() ? mockService.cancelBruteTask(id) : this.wailsService.cancelBruteTask(id);
  }

  async deleteBruteTask(id: number): Promise<void> {
    return this.isBrowserMode() ? mockService.deleteBruteTask(id) : this.wailsService.deleteBruteTask(id);
  }

  async getBruteTaskResults(id: number): Promise<BruteResult[]> {
    return this.isBrowserMode() ? mockService.getBruteTaskResults(id) : this.wailsService.getBruteTaskResults(id);
  }

  async getAllBrutePayloadSets(): Promise<BrutePayloadSet[]> {
    return this.isBrowserMode() ? mockService.getAllBrutePayloadSets() : this.wailsService.getAllBrutePayloadSets();
  }

  async createBrutePayloadSet(data: any): Promise<BrutePayloadSet> {
    return this.isBrowserMode() ? mockService.createBrutePayloadSet(data) : this.wailsService.createBrutePayloadSet(data);
  }

  async getAllReports(): Promise<any[]> {
    return this.isBrowserMode() ? mockService.getAllReports() : this.wailsService.getAllReports();
  }

  async getReportById(id: number): Promise<any> {
    return this.isBrowserMode() ? mockService.getReportById(id) : this.wailsService.getReportById(id);
  }

  async createReport(data: { scan_id: number; format: string; name: string }): Promise<any> {
    return this.isBrowserMode() ? mockService.createReport(data) : this.wailsService.createReport(data);
  }

  async deleteReport(id: number): Promise<void> {
    return this.isBrowserMode() ? mockService.deleteReport(id) : this.wailsService.deleteReport(id);
  }

  async exportReport(data: any): Promise<Blob> {
    return this.isBrowserMode() ? mockService.exportReport(data) : this.wailsService.exportReport(data);
  }

  async scanPorts(options: any): Promise<any[]> {
    return this.isBrowserMode() ? mockService.scanPorts(options) : this.wailsService.scanPorts(options);
  }

  async getCommonPorts(): Promise<number[]> {
    return this.isBrowserMode() ? mockService.getCommonPorts() : this.wailsService.getCommonPorts();
  }

  async bruteSubdomains(options: any): Promise<any[]> {
    return this.isBrowserMode() ? mockService.bruteSubdomains(options) : this.wailsService.bruteSubdomains(options);
  }

  async getDomainWordlist(): Promise<string[]> {
    return this.isBrowserMode() ? mockService.getDomainWordlist() : this.wailsService.getDomainWordlist();
  }

  async getDomainRecords(domain: string, type: 'mx' | 'ns' | 'txt'): Promise<string[]> {
    return this.isBrowserMode() ? mockService.getDomainRecords(domain, type) : this.wailsService.getDomainRecords(domain, type);
  }
}

// 导出单例
let serviceInstance: UnifiedService | null = null;

export const getService = (): UnifiedService => {
  if (!serviceInstance) {
    serviceInstance = new UnifiedService();
  }
  return serviceInstance;
};

// 重新导出类型以保持兼容性
export type { UnifiedService as WailsService };

// 导出便捷实例
export const wailsService = getService();
