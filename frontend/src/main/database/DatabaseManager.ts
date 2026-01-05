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
  private dbPath: string;

  private constructor() {
    // 设置数据库路径
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'data');

    this.dbPath = path.join(dataDir, 'holehunter.db');
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize(): Promise<void> {
    // 确保数据目录存在
    const fs = require('fs');
    const dataDir = path.dirname(this.dbPath);
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

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status);
      CREATE INDEX IF NOT EXISTS idx_scan_tasks_status ON scan_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON vulnerabilities(severity);
      CREATE INDEX IF NOT EXISTS idx_vulnerabilities_target_id ON vulnerabilities(target_id);
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
}
