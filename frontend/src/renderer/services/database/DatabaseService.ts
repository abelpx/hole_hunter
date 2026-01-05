/**
 * DatabaseService - 数据库服务（一期桌面版）
 *
 * 使用 better-sqlite3 实现本地数据持久化
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

// 数据类型定义
export interface Target {
  id: number;
  name: string;
  url: string;
  description?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ScanTask {
  id: number;
  target_id: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  strategy: 'quick' | 'deep' | 'custom';
  templates_used: string[];
  started_at?: string;
  completed_at?: string;
  total_templates: number;
  executed_templates: number;
  progress: number;
  current_template?: string;
  error?: string;
  created_at: string;
}

export interface Vulnerability {
  id: number;
  task_id: number;
  template_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  name: string;
  description?: string;
  url: string;
  matched_at: string;
  request_response?: string;
  false_positive: boolean;
  notes?: string;
  cve?: string;
  cvss?: number;
  created_at: string;
}

export interface CreateTargetRequest {
  name: string;
  url: string;
  description?: string;
  tags?: string[];
}

export interface UpdateTargetRequest extends Partial<CreateTargetRequest> {
  id: number;
}

export interface CreateScanRequest {
  target_id: number;
  strategy: 'quick' | 'deep' | 'custom';
  templates?: string[];
  options?: ScanOptions;
}

export interface ScanOptions {
  rateLimit?: number;
  timeout?: number;
  concurrent?: number;
  retries?: number;
}

export class DatabaseService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    // 如果未指定路径，使用用户数据目录
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'data');

    // 确保数据目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const finalDbPath = dbPath || path.join(dataDir, 'holehunter.db');

    this.db = new Database(finalDbPath);
    this.db.pragma('journal_mode = WAL'); // 启用 WAL 模式
    this.initSchema();
  }

  /**
   * 初始化数据库表结构
   */
  private initSchema(): void {
    this.db.exec(`
      -- 目标表
      CREATE TABLE IF NOT EXISTS targets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        description TEXT,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 扫描任务表
      CREATE TABLE IF NOT EXISTS scan_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_id INTEGER REFERENCES targets(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending',
        strategy TEXT,
        templates_used TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        total_templates INTEGER,
        executed_templates INTEGER,
        progress INTEGER DEFAULT 0,
        current_template TEXT,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 漏洞结果表
      CREATE TABLE IF NOT EXISTS vulnerabilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER REFERENCES scan_tasks(id) ON DELETE CASCADE,
        template_id TEXT,
        severity TEXT,
        name TEXT,
        description TEXT,
        url TEXT,
        matched_at TEXT,
        request_response TEXT,
        false_positive BOOLEAN DEFAULT 0,
        notes TEXT,
        cve TEXT,
        cvss REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 配置表
      CREATE TABLE IF NOT EXISTS configurations (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 自定义模板表
      CREATE TABLE IF NOT EXISTS custom_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        content TEXT,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 创建索引
      CREATE INDEX IF NOT EXISTS idx_scan_tasks_target_id ON scan_tasks(target_id);
      CREATE INDEX IF NOT EXISTS idx_scan_tasks_status ON scan_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_task_id ON vulnerabilities(task_id);
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
    `);
  }

  // ==================== 目标管理 ====================

  /**
   * 获取所有目标
   */
  getTargets(): Target[] {
    const stmt = this.db.prepare('SELECT * FROM targets ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  }

  /**
   * 获取单个目标
   */
  getTarget(id: number): Target | null {
    const stmt = this.db.prepare('SELECT * FROM targets WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    };
  }

  /**
   * 创建目标
   */
  createTarget(data: CreateTargetRequest): number {
    const stmt = this.db.prepare(`
      INSERT INTO targets (name, url, description, tags)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.url,
      data.description || null,
      data.tags ? JSON.stringify(data.tags) : null
    );

    return result.lastInsertRowid as number;
  }

  /**
   * 更新目标
   */
  updateTarget(id: number, data: UpdateTargetRequest): void {
    const stmt = this.db.prepare(`
      UPDATE targets
      SET name = ?, url = ?, description = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      data.name,
      data.url,
      data.description || null,
      data.tags ? JSON.stringify(data.tags) : null,
      id
    );
  }

  /**
   * 删除目标
   */
  deleteTarget(id: number): void {
    const stmt = this.db.prepare('DELETE FROM targets WHERE id = ?');
    stmt.run(id);
  }

  // ==================== 扫描任务管理 ====================

  /**
   * 获取所有扫描任务
   */
  getScanTasks(limit?: number): ScanTask[] {
    let sql = 'SELECT * FROM scan_tasks ORDER BY created_at DESC';
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      ...row,
      templates_used: row.templates_used ? JSON.parse(row.templates_used) : [],
    }));
  }

  /**
   * 获取单个扫描任务
   */
  getScanTask(id: number): ScanTask | null {
    const stmt = this.db.prepare('SELECT * FROM scan_tasks WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      ...row,
      templates_used: row.templates_used ? JSON.parse(row.templates_used) : [],
    };
  }

  /**
   * 创建扫描任务
   */
  createScanTask(data: CreateScanRequest): number {
    const stmt = this.db.prepare(`
      INSERT INTO scan_tasks (target_id, status, strategy, templates_used)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.target_id,
      'pending',
      data.strategy,
      data.templates ? JSON.stringify(data.templates) : null
    );

    return result.lastInsertRowid as number;
  }

  /**
   * 更新扫描任务状态
   */
  updateScanStatus(id: number, status: ScanTask['status']): void {
    const stmt = this.db.prepare(`
      UPDATE scan_tasks
      SET status = ?
      WHERE id = ?
    `);
    stmt.run(status, id);
  }

  /**
   * 更新扫描进度
   */
  updateScanProgress(id: number, progress: number, executedTemplates?: number, currentTemplate?: string): void {
    const stmt = this.db.prepare(`
      UPDATE scan_tasks
      SET progress = ?, executed_templates = ?, current_template = ?
      WHERE id = ?
    `);
    stmt.run(progress, executedTemplates || 0, currentTemplate || null, id);
  }

  /**
   * 完成扫描任务
   */
  completeScanTask(id: number, status: 'completed' | 'failed' | 'cancelled', error?: string): void {
    const stmt = this.db.prepare(`
      UPDATE scan_tasks
      SET status = ?, completed_at = CURRENT_TIMESTAMP, error = ?, progress = 100
      WHERE id = ?
    `);
    stmt.run(status, error || null, id);
  }

  /**
   * 删除扫描任务
   */
  deleteScanTask(id: number): void {
    const stmt = this.db.prepare('DELETE FROM scan_tasks WHERE id = ?');
    stmt.run(id);
  }

  // ==================== 漏洞管理 ====================

  /**
   * 获取漏洞列表
   */
  getVulnerabilities(filter?: { task_id?: number; severity?: string }): Vulnerability[] {
    let sql = 'SELECT * FROM vulnerabilities WHERE 1=1';
    const params: any[] = [];

    if (filter?.task_id) {
      sql += ' AND task_id = ?';
      params.push(filter.task_id);
    }

    if (filter?.severity) {
      sql += ' AND severity = ?';
      params.push(filter.severity);
    }

    sql += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      ...row,
      false_positive: Boolean(row.false_positive),
      request_response: row.request_response ? JSON.parse(row.request_response) : undefined,
    }));
  }

  /**
   * 插入漏洞结果
   */
  insertVulnerability(data: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO vulnerabilities (
        task_id, template_id, severity, name, description, url,
        matched_at, request_response, false_positive, notes, cve, cvss
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.task_id,
      data.template_id,
      data.severity,
      data.name,
      data.description || null,
      data.url,
      data.matched_at,
      data.request_response ? JSON.stringify(data.request_response) : null,
      data.false_positive ? 1 : 0,
      data.notes || null,
      data.cve || null,
      data.cvss || null
    );
  }

  /**
   * 批量插入漏洞结果
   */
  insertVulnerabilities(vulnerabilities: any[]): void {
    const insertMany = this.db.transaction((vulns) => {
      for (const vuln of vulns) {
        this.insertVulnerability(vuln);
      }
    });

    insertMany(vulnerabilities);
  }

  /**
   * 更新漏洞（标记误报、添加备注）
   */
  updateVulnerability(id: number, data: { false_positive?: boolean; notes?: string }): void {
    const stmt = this.db.prepare(`
      UPDATE vulnerabilities
      SET false_positive = ?, notes = ?
      WHERE id = ?
    `);
    stmt.run(
      data.false_positive !== undefined ? (data.false_positive ? 1 : 0) : undefined,
      data.notes || null,
      id
    );
  }

  /**
   * 删除漏洞
   */
  deleteVulnerability(id: number): void {
    const stmt = this.db.prepare('DELETE FROM vulnerabilities WHERE id = ?');
    stmt.run(id);
  }

  // ==================== 统计查询 ====================

  /**
   * 获取仪表板统计数据
   */
  getDashboardStats() {
    const targetCount = this.db.prepare('SELECT COUNT(*) as count FROM targets').get() as { count: number };
    const scanCount = this.db.prepare('SELECT COUNT(*) as count FROM scan_tasks').get() as { count: number };
    const vulnCount = this.db.prepare('SELECT COUNT(*) as count FROM vulnerabilities WHERE false_positive = 0').get() as { count: number };

    const severityStats = this.db.prepare(`
      SELECT severity, COUNT(*) as count
      FROM vulnerabilities
      WHERE false_positive = 0
      GROUP BY severity
    `).all() as { severity: string; count: number }[];

    return {
      total_targets: targetCount.count,
      total_scans: scanCount.count,
      total_vulnerabilities: vulnCount.count,
      severity_stats: severityStats.reduce((acc, { severity, count }) => {
        acc[severity] = count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }
}

// 导出单例
let dbInstance: DatabaseService | null = null;

export function getDatabase(): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService();
  }
  return dbInstance;
}
