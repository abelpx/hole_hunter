/**
 * Wails 服务层
 * 使用 Wails 生成的 Go 绑定来与后端通信
 */

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
  Report,
  CreateReportRequest,
} from '../types';

// 导入 Wails 自动生成的绑定
// 使用 vite 别名导入 wailsjs
import * as WailsApp from '@wailsjs/go/app/App';

// 统一的 Wails 调用包装器 - 处理异常和超时
async function safeWailsCall<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  context: string
): Promise<T> {
  const App = (WailsApp as any);
  if (!App || typeof App.GetAllTargets !== 'function') {
    console.warn(`[WailsService] ${context}: Wails not available, returning default value`);
    return defaultValue;
  }

  try {
    return await fn();
  } catch (error) {
    console.error(`[WailsService] ${context} failed:`, error);
    return defaultValue;
  }
}

// Wails 服务实现
class WailsServiceImpl {
  private getRuntime(): WailsRuntime | null {
    return getWailsRuntime();
  }

  // ==================== 目标管理 ====================

  async getAllTargets(): Promise<Target[]> {
    return safeWailsCall(
      async () => {
        const targets = await (WailsApp as any).GetAllTargets();
        return targets ? targets.map((t: any) => ({ ...t, tags: t.tags || [] })) : [];
      },
      [],
      'getAllTargets'
    );
  }

  async getTargetById(id: number): Promise<Target> {
    return safeWailsCall(
      async () => {
        const target = await (WailsApp as any).GetTargetByID(id);
        return { ...target, tags: target.tags || [] };
      },
      null as unknown as Target,
      'getTargetById'
    );
  }

  async createTarget(data: CreateTargetRequest): Promise<Target> {
    return safeWailsCall(
      async () => {
        const id = await (WailsApp as any).CreateTarget(
          data.name,
          data.url,
          data.description || '',
          data.tags || []
        );
        return await this.getTargetById(Number(id));
      },
      null as unknown as Target,
      'createTarget'
    );
  }

