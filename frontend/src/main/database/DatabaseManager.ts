/**
 * 主进程数据库管理器
 * 使用 better-sqlite3
 */

import { app } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';
import { Target, CreateTargetRequest, UpdateTargetRequest } from '../ipc/types';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database | null = null;
  private dbPath: string | null = null;

  private constructor() {
    // 路径将在 initialize() 中设置
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize(): Promise<void> {
    // 设置数据库路径（必须在 app ready 后调用）
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'data');
    this.dbPath = path.join(dataDir, 'holehunter.db');

    // 确保数据目录存在
    const fs = require('fs');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 打开数据库
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    // 创建表
    this.createTables();

    console.log('Database initialized at:', this.dbPath);
  }

  private createTables() {
    if (!this.db) return;

    // 目标表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS targets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        tags TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        last_checked TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // 扫描任务表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scan_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_id INTEGER NOT NULL,
        target_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        current_template TEXT,
        started_at TEXT,
        completed_at TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE
      )
    `);

    // 漏洞表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vulnerabilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        severity TEXT NOT NULL,
        url TEXT NOT NULL,
        template_id TEXT NOT NULL,
        cve TEXT,
        cvss REAL,
        description TEXT,
        reference TEXT,
        tags TEXT,
        discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
        is_false_positive INTEGER DEFAULT 0,
        target_id INTEGER NOT NULL,
        scan_id INTEGER NOT NULL,
        FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE,
        FOREIGN KEY (scan_id) REFERENCES scan_tasks(id) ON DELETE CASCADE
      )
    `);

    // HTTP 重放请求表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS http_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        headers TEXT,
        body TEXT,
        content_type TEXT,
        tags TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // HTTP 重放响应历史表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS http_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        status_code INTEGER,
        status_text TEXT,
        headers TEXT,
        body TEXT,
        body_size INTEGER DEFAULT 0,
        header_size INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 0,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (request_id) REFERENCES http_requests(id) ON DELETE CASCADE
      )
    `);

    // 暴力破解任务表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS brute_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        request_id INTEGER,
        type TEXT NOT NULL DEFAULT 'single',
        status TEXT NOT NULL DEFAULT 'pending',
        total_payloads INTEGER DEFAULT 0,
        sent_payloads INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (request_id) REFERENCES http_requests(id) ON DELETE SET NULL
      )
    `);

    // 暴力破解载荷集表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS brute_payload_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'custom',
        config TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // 暴力破解载荷表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS brute_payloads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_id INTEGER NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (set_id) REFERENCES brute_payload_sets(id) ON DELETE CASCADE
      )
    `);

    // 暴力破解结果表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS brute_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        param_name TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        status_code INTEGER,
        response_length INTEGER DEFAULT 0,
        response_time INTEGER DEFAULT 0,
        body TEXT,
        error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (task_id) REFERENCES brute_tasks(id) ON DELETE CASCADE
      )
    `);

    // 端口扫描任务表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS port_scan_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target TEXT NOT NULL,
        ports TEXT NOT NULL,
        timeout INTEGER DEFAULT 2000,
        batch_size INTEGER DEFAULT 50,
        status TEXT NOT NULL DEFAULT 'pending',
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // 端口扫描结果表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS port_scan_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        port INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'closed',
        service TEXT,
        banner TEXT,
        latency INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (task_id) REFERENCES port_scan_tasks(id) ON DELETE CASCADE
      )
    `);

    // 域名爆破任务表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS domain_brute_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        wordlist TEXT,
        timeout INTEGER DEFAULT 2000,
        batch_size INTEGER DEFAULT 50,
        status TEXT NOT NULL DEFAULT 'pending',
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // 域名爆破结果表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS domain_brute_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        subdomain TEXT NOT NULL,
        resolved INTEGER DEFAULT 0,
        ips TEXT DEFAULT '[]',
        latency INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (task_id) REFERENCES domain_brute_tasks(id) ON DELETE CASCADE
      )
    `);

    // DNS 记录查询历史表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dns_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        type TEXT NOT NULL,
        records TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // 扫描报告表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scan_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        target_ids TEXT,
        date_range TEXT,
        format TEXT DEFAULT 'json',
        file_path TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status);
      CREATE INDEX IF NOT EXISTS idx_scan_tasks_status ON scan_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_target_id ON vulnerabilities(target_id);

      CREATE INDEX IF NOT EXISTS idx_http_requests_created_at ON http_requests(created_at);
      CREATE INDEX IF NOT EXISTS idx_http_responses_request_id ON http_responses(request_id);
      CREATE INDEX IF NOT EXISTS idx_brute_tasks_status ON brute_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_brute_results_task_id ON brute_results(task_id);
      CREATE INDEX IF NOT EXISTS idx_port_scan_results_task_id ON port_scan_results(task_id);
      CREATE INDEX IF NOT EXISTS idx_domain_brute_results_task_id ON domain_brute_results(task_id);
      CREATE INDEX IF NOT EXISTS idx_domain_brute_results_subdomain ON domain_brute_results(subdomain);
    `);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  getType(): string {
    return 'sqlite';
  }

  async healthCheck(): Promise<boolean> {
    if (!this.db) return false;
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const targetCount = this.db.prepare('SELECT COUNT(*) as count FROM targets').get() as { count: number };
    const scanCount = this.db.prepare('SELECT COUNT(*) as count FROM scan_tasks').get() as { count: number };
    const vulnCount = this.db.prepare('SELECT COUNT(*) as count FROM vulnerabilities').get() as { count: number };

    return {
      targets: targetCount.count,
      scans: scanCount.count,
      vulnerabilities: vulnCount.count,
    };
  }

  // ==================== 目标管理 ====================

  async getTargets(): Promise<Target[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM targets ORDER BY created_at DESC
    `).all();

    return rows.map((row: any) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  }

  async getTargetById(id: number): Promise<Target | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const row = this.db.prepare('SELECT * FROM targets WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    };
  }

  async createTarget(data: CreateTargetRequest): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO targets (name, url, tags)
      VALUES (?, ?, ?)
    `).run(data.name, data.url, JSON.stringify(data.tags || []));

    return result.lastInsertRowid as number;
  }

  async updateTarget(id: number, data: UpdateTargetRequest): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.url !== undefined) {
      updates.push('url = ?');
      values.push(data.url);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(data.tags));
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    updates.push('updated_at = datetime("now")');
    values.push(id);

    this.db.prepare(`
      UPDATE targets SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
  }

  async deleteTarget(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.prepare('DELETE FROM targets WHERE id = ?').run(id);
  }

  // ==================== 扫描任务管理 ====================

  async getAllScanTasks(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM scan_tasks ORDER BY created_at DESC
    `).all();

    return rows;
  }

  async getScanTaskById(id: number): Promise<any | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const row = this.db.prepare('SELECT * FROM scan_tasks WHERE id = ?').get(id);
    return row || null;
  }

  async getScanTasksByTarget(targetId: number): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM scan_tasks WHERE target_id = ? ORDER BY created_at DESC
    `).all(targetId);

    return rows;
  }

  async createScanTask(data: {
    target_id: number;
    target_name: string;
  }): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO scan_tasks (target_id, target_name, status)
      VALUES (?, ?, 'pending')
    `).run(data.target_id, data.target_name);

    return result.lastInsertRowid as number;
  }

  async updateScanTask(id: number, data: {
    status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress?: number;
    current_template?: string;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
  }): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.progress !== undefined) {
      updates.push('progress = ?');
      values.push(data.progress);
    }
    if (data.current_template !== undefined) {
      updates.push('current_template = ?');
      values.push(data.current_template);
    }
    if (data.started_at !== undefined) {
      updates.push('started_at = ?');
      values.push(data.started_at);
    }
    if (data.completed_at !== undefined) {
      updates.push('completed_at = ?');
      values.push(data.completed_at);
    }
    if (data.error_message !== undefined) {
      updates.push('error_message = ?');
      values.push(data.error_message);
    }

    if (updates.length === 0) return;

    values.push(id);
    this.db.prepare(`
      UPDATE scan_tasks SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
  }

  async deleteScanTask(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.prepare('DELETE FROM scan_tasks WHERE id = ?').run(id);
  }

  // ==================== 漏洞管理 ====================

  async getAllVulnerabilities(filters?: {
    target_id?: number;
    scan_id?: number;
    severity?: string;
    is_false_positive?: boolean;
  }): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let query = 'SELECT * FROM vulnerabilities WHERE 1=1';
    const params: any[] = [];

    if (filters?.target_id) {
      query += ' AND target_id = ?';
      params.push(filters.target_id);
    }
    if (filters?.scan_id) {
      query += ' AND scan_id = ?';
      params.push(filters.scan_id);
    }
    if (filters?.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters?.is_false_positive !== undefined) {
      query += ' AND is_false_positive = ?';
      params.push(filters.is_false_positive ? 1 : 0);
    }

    query += ' ORDER BY discovered_at DESC';

    const rows = this.db.prepare(query).all(...params);
    return rows.map((row: any) => ({
      ...row,
      cve: row.cve ? JSON.parse(row.cve) : [],
      reference: row.reference ? JSON.parse(row.reference) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      is_false_positive: row.is_false_positive === 1,
    }));
  }

  async getVulnerabilityById(id: string): Promise<any | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const row = this.db.prepare('SELECT * FROM vulnerabilities WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      ...row,
      cve: row.cve ? JSON.parse(row.cve) : [],
      reference: row.reference ? JSON.parse(row.reference) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      is_false_positive: row.is_false_positive === 1,
    };
  }

  async getVulnerabilitiesByTarget(targetId: number): Promise<any[]> {
    return this.getAllVulnerabilities({ target_id: targetId });
  }

  async getVulnerabilitiesByScan(scanId: number): Promise<any[]> {
    return this.getAllVulnerabilities({ scan_id: scanId });
  }

  async createVulnerability(data: {
    id: string;
    name: string;
    severity: string;
    url: string;
    template_id: string;
    cve?: string[];
    cvss?: number;
    description?: string;
    reference?: string[];
    tags?: string[];
    target_id: number;
    scan_id: number;
  }): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.prepare(`
      INSERT INTO vulnerabilities (
        id, name, severity, url, template_id, cve, cvss,
        description, reference, tags, target_id, scan_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.name,
      data.severity,
      data.url,
      data.template_id,
      data.cve ? JSON.stringify(data.cve) : null,
      data.cvss,
      data.description,
      data.reference ? JSON.stringify(data.reference) : null,
      data.tags ? JSON.stringify(data.tags) : null,
      data.target_id,
      data.scan_id
    );
  }

  async updateVulnerability(id: string, data: {
    name?: string;
    severity?: string;
    description?: string;
    is_false_positive?: boolean;
  }): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.severity !== undefined) {
      updates.push('severity = ?');
      values.push(data.severity);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.is_false_positive !== undefined) {
      updates.push('is_false_positive = ?');
      values.push(data.is_false_positive ? 1 : 0);
    }

    if (updates.length === 0) return;

    values.push(id);
    this.db.prepare(`
      UPDATE vulnerabilities SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
  }

  async deleteVulnerability(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.prepare('DELETE FROM vulnerabilities WHERE id = ?').run(id);
  }

  async batchCreateVulnerabilities(vulnerabilities: Array<{
    id: string;
    name: string;
    severity: string;
    url: string;
    template_id: string;
    cve?: string[];
    cvss?: number;
    description?: string;
    reference?: string[];
    tags?: string[];
    target_id: number;
    scan_id: number;
  }>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const insert = this.db.prepare(`
      INSERT INTO vulnerabilities (
        id, name, severity, url, template_id, cve, cvss,
        description, reference, tags, target_id, scan_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((vulns) => {
      for (const vuln of vulns) {
        insert.run(
          vuln.id,
          vuln.name,
          vuln.severity,
          vuln.url,
          vuln.template_id,
          vuln.cve ? JSON.stringify(vuln.cve) : null,
          vuln.cvss,
          vuln.description,
          vuln.reference ? JSON.stringify(vuln.reference) : null,
          vuln.tags ? JSON.stringify(vuln.tags) : null,
          vuln.target_id,
          vuln.scan_id
        );
      }
    });

    insertMany(vulnerabilities);
  }

  // ==================== 事务支持 ====================

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = this.db.transaction(() => {
      return callback();
    });

    return transaction();
  }

  // ==================== 高级查询 ====================

  async getVulnerabilityStats(): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    falsePositives: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const total = this.db.prepare('SELECT COUNT(*) as count FROM vulnerabilities').get() as { count: number };
    const falsePositives = this.db.prepare(
      'SELECT COUNT(*) as count FROM vulnerabilities WHERE is_false_positive = 1'
    ).get() as { count: number };
    const bySeverityRows = this.db.prepare(`
      SELECT severity, COUNT(*) as count FROM vulnerabilities
      WHERE is_false_positive = 0
      GROUP BY severity
    `).all();

    const bySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const row of bySeverityRows as any[]) {
      bySeverity[row.severity] = row.count;
    }

    return {
      total: total.count,
      bySeverity,
      falsePositives: falsePositives.count,
    };
  }

  async getRecentVulnerabilities(limit: number = 10): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM vulnerabilities
      WHERE is_false_positive = 0
      ORDER BY discovered_at DESC
      LIMIT ?
    `).all(limit);

    return rows.map((row: any) => ({
      ...row,
      cve: row.cve ? JSON.parse(row.cve) : [],
      reference: row.reference ? JSON.parse(row.reference) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      is_false_positive: row.is_false_positive === 1,
    }));
  }

  async getScanStats(): Promise<{
    total: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const total = this.db.prepare('SELECT COUNT(*) as count FROM scan_tasks').get() as { count: number };
    const running = this.db.prepare(
      "SELECT COUNT(*) as count FROM scan_tasks WHERE status = 'running'"
    ).get() as { count: number };
    const completed = this.db.prepare(
      "SELECT COUNT(*) as count FROM scan_tasks WHERE status = 'completed'"
    ).get() as { count: number };
    const failed = this.db.prepare(
      "SELECT COUNT(*) as count FROM scan_tasks WHERE status = 'failed'"
    ).get() as { count: number };

    return {
      total: total.count,
      running: running.count,
      completed: completed.count,
      failed: failed.count,
    };
  }

  // ==================== 工具方法 ====================

  /**
   * 清空所有数据（谨慎使用）
   */
  async clearAllData(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.transaction(() => {
      this.db!.prepare('DELETE FROM vulnerabilities').run();
      this.db!.prepare('DELETE FROM scan_tasks').run();
      this.db!.prepare('DELETE FROM targets').run();
    })();
  }

  /**
   * 导出数据库为 JSON
   */
  async exportToJson(): Promise<{
    targets: any[];
    scanTasks: any[];
    vulnerabilities: any[];
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const targets = await this.getTargets();
    const scanTasks = await this.getAllScanTasks();
    const vulnerabilities = await this.getAllVulnerabilities();

    return {
      targets,
      scanTasks,
      vulnerabilities,
    };
  }

  // ==================== HTTP 重放请求管理 ====================

  async getAllHttpRequests(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM http_requests ORDER BY created_at DESC
    `).all();

    return rows.map((row: any) => ({
      ...row,
      headers: row.headers ? JSON.parse(row.headers) : {},
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  }

  async getHttpRequestById(id: number): Promise<any | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const row = this.db.prepare('SELECT * FROM http_requests WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      ...row,
      headers: row.headers ? JSON.parse(row.headers) : {},
      tags: row.tags ? JSON.parse(row.tags) : [],
    };
  }

  async createHttpRequest(data: {
    name: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    content_type?: string;
    tags?: string[];
  }): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO http_requests (name, method, url, headers, body, content_type, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      data.method,
      data.url,
      JSON.stringify(data.headers || {}),
      data.body || '',
      data.content_type || 'application/json',
      JSON.stringify(data.tags || [])
    );

    return result.lastInsertRowid as number;
  }

  async updateHttpRequest(id: number, data: {
    name?: string;
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string;
    content_type?: string;
    tags?: string[];
  }): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const updates: string[] = ['updated_at = datetime("now")'];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.method !== undefined) {
      updates.push('method = ?');
      values.push(data.method);
    }
    if (data.url !== undefined) {
      updates.push('url = ?');
      values.push(data.url);
    }
    if (data.headers !== undefined) {
      updates.push('headers = ?');
      values.push(JSON.stringify(data.headers));
    }
    if (data.body !== undefined) {
      updates.push('body = ?');
      values.push(data.body);
    }
    if (data.content_type !== undefined) {
      updates.push('content_type = ?');
      values.push(data.content_type);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(data.tags));
    }

    values.push(id);
    this.db.prepare(`
      UPDATE http_requests SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
  }

  async deleteHttpRequest(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.prepare('DELETE FROM http_requests WHERE id = ?').run(id);
  }

  // ==================== HTTP 响应历史管理 ====================

  async getHttpResponseHistory(requestId: number): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM http_responses WHERE request_id = ? ORDER BY created_at DESC
    `).all(requestId);

    return rows.map((row: any) => ({
      ...row,
      headers: row.headers ? JSON.parse(row.headers) : {},
    }));
  }

  async createHttpResponse(data: {
    request_id: number;
    status_code: number;
    status_text: string;
    headers?: Record<string, string>;
    body?: string;
    body_size?: number;
    header_size?: number;
    duration?: number;
  }): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO http_responses (request_id, status_code, status_text, headers, body, body_size, header_size, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.request_id,
      data.status_code,
      data.status_text,
      JSON.stringify(data.headers || {}),
      data.body || '',
      data.body_size || 0,
      data.header_size || 0,
      data.duration || 0
    );

    return result.lastInsertRowid as number;
  }

  // ==================== 暴力破解任务管理 ====================

  async getAllBruteTasks(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM brute_tasks ORDER BY created_at DESC
    `).all();

    return rows;
  }

  async getBruteTask(id: number): Promise<any | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const row = this.db.prepare('SELECT * FROM brute_tasks WHERE id = ?').get(id);
    return row || null;
  }

  async createBruteTask(data: {
    name: string;
    request_id?: number;
    type?: string;
    total_payloads?: number;
  }): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO brute_tasks (name, request_id, type, total_payloads)
      VALUES (?, ?, ?, ?)
    `).run(
      data.name,
      data.request_id || null,
      data.type || 'single',
      data.total_payloads || 0
    );

    return result.lastInsertRowid as number;
  }

  async updateBruteTask(id: number, data: {
    status?: string;
    sent_payloads?: number;
    success_count?: number;
    failure_count?: number;
    started_at?: string;
    completed_at?: string;
  }): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const updates: string[] = ['updated_at = datetime("now")'];
    const values: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.sent_payloads !== undefined) {
      updates.push('sent_payloads = ?');
      values.push(data.sent_payloads);
    }
    if (data.success_count !== undefined) {
      updates.push('success_count = ?');
      values.push(data.success_count);
    }
    if (data.failure_count !== undefined) {
      updates.push('failure_count = ?');
      values.push(data.failure_count);
    }
    if (data.started_at !== undefined) {
      updates.push('started_at = ?');
      values.push(data.started_at);
    }
    if (data.completed_at !== undefined) {
      updates.push('completed_at = ?');
      values.push(data.completed_at);
    }

    values.push(id);
    this.db.prepare(`
      UPDATE brute_tasks SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
  }

  async deleteBruteTask(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.prepare('DELETE FROM brute_tasks WHERE id = ?').run(id);
  }

  async getBruteTaskResults(taskId: number): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM brute_results WHERE task_id = ? ORDER BY created_at ASC
    `).all(taskId);

    return rows;
  }

  async createBruteResult(data: {
    task_id: number;
    param_name: string;
    payload: string;
    status: string;
    status_code?: number;
    response_length?: number;
    response_time?: number;
    body?: string;
    error?: string;
  }): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO brute_results (task_id, param_name, payload, status, status_code, response_length, response_time, body, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.task_id,
      data.param_name,
      data.payload,
      data.status,
      data.status_code || null,
      data.response_length || 0,
      data.response_time || 0,
      data.body || null,
      data.error || null
    );

    return result.lastInsertRowid as number;
  }

  async batchCreateBruteResults(results: Array<{
    task_id: number;
    param_name: string;
    payload: string;
    status: string;
    status_code?: number;
    response_length?: number;
    response_time?: number;
    body?: string;
    error?: string;
  }>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const insert = this.db.prepare(`
      INSERT INTO brute_results (task_id, param_name, payload, status, status_code, response_length, response_time, body, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((results) => {
      for (const result of results) {
        insert.run(
          result.task_id,
          result.param_name,
          result.payload,
          result.status,
          result.status_code || null,
          result.response_length || 0,
          result.response_time || 0,
          result.body || null,
          result.error || null
        );
      }
    });

    insertMany(results);
  }

  // ==================== 暴力破解载荷集管理 ====================

  async getAllBrutePayloadSets(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM brute_payload_sets ORDER BY created_at DESC
    `).all();

    return rows.map((row: any) => ({
      ...row,
      config: row.config ? JSON.parse(row.config) : {},
    }));
  }

  async createBrutePayloadSet(data: {
    name: string;
    type?: string;
    config?: Record<string, any>;
  }): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO brute_payload_sets (name, type, config)
      VALUES (?, ?, ?)
    `).run(
      data.name,
      data.type || 'custom',
      JSON.stringify(data.config || {})
    );

    return result.lastInsertRowid as number;
  }

  async deleteBrutePayloadSet(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.prepare('DELETE FROM brute_payload_sets WHERE id = ?').run(id);
  }

  async getPayloadsBySet(setId: number): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT payload FROM brute_payloads WHERE set_id = ? ORDER BY created_at ASC
    `).all(setId);

    return rows.map((row: any) => row.payload);
  }

  async addPayloadsToSet(setId: number, payloads: string[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const insert = this.db.prepare(`
      INSERT INTO brute_payloads (set_id, payload) VALUES (?, ?)
    `);

    const insertMany = this.db.transaction((payloads) => {
      for (const payload of payloads) {
        insert.run(setId, payload);
      }
    });

    insertMany(payloads);
  }

  // ==================== 端口扫描任务管理 ====================

  async createPortScanTask(data: {
    target: string;
    ports: number[];
    timeout?: number;
    batch_size?: number;
  }): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO port_scan_tasks (target, ports, timeout, batch_size, status)
      VALUES (?, ?, ?, ?, 'running')
    `).run(
      data.target,
      JSON.stringify(data.ports),
      data.timeout || 2000,
      data.batch_size || 50
    );

    return result.lastInsertRowid as number;
  }

  async updatePortScanTask(id: number, data: {
    status?: string;
    started_at?: string;
    completed_at?: string;
  }): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.started_at !== undefined) {
      updates.push('started_at = ?');
      values.push(data.started_at);
    }
    if (data.completed_at !== undefined) {
      updates.push('completed_at = ?');
      values.push(data.completed_at);
    }

    if (updates.length === 0) return;

    values.push(id);
    this.db.prepare(`
      UPDATE port_scan_tasks SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
  }

  async getPortScanTask(id: number): Promise<any | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const row = this.db.prepare('SELECT * FROM port_scan_tasks WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      ...row,
      ports: row.ports ? JSON.parse(row.ports) : [],
    };
  }

  async getAllPortScanTasks(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM port_scan_tasks ORDER BY created_at DESC
    `).all();

    return rows.map((row: any) => ({
      ...row,
      ports: row.ports ? JSON.parse(row.ports) : [],
    }));
  }

  async createPortScanResult(data: {
    task_id: number;
    port: number;
    status: string;
    service?: string;
    banner?: string;
    latency?: number;
  }): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO port_scan_results (task_id, port, status, service, banner, latency)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.task_id,
      data.port,
      data.status,
      data.service || null,
      data.banner || null,
      data.latency || 0
    );

    return result.lastInsertRowid as number;
  }

  async batchCreatePortScanResults(results: Array<{
    task_id: number;
    port: number;
    status: string;
    service?: string;
    banner?: string;
    latency?: number;
  }>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const insert = this.db.prepare(`
      INSERT INTO port_scan_results (task_id, port, status, service, banner, latency)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((results) => {
      for (const result of results) {
        insert.run(
          result.task_id,
          result.port,
          result.status,
          result.service || null,
          result.banner || null,
          result.latency || 0
        );
      }
    });

    insertMany(results);
  }

  async getPortScanResults(taskId: number): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM port_scan_results WHERE task_id = ? ORDER BY port ASC
    `).all(taskId);

    return rows;
  }

  // ==================== 域名爆破任务管理 ====================

  async createDomainBruteTask(data: {
    domain: string;
    wordlist?: string[];
    timeout?: number;
    batch_size?: number;
  }): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO domain_brute_tasks (domain, wordlist, timeout, batch_size, status)
      VALUES (?, ?, ?, ?, 'running')
    `).run(
      data.domain,
      JSON.stringify(data.wordlist || []),
      data.timeout || 2000,
      data.batch_size || 50
    );

    return result.lastInsertRowid as number;
  }

  async updateDomainBruteTask(id: number, data: {
    status?: string;
    started_at?: string;
    completed_at?: string;
  }): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.started_at !== undefined) {
      updates.push('started_at = ?');
      values.push(data.started_at);
    }
    if (data.completed_at !== undefined) {
      updates.push('completed_at = ?');
      values.push(data.completed_at);
    }

    if (updates.length === 0) return;

    values.push(id);
    this.db.prepare(`
      UPDATE domain_brute_tasks SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
  }

  async getDomainBruteTask(id: number): Promise<any | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const row = this.db.prepare('SELECT * FROM domain_brute_tasks WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      ...row,
      wordlist: row.wordlist ? JSON.parse(row.wordlist) : [],
    };
  }

  async getAllDomainBruteTasks(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM domain_brute_tasks ORDER BY created_at DESC
    `).all();

    return rows.map((row: any) => ({
      ...row,
      wordlist: row.wordlist ? JSON.parse(row.wordlist) : [],
    }));
  }

  async createDomainBruteResult(data: {
    task_id: number;
    subdomain: string;
    resolved: boolean;
    ips: string[];
    latency?: number;
  }): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO domain_brute_results (task_id, subdomain, resolved, ips, latency)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      data.task_id,
      data.subdomain,
      data.resolved ? 1 : 0,
      JSON.stringify(data.ips || []),
      data.latency || 0
    );

    return result.lastInsertRowid as number;
  }

  async batchCreateDomainBruteResults(results: Array<{
    task_id: number;
    subdomain: string;
    resolved: boolean;
    ips: string[];
    latency?: number;
  }>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const insert = this.db.prepare(`
      INSERT INTO domain_brute_results (task_id, subdomain, resolved, ips, latency)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((results) => {
      for (const result of results) {
        insert.run(
          result.task_id,
          result.subdomain,
          result.resolved ? 1 : 0,
          JSON.stringify(result.ips || []),
          result.latency || 0
        );
      }
    });

    insertMany(results);
  }

  async getDomainBruteResults(taskId: number): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM domain_brute_results WHERE task_id = ? ORDER BY created_at ASC
    `).all(taskId);

    return rows.map((row: any) => ({
      ...row,
      resolved: row.resolved === 1,
      ips: row.ips ? JSON.parse(row.ips) : [],
    }));
  }

  // ==================== DNS 记录查询管理 ====================

  async createDNSRecord(data: {
    domain: string;
    type: string;
    records: string[];
  }): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO dns_records (domain, type, records)
      VALUES (?, ?, ?)
    `).run(
      data.domain,
      data.type,
      JSON.stringify(data.records || [])
    );

    return result.lastInsertRowid as number;
  }

  async getDNSRecords(domain: string, type: string): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const row = this.db.prepare(`
      SELECT records FROM dns_records WHERE domain = ? AND type = ? ORDER BY created_at DESC LIMIT 1
    `).get(domain, type) as any;

    if (!row) return [];

    return row.records ? JSON.parse(row.records) : [];
  }

  // ==================== 扫描报告管理 ====================

  async createScanReport(data: {
    name: string;
    type: string;
    target_ids?: number[];
    date_range?: string;
    format?: string;
  }): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`
      INSERT INTO scan_reports (name, type, target_ids, date_range, format, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(
      data.name,
      data.type,
      JSON.stringify(data.target_ids || []),
      data.date_range || null,
      data.format || 'json'
    );

    return result.lastInsertRowid as number;
  }

  async updateScanReport(id: number, data: {
    status?: string;
    file_path?: string;
  }): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const updates: string[] = ['updated_at = datetime("now")'];
    const values: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.file_path !== undefined) {
      updates.push('file_path = ?');
      values.push(data.file_path);
    }

    if (updates.length === 1) return;

    values.push(id);
    this.db.prepare(`
      UPDATE scan_reports SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
  }

  async getAllScanReports(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const rows = this.db.prepare(`
      SELECT * FROM scan_reports ORDER BY created_at DESC
    `).all();

    return rows.map((row: any) => ({
      ...row,
      target_ids: row.target_ids ? JSON.parse(row.target_ids) : [],
    }));
  }

  async deleteScanReport(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.prepare('DELETE FROM scan_reports WHERE id = ?').run(id);
  }
}
