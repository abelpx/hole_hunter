/**
 * Mock 服务层
 * 用于浏览器环境下的开发和演示
 * 使用内存存储模拟后端功能
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
} from '../types';

// 内存数据存储
class MockDataStore {
  targets: Target[] = [
    {
      id: 1,
      name: '示例目标 - 测试网站',
      url: 'https://example.com',
      description: '用于演示的测试目标',
      tags: ['demo', 'test'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: '本地开发环境',
      url: 'http://localhost:3000',
      description: '本地开发服务器',
      tags: ['local', 'dev'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  vulnerabilities: Vulnerability[] = [
    {
      id: '1',
      task_id: 1,
      name: '信息泄露 - 敏感信息暴露',
      severity: 'high',
      url: 'https://example.com/api/users',
      description: 'API 端点返回了包含敏感信息的用户数据，未进行适当的访问控制。',
      tags: ['information-disclosure', 'api'],
      false_positive: false,
      discovered_at: new Date().toISOString(),
    },
    {
      id: '2',
      task_id: 1,
      name: 'CORS 配置错误',
      severity: 'medium',
      url: 'https://example.com',
      description: '发现 CORS 配置允许任意来源的请求，可能导致 CSRF 攻击。',
      tags: ['misconfiguration', 'cors'],
      false_positive: false,
      discovered_at: new Date().toISOString(),
    },
  ];

  scans: ScanTask[] = [
    {
      id: 1,
      target_id: 1,
      status: 'completed',
      progress: 100,
      total_templates: 150,
      executed_templates: 150,
      current_template: 'N/A',
      started_at: new Date(Date.now() - 3600000).toISOString(),
      completed_at: new Date(Date.now() - 3000000).toISOString(),
    },
  ];

  httpRequests: HttpRequest[] = [
    {
      id: 1,
      name: '示例 GET 请求',
      method: 'GET',
      url: 'https://api.example.com/users',
      headers: {
        'Authorization': 'Bearer token123',
        'Content-Type': 'application/json',
      },
      body: '',
      content_type: 'application/json',
      tags: ['api', 'example'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  bruteTasks: BruteTask[] = [];

  brutePayloadSets: BrutePayloadSet[] = [
    {
      id: 1,
      name: '常见用户名',
      type: 'username',
      config: {
        payloads: ['admin', 'user', 'test', 'root', 'guest'],
      },
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: '常见密码',
      type: 'password',
      config: {
        payloads: ['password123', 'admin123', '123456', 'qwerty', 'letmein'],
      },
      created_at: new Date().toISOString(),
    },
  ];

  // 生成唯一 ID
  private generateId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  // 目标管理
  getAllTargets(): Target[] {
    return [...this.targets];
  }

  getTargetById(id: number): Target {
    const target = this.targets.find(t => t.id === id);
    if (!target) throw new Error(`Target with id ${id} not found`);
    return target;
  }

  createTarget(data: CreateTargetRequest): Target {
    const newTarget: Target = {
      id: this.generateId(),
      name: data.name,
      url: data.url,
      description: data.description || '',
      tags: data.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.targets.push(newTarget);
    return newTarget;
  }

  updateTarget(id: number, data: UpdateTargetRequest): Target {
    const index = this.targets.findIndex(t => t.id === id);
    if (index === -1) throw new Error(`Target with id ${id} not found`);

    this.targets[index] = {
      ...this.targets[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return this.targets[index];
  }

  deleteTarget(id: number): void {
    const index = this.targets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.targets.splice(index, 1);
    }
  }

  // 漏洞管理
  getAllVulnerabilities(): Vulnerability[] {
    return [...this.vulnerabilities];
  }

  getVulnerabilityById(id: string): Vulnerability {
    const vuln = this.vulnerabilities.find(v => v.id === id);
    if (!vuln) throw new Error(`Vulnerability with id ${id} not found`);
    return vuln;
  }

  updateVulnerability(id: string, data: any): Vulnerability {
    const index = this.vulnerabilities.findIndex(v => v.id === id);
    if (index === -1) throw new Error(`Vulnerability with id ${id} not found`);

    this.vulnerabilities[index] = {
      ...this.vulnerabilities[index],
      false_positive: data.false_positive ?? this.vulnerabilities[index].false_positive,
      notes: data.notes || '',
    };
    return this.vulnerabilities[index];
  }

  markVulnerabilityAsFalsePositive(id: string, isFalsePositive: boolean): Vulnerability {
    return this.updateVulnerability(id, { false_positive: isFalsePositive });
  }

  // 扫描管理
  getAllScans(): ScanTask[] {
    return [...this.scans];
  }

  getScanById(id: number): ScanTask {
    const scan = this.scans.find(s => s.id === id);
    if (!scan) throw new Error(`Scan with id ${id} not found`);
    return scan;
  }

  createScan(data: CreateScanRequest): ScanTask {
    const newScan: ScanTask = {
      id: this.generateId(),
      name: data.name,
      target_id: data.target_id,
      status: 'pending',
      progress: 0,
      total_templates: 150,
      executed_templates: 0,
      started_at: new Date().toISOString(),
    };
    this.scans.push(newScan);

    // 模拟扫描进度
    setTimeout(() => {
      newScan.status = 'running';
      newScan.progress = 50;
    }, 1000);

    setTimeout(() => {
      newScan.status = 'completed';
      newScan.progress = 100;
      newScan.executed_templates = 150;
      newScan.completed_at = new Date().toISOString();
    }, 3000);

    return newScan;
  }

  cancelScan(id: number): void {
    const scan = this.scans.find(s => s.id === id);
    if (scan) {
      scan.status = 'cancelled';
      scan.completed_at = new Date().toISOString();
    }
  }

  // HTTP 请求管理
  getAllHttpRequests(): HttpRequest[] {
    return [...this.httpRequests];
  }

  getHttpRequestById(id: number): HttpRequest {
    const request = this.httpRequests.find(r => r.id === id);
    if (!request) throw new Error(`HTTP request with id ${id} not found`);
    return request;
  }

  createHttpRequest(data: CreateHttpRequest): HttpRequest {
    const newRequest: HttpRequest = {
      id: this.generateId(),
      name: data.name,
      method: data.method,
      url: data.url,
      headers: data.headers || {},
      body: data.body || '',
      content_type: data.content_type || 'application/json',
      tags: data.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.httpRequests.push(newRequest);
    return newRequest;
  }

  updateHttpRequest(id: number, data: Partial<CreateHttpRequest>): void {
    const index = this.httpRequests.findIndex(r => r.id === id);
    if (index !== -1) {
      this.httpRequests[index] = {
        ...this.httpRequests[index],
        ...data,
        updated_at: new Date().toISOString(),
      };
    }
  }

  deleteHttpRequest(id: number): void {
    const index = this.httpRequests.findIndex(r => r.id === id);
    if (index !== -1) {
      this.httpRequests.splice(index, 1);
    }
  }

  async sendHttpRequest(id: number): Promise<HttpResponse> {
    const request = this.getHttpRequestById(id);
    // 模拟 HTTP 响应
    return {
      id: this.generateId(),
      request_id: id,
      status_code: 200,
      status_text: 'OK',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ message: 'Mock response', status: 'success' }, null, 2),
      response_time: Math.floor(Math.random() * 500) + 50,
      timestamp: new Date().toISOString(),
    };
  }

  getHttpResponseHistory(requestId: number): HttpResponse[] {
    // 返回模拟的响应历史
    return [];
  }

  // 暴力破解管理
  getAllBruteTasks(): BruteTask[] {
    return [...this.bruteTasks];
  }

  getBruteTask(id: number): BruteTask {
    const task = this.bruteTasks.find(t => t.id === id);
    if (!task) throw new Error(`Brute task with id ${id} not found`);
    return task;
  }

  createBruteTask(data: any): BruteTask {
    const newTask: BruteTask = {
      id: this.generateId(),
      name: data.name,
      request_id: data.request_id,
      type: data.type,
      status: 'idle',
      progress: 0,
      total_attempts: 0,
      successful_attempts: 0,
      created_at: new Date().toISOString(),
    };
    this.bruteTasks.push(newTask);
    return newTask;
  }

  deleteBruteTask(id: number): void {
    const index = this.bruteTasks.findIndex(t => t.id === id);
    if (index !== -1) {
      this.bruteTasks.splice(index, 1);
    }
  }

  getAllBrutePayloadSets(): BrutePayloadSet[] {
    return [...this.brutePayloadSets];
  }

  createBrutePayloadSet(data: any): BrutePayloadSet {
    const newSet: BrutePayloadSet = {
      id: this.generateId(),
      name: data.name,
      type: data.type,
      config: data.config || {},
      created_at: new Date().toISOString(),
    };
    this.brutePayloadSets.push(newSet);
    return newSet;
  }

  // 统计信息
  getDashboardStats() {
    return {
      TotalTargets: this.targets.length,
      TotalScans: this.scans.length,
      RunningScans: this.scans.filter(s => s.status === 'running').length,
      TotalVulnerabilities: this.vulnerabilities.length,
      CriticalVulns: this.vulnerabilities.filter(v => v.severity === 'critical').length,
      HighVulns: this.vulnerabilities.filter(v => v.severity === 'high').length,
      MediumVulns: this.vulnerabilities.filter(v => v.severity === 'medium').length,
      LowVulns: this.vulnerabilities.filter(v => v.severity === 'low').length,
    };
  }

  healthCheck() {
    return true; // 总是健康
  }
}

// 导出单例
const mockStore = new MockDataStore();

// Mock 服务类
class MockService {
  private mockData = mockStore;

  async getAllTargets(): Promise<Target[]> {
    return this.mockData.getAllTargets();
  }

  async getTargetById(id: number): Promise<Target> {
    return this.mockData.getTargetById(id);
  }

  async createTarget(data: CreateTargetRequest): Promise<Target> {
    return this.mockData.createTarget(data);
  }

  async updateTarget(id: number, data: UpdateTargetRequest): Promise<Target> {
    return this.mockData.updateTarget(id, data);
  }

  async deleteTarget(id: number): Promise<void> {
    this.mockData.deleteTarget(id);
  }

  async batchDeleteTargets(ids: number[]): Promise<void> {
    for (const id of ids) {
      this.mockData.deleteTarget(id);
    }
  }

  async createScan(data: CreateScanRequest): Promise<ScanTask> {
    return this.mockData.createScan(data);
  }

  async cancelScan(id: number): Promise<void> {
    this.mockData.cancelScan(id);
  }

  async getAllScans(): Promise<ScanTask[]> {
    return this.mockData.getAllScans();
  }

  async getScanById(id: number): Promise<ScanTask> {
    return this.mockData.getScanById(id);
  }

  async getScanProgress(id: number): Promise<any> {
    const task = this.mockData.getScanById(id);
    return {
      progress: task.progress,
      status: task.status,
      total_templates: task.total_templates,
      executed_templates: task.executed_templates,
      current_template: task.current_template,
    };
  }

  async getScanLogs(id: number): Promise<string[]> {
    return [];
  }

  async getAllVulnerabilities(): Promise<Vulnerability[]> {
    return this.mockData.getAllVulnerabilities();
  }

  async getVulnerabilityById(id: string): Promise<Vulnerability> {
    return this.mockData.getVulnerabilityById(id);
  }

  async updateVulnerability(id: string, data: any): Promise<Vulnerability> {
    return this.mockData.updateVulnerability(id, data);
  }

  async markVulnerabilityAsFalsePositive(id: string, isFalsePositive: boolean): Promise<Vulnerability> {
    return this.mockData.markVulnerabilityAsFalsePositive(id, isFalsePositive);
  }

  async deleteVulnerability(id: string): Promise<void> {
    // Mock 实现
  }

  async checkDatabaseHealth(): Promise<{ healthy: boolean; type: string; message?: string }> {
    return {
      healthy: true,
      type: 'mock',
      message: 'Using in-memory mock data for browser demo',
    };
  }

  async getDatabaseStats(): Promise<any> {
    const stats = this.mockData.getDashboardStats();
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
    return {
      dbPath: 'N/A (Browser Mode - Using Mock Data)',
      databaseExists: true,
      tableStats: {
        targets: this.mockData.targets.length,
        scan_tasks: this.mockData.scanTasks.length,
        vulnerabilities: this.mockData.vulnerabilities.length,
      },
    };
  }

  async getAppVersion(): Promise<string> {
    return '2.0.0-mock';
  }

  getPlatform(): string {
    return 'browser';
  }

  onScanProgress(callback: Function): void {
    // Mock: 不发送任何事件
  }

  onScanLog(callback: Function): void {
    // Mock: 不发送任何事件
  }

  onVulnFound(callback: Function): void {
    // Mock: 不发送任何事件
  }

  offScanProgress(callback?: Function): void {
    // Mock: 不需要移除
  }

  async getAllHttpRequests(): Promise<HttpRequest[]> {
    return this.mockData.getAllHttpRequests();
  }

  async getHttpRequestById(id: number): Promise<HttpRequest> {
    return this.mockData.getHttpRequestById(id);
  }

  async createHttpRequest(data: CreateHttpRequest): Promise<HttpRequest> {
    return this.mockData.createHttpRequest(data);
  }

  async updateHttpRequest(id: number, data: Partial<CreateHttpRequest>): Promise<void> {
    this.mockData.updateHttpRequest(id, data);
  }

  async deleteHttpRequest(id: number): Promise<void> {
    this.mockData.deleteHttpRequest(id);
  }

  async sendHttpRequest(id: number): Promise<HttpResponse> {
    return this.mockData.sendHttpRequest(id);
  }

  async getHttpResponseHistory(requestId: number): Promise<HttpResponse[]> {
    return this.mockData.getHttpResponseHistory(requestId);
  }

  async importHttpRequest(data: { data: string; type: 'curl' | 'http' }): Promise<HttpRequest> {
    throw new Error('Import not available in mock mode');
  }

  async getAllBruteTasks(): Promise<BruteTask[]> {
    return this.mockData.getAllBruteTasks();
  }

  async getBruteTask(id: number): Promise<BruteTask> {
    return this.mockData.getBruteTask(id);
  }

  async createBruteTask(data: any): Promise<BruteTask> {
    return this.mockData.createBruteTask(data);
  }

  async startBruteTask(id: number): Promise<void> {
    // Mock 实现
  }

  async cancelBruteTask(id: number): Promise<void> {
    // Mock 实现
  }

  async deleteBruteTask(id: number): Promise<void> {
    this.mockData.deleteBruteTask(id);
  }

  async getBruteTaskResults(id: number): Promise<BruteResult[]> {
    return [];
  }

  async getAllBrutePayloadSets(): Promise<BrutePayloadSet[]> {
    return this.mockData.getAllBrutePayloadSets();
  }

  async createBrutePayloadSet(data: any): Promise<BrutePayloadSet> {
    return this.mockData.createBrutePayloadSet(data);
  }

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
    // Mock 实现
  }

  async exportReport(data: any): Promise<Blob> {
    throw new Error('Export not available in mock mode');
  }

  async scanPorts(options: any): Promise<any[]> {
    return [
      { port: 80, status: 'open', service: 'http' },
      { port: 443, status: 'open', service: 'https' },
      { port: 22, status: 'open', service: 'ssh' },
    ];
  }

  async getCommonPorts(): Promise<number[]> {
    return [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 1723, 3306, 3389, 5432];
  }

  async bruteSubdomains(options: any): Promise<any[]> {
    return [
      { subdomain: 'www.example.com', status: 'found' },
      { subdomain: 'api.example.com', status: 'found' },
      { subdomain: 'admin.example.com', status: 'found' },
    ];
  }

  async getDomainWordlist(): Promise<string[]> {
    return [
      'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'ns2',
      'admin', 'api', 'test', 'dev', 'staging', 'production', 'blog', 'shop',
      'app', 'mobile', 'cdn', 'static', 'media', 'img', 'image', 'video',
      'm', 'help', 'support', 'docs', 'wiki', 'forum', 'community'
    ];
  }

  async getDomainRecords(domain: string, type: string): Promise<string[]> {
    return [];
  }
}

export const mockService = new MockService();