  async updateTarget(id: number, data: UpdateTargetRequest): Promise<Target> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).UpdateTarget(
          id,
          data.name,
          data.url,
          data.description || '',
          data.tags || []
        );
        return await this.getTargetById(id);
      },
      null as unknown as Target,
      'updateTarget'
    );
  }

  async deleteTarget(id: number): Promise<void> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).DeleteTarget(id);
      },
      undefined,
      'deleteTarget'
    );
  }

  async batchDeleteTargets(ids: number[]): Promise<void> {
    // 使用 Promise.allSettled 确保部分失败不影响其他操作
    const results = await Promise.allSettled(
      ids.map(id => this.deleteTarget(id))
    );
    // 记录失败的操作
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`[WailsService] batchDeleteTargets: ${failures.length}/${ids.length} failed`);
    }
  }

  // ==================== 扫描管理 ====================

  async createScan(data: CreateScanRequest): Promise<ScanTask> {
    return safeWailsCall(
      async () => {
        const id = await (WailsApp as any).CreateScanTask(
          data.name || null,
          data.target_id,
          data.strategy,
          data.templates || []
        );
        return await (WailsApp as any).GetScanTaskByID(Number(id));
      },
      null as unknown as ScanTask,
      'createScan'
    );
  }

  async cancelScan(id: number): Promise<void> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).UpdateScanTaskStatus(id, 'cancelled');
      },
      undefined,
      'cancelScan'
    );
  }

  async deleteScan(id: number): Promise<void> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).DeleteScanTask(id);
      },
      undefined,
      'deleteScan'
    );
  }

  async getAllScans(): Promise<ScanTask[]> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetAllScanTasks() || [];
      },
      [],
      'getAllScans'
    );
  }

  async getScanById(id: number): Promise<ScanTask> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetScanTaskByID(id);
      },
      null as unknown as ScanTask,
      'getScanById'
    );
  }

  async getScanProgress(id: number): Promise<any> {
    return safeWailsCall(
      async () => {
        const task = await (WailsApp as any).GetScanTaskByID(id);
        return {
          progress: task.progress,
          status: task.status,
          total_templates: task.total_templates,
          executed_templates: task.executed_templates,
          current_template: task.current_template,
        };
      },
      { progress: 0, status: 'unknown' },
      'getScanProgress'
    );
  }

  async getScanLogs(id: number): Promise<string[]> {
    return safeWailsCall(
      async () => {
        const task = await (WailsApp as any).GetScanTaskByID(id);
        if (task.logs && Array.isArray(task.logs)) {
          return task.logs;
        }
        return [];
      },
      [],
      'getScanLogs'
    );
  }

  // ==================== 漏洞管理 ====================

  async getAllVulnerabilities(): Promise<Vulnerability[]> {
    return safeWailsCall(
      async () => {
        const result = await (WailsApp as any).GetAllVulnerabilities();
        if (!result) return [];

        return result.map((v: any) => ({
          id: String(v.id),
          name: v.name,
          severity: v.severity || 'info',
          url: v.url || '',
          template_id: v.template_id || '',
          cve: v.cve ? [v.cve] : [],
          cvss: v.cvss,
          description: v.description || '',
          reference: v.reference || [],
          tags: v.tags || [],
          target_id: v.task_id || 0,
          scan_id: v.task_id || 0,
          discovered_at: v.matched_at || v.created_at,
          is_false_positive: v.false_positive || false,
          false_positive: v.false_positive || false,
          created_at: v.created_at,
        }));
      },
      [],
      'getAllVulnerabilities'
    );
  }

  async getVulnerabilityById(id: string): Promise<Vulnerability> {
    return safeWailsCall(
      async () => {
        const v = await (WailsApp as any).GetVulnerabilityByID(Number(id));
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
      },
      null as unknown as Vulnerability,
      'getVulnerabilityById'
    );
  }

  async updateVulnerability(id: string, data: any): Promise<Vulnerability> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).UpdateVulnerability(
          Number(id),
          data.false_positive || data.is_false_positive || false,
          data.notes || ''
        );
        return await this.getVulnerabilityById(id);
      },
      null as unknown as Vulnerability,
      'updateVulnerability'
    );
  }

  async markVulnerabilityAsFalsePositive(id: string, isFalsePositive: boolean): Promise<Vulnerability> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).UpdateVulnerability(Number(id), isFalsePositive, '');
        return await this.getVulnerabilityById(id);
      },
      null as unknown as Vulnerability,
      'markVulnerabilityAsFalsePositive'
    );
  }

  async deleteVulnerability(id: string): Promise<void> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).DeleteVulnerability(Number(id));
      },
      undefined,
      'deleteVulnerability'
    );
  }

  // ==================== 数据库 ====================

  async checkDatabaseHealth(): Promise<{ healthy: boolean; type: string; message?: string }> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).HealthCheck();
        return {
          healthy: true,
          type: 'sqlite'
        };
      },
      {
        healthy: false,
        type: 'none',
        message: 'Wails bindings not available'
      },
      'checkDatabaseHealth'
    );
  }

  async getDatabaseStats(): Promise<any> {
    return safeWailsCall(
      async () => {
        const stats = await (WailsApp as any).GetDashboardStats();
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
      },
      {
        total_targets: 0,
        total_scans: 0,
        running_scans: 0,
        total_vulnerabilities: 0,
        critical_vulns: 0,
        high_vulns: 0,
        medium_vulns: 0,
        low_vulns: 0,
      },
      'getDatabaseStats'
    );
  }

  async getDatabaseInfo(): Promise<any> {
    return safeWailsCall(
      async () => {
        const info = await (WailsApp as any).GetDatabaseInfo();
        console.log('[WailsService] Database info:', info);
        return info;
      },
      {
        dbPath: 'N/A (Wails bindings not available)',
        databaseExists: false,
        tableStats: {},
      },
      'getDatabaseInfo'
    );
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
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetAllCustomTemplates() || [];
      },
      [],
      'getAllCustomTemplates'
    );
  }

  async getCustomTemplateById(id: number): Promise<any> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetCustomTemplateByID(id);
      },
      null as unknown as any,
      'getCustomTemplateById'
    );
  }

  async createCustomTemplate(name: string, content: string): Promise<number> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).CreateCustomTemplate(name, content);
      },
      0,
      'createCustomTemplate'
    );
  }

  async updateCustomTemplate(id: number, name: string, content: string): Promise<void> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).UpdateCustomTemplate(id, name, content);
      },
      undefined,
      'updateCustomTemplate'
    );
  }

  async deleteCustomTemplate(id: number): Promise<void> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).DeleteCustomTemplate(id);
      },
      undefined,
      'deleteCustomTemplate'
    );
  }

  async toggleCustomTemplate(id: number, enabled: boolean): Promise<void> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).ToggleCustomTemplate(id, enabled);
      },
      undefined,
      'toggleCustomTemplate'
    );
  }

  async validateCustomTemplate(content: string): Promise<any> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).ValidateCustomTemplate(content);
      },
      { valid: false, errors: [] },
      'validateCustomTemplate'
    );
  }

  async getCustomTemplatesStats(): Promise<any> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetCustomTemplatesStats();
      },
      { total: 0, enabled: 0, disabled: 0 },
      'getCustomTemplatesStats'
    );
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
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetAllHttpRequests() || [];
      },
      [],
      'getAllHttpRequests'
    );
  }

  async getHttpRequestById(id: number): Promise<HttpRequest> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetHttpRequestByID(id);
      },
      null as unknown as HttpRequest,
      'getHttpRequestById'
    );
  }

  async createHttpRequest(data: CreateHttpRequest): Promise<HttpRequest> {
    return safeWailsCall(
      async () => {
        const id = await (WailsApp as any).CreateHttpRequest(
          data.name,
          data.method,
          data.url,
          data.headers || {},
          data.body || '',
          data.content_type || 'application/json',
          data.tags || []
        );
        return await (WailsApp as any).GetHttpRequestByID(Number(id));
      },
      null as unknown as HttpRequest,
      'createHttpRequest'
    );
  }

  async updateHttpRequest(id: number, data: Partial<CreateHttpRequest>): Promise<void> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).UpdateHttpRequest(
          id,
          data.name || '',
          data.method || 'GET',
          data.url || '',
          data.headers || {},
          data.body,
          data.content_type,
          data.tags
        );
      },
      undefined,
      'updateHttpRequest'
    );
  }

  async deleteHttpRequest(id: number): Promise<void> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).DeleteHttpRequest(id);
      },
      undefined,
      'deleteHttpRequest'
    );
  }

  async sendHttpRequest(id: number, timeoutSec: number = 30): Promise<HttpResponse> {
    return safeWailsCall(
      async () => {
        const resp = await (WailsApp as any).SendHttpRequest(id, timeoutSec);
        return {
          id: String(resp.id),
          request_id: resp.request_id,
          status_code: resp.status_code,
          status_text: resp.status_text,
          headers: resp.headers || {},
          body: resp.body || '',
          body_size: resp.body_size,
          header_size: resp.header_size,
          response_time: resp.duration,
          timestamp: resp.timestamp || new Date().toISOString()
        };
      },
      null as unknown as HttpResponse,
      'sendHttpRequest'
    );
  }

  async getHttpResponseHistory(requestId: number): Promise<HttpResponse[]> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetHttpResponseHistory(requestId) || [];
      },
      [],
      'getHttpResponseHistory'
    );
  }

  async importHttpRequest(data: { data: string; type: 'curl' | 'http' }): Promise<HttpRequest> {
    return safeWailsCall(
      async () => {
        throw new Error('Import not implemented yet');
      },
      null as unknown as HttpRequest,
      'importHttpRequest'
    );
  }

  // ==================== 暴力破解 ====================

  async getAllBruteTasks(): Promise<BruteTask[]> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetAllBruteTasks() || [];
      },
      [],
      'getAllBruteTasks'
    );
  }

  async getBruteTask(id: number): Promise<BruteTask> {
    return safeWailsCall(
      async () => {
        const tasks = await (WailsApp as any).GetAllBruteTasks() || [];
        const task = tasks.find(t => t.id === id);
        if (!task) {
          throw new Error('Brute task not found');
        }
        return task;
      },
      null as unknown as BruteTask,
      'getBruteTask'
    );
  }

  async createBruteTask(data: any): Promise<BruteTask> {
    return safeWailsCall(
      async () => {
        const id = await (WailsApp as any).CreateBruteTask(
          data.name,
          data.request_id,
          data.type
        );
        const tasks = await (WailsApp as any).GetAllBruteTasks() || [];
        const task = tasks.find(t => t.id === Number(id));
        if (!task) {
          throw new Error('Failed to create brute task');
        }
        return task;
      },
      null as unknown as BruteTask,
      'createBruteTask'
    );
  }

  async startBruteTask(id: number): Promise<void> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).StartBruteTask(id);
      },
      undefined,
      'startBruteTask'
    );
  }

  async cancelBruteTask(id: number): Promise<void> {
    return safeWailsCall(
      async () => {
        // TODO: 实现取消逻辑
      },
      undefined,
      'cancelBruteTask'
    );
  }

  async deleteBruteTask(id: number): Promise<void> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).DeleteBruteTask(id);
      },
      undefined,
      'deleteBruteTask'
    );
  }

  async getBruteTaskResults(id: number): Promise<BruteResult[]> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetBruteTaskResults(id);
      },
      [],
      'getBruteTaskResults'
    );
  }

  async getAllBrutePayloadSets(): Promise<BrutePayloadSet[]> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetAllBrutePayloadSets() || [];
      },
      [],
      'getAllBrutePayloadSets'
    );
  }

  async createBrutePayloadSet(data: any): Promise<BrutePayloadSet> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).CreateBrutePayloadSet(
          data.name,
          data.type,
          data.config || {}
        );
        const sets = await (WailsApp as any).GetAllBrutePayloadSets() || [];
        return sets[sets.length - 1];
      },
      null as unknown as BrutePayloadSet,
      'createBrutePayloadSet'
    );
  }

  // ==================== 报告管理 ====================

  async getAllReports(): Promise<Report[]> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetAllReports();
      },
      [],
      'getAllReports'
    );
  }

  async getReportById(id: number): Promise<Report> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).GetReportById(id);
      },
      null as unknown as Report,
      'getReportById'
    );
  }

  async createReport(request: CreateReportRequest): Promise<Report> {
    return safeWailsCall(
      async () => {
        const id = await (WailsApp as any).CreateReport(
          request.name,
          request.scan_id,
          request.type || 'summary',
          request.format || 'json'
        );
        return await this.getReportById(Number(id));
      },
      null as unknown as Report,
      'createReport'
    );
  }

  async deleteReport(id: number): Promise<void> {
    return safeWailsCall(
      async () => {
        await (WailsApp as any).DeleteReport(id);
      },
      undefined,
      'deleteReport'
    );
  }

  async exportReport(id: number, format: string): Promise<string> {
    return safeWailsCall(
      async () => {
        return await (WailsApp as any).ExportReport(id, format);
      },
      '',
      'exportReport'
    );
  }

  async createReport(data: { scan_id: number; format: string; name: string }): Promise<any> {
    return safeWailsCall(
      async () => {
        // TODO: 实现创建报告
        return {};
      },
      {},
      'createReport'
    );
  }

  async deleteReport(id: number): Promise<void> {
    return safeWailsCall(
      async () => {
        // TODO: 实现删除报告
      },
      undefined,
      'deleteReport'
    );
  }

  async exportReport(data: {
    task_id?: number;
    target_id?: number;
    severity?: string[];
    format: 'json' | 'html' | 'csv' | 'pdf' | 'word';
  }): Promise<Blob> {
    return safeWailsCall(
      async () => {
        throw new Error('Export not implemented yet');
      },
      null as unknown as Blob,
      'exportReport'
    );
  }

  // ==================== 工具箱扩展工具 ====================

  async scanPorts(options: {
    target: string;
    ports?: number[];
    timeout?: number;
    batch_size?: number;
  }): Promise<any[]> {
    return safeWailsCall(
      async () => {
        const taskId = await (WailsApp as any).CreatePortScanTask(
          options.target,
          options.ports || [],
          options.timeout || 2000,
          options.batch_size || 50
        );
        return await (WailsApp as any).GetPortScanResults(Number(taskId)) || [];
      },
      [],
      'scanPorts'
    );
  }

  async getCommonPorts(): Promise<number[]> {
    return safeWailsCall(
      async () => {
        return [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 1723, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 8888, 9200, 27017];
      },
      [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 1723, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 8888, 9200, 27017],
      'getCommonPorts'
    );
  }

  async bruteSubdomains(options: {
    domain: string;
    wordlist?: string[];
    timeout?: number;
    batch_size?: number;
  }): Promise<any[]> {
    return safeWailsCall(
      async () => {
        const taskId = await (WailsApp as any).CreateDomainBruteTask(
          options.domain,
          options.wordlist || [],
          options.timeout || 2000,
          options.batch_size || 50
        );
        return await (WailsApp as any).GetDomainBruteResults(Number(taskId)) || [];
      },
      [],
      'bruteSubdomains'
    );
  }

  async getDomainWordlist(): Promise<string[]> {
    return safeWailsCall(
      async () => {
        return [
          'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'ns2',
          'admin', 'api', 'test', 'dev', 'staging', 'production', 'blog', 'shop',
          'app', 'mobile', 'cdn', 'static', 'media', 'img', 'image', 'video',
          'm', 'help', 'support', 'docs', 'wiki', 'forum', 'community'
        ];
      },
      ['www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'ns2',
        'admin', 'api', 'test', 'dev', 'staging', 'production', 'blog', 'shop',
        'app', 'mobile', 'cdn', 'static', 'media', 'img', 'image', 'video',
        'm', 'help', 'support', 'docs', 'wiki', 'forum', 'community'],
      'getDomainWordlist'
    );
  }

  async getDomainRecords(domain: string, type: 'mx' | 'ns' | 'txt'): Promise<string[]> {
    return safeWailsCall(
      async () => {
        // TODO: 实现获取 DNS 记录
        return [];
      },
      [],
      'getDomainRecords'
    );
  }
}



export const WailsService = new WailsServiceImpl();
