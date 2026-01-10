/**
 * SQLiteAdapter - SQLite 数据库适配器
 *
 * 使用 better-sqlite3 实现（桌面端默认）
 *
 * ============================================================================
 * 注意：此代码目前在桌面版本中未被使用
 * ----------------------------------------------------------------------------
 *
 * 桌面版本使用主进程的 DatabaseManager：
 * - 路径：src/main/database/DatabaseManager.ts
 * - 直接使用 better-sqlite3，无需适配层
 * - 通过 IPC 通道暴露给渲染进程
 *
 * 保留此代码的原因：
 * - 为未来可能的 Web 版本或直接数据库访问预留
 * - 可以用于单元测试（需要 mock Electron 环境）
 * - 提供了与主进程 DatabaseManager 相似的接口
 * ============================================================================
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import {
  IDatabaseAdapter,
  Target,
  ScanTask,
  Vulnerability,
  CreateTargetRequest,
  UpdateTargetRequest,
  CreateScanRequest,
} from '../IDatabaseAdapter';
import { DatabaseConfig, DatabaseType } from '../DatabaseConfig';

export class SQLiteAdapter implements IDatabaseAdapter {
  private db: Database.Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // 确定数据库文件路径
    let dbPath: string;

    if (this.config.connection.sqlite?.path) {
      dbPath = this.config.connection.sqlite.path;
    } else {
      // 使用默认路径：用户数据目录
      const userDataPath = app.getPath('userData');
      const dataDir = path.join(userDataPath, 'data');

      // 确保数据目录存在
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      dbPath = path.join(dataDir, 'holehunter.db');
    }

    console.log(`[SQLite] Initializing database at: ${dbPath}`);

    // 打开数据库连接
    this.db = new Database(dbPath);

    // 启用 WAL 模式（提高并发性能）
    if (this.config.connection.sqlite?.wal !== false) {
      this.db.pragma('journal_mode = WAL');
    }

    // 创建表结构
    this.createSchema();
  }

  private createSchema(): void {
    if (!this.db) throw new Error('Database not initialized');

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

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ==================== 目标管理 ====================

  async getTargets(): Promise<Target[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM targets ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  }

  async getTarget(id: number): Promise<Target | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM targets WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    };
  }

  async createTarget(data: CreateTargetRequest): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

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

  async updateTarget(id: number, data: UpdateTargetRequest): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

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

  async deleteTarget(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM targets WHERE id = ?');
    stmt.run(id);
  }

  // ==================== 扫描任务管理 ====================

  async getScanTasks(limit?: number): Promise<ScanTask[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM scan_tasks ORDER BY created_at DESC';
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      ...row,
      templates_used: row.templates_used ? JSON.parse(row.templates_used) : [],
    }));
  }

  async getScanTask(id: number): Promise<ScanTask | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM scan_tasks WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      ...row,
      templates_used: row.templates_used ? JSON.parse(row.templates_used) : [],
    };
  }

  async createScanTask(data: CreateScanRequest): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

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

  async updateScanStatus(id: number, status: ScanTask['status']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      UPDATE scan_tasks
      SET status = ?
      WHERE id = ?
    `);
    stmt.run(status, id);
  }

  async updateScanProgress(
    id: number,
    progress: number,
    executedTemplates?: number,
    currentTemplate?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      UPDATE scan_tasks
      SET progress = ?, executed_templates = ?, current_template = ?
      WHERE id = ?
    `);
    stmt.run(progress, executedTemplates || 0, currentTemplate || null, id);
  }

  async completeScanTask(
    id: number,
    status: 'completed' | 'failed' | 'cancelled',
    error?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      UPDATE scan_tasks
      SET status = ?, completed_at = CURRENT_TIMESTAMP, error = ?, progress = 100
      WHERE id = ?
    `);
    stmt.run(status, error || null, id);
  }

  async deleteScanTask(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM scan_tasks WHERE id = ?');
    stmt.run(id);
  }

  // ==================== 漏洞管理 ====================

  async getVulnerabilities(filter?: {
    task_id?: number;
    severity?: string;
  }): Promise<Vulnerability[]> {
    if (!this.db) throw new Error('Database not initialized');

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

    return rows.map((row) => ({
      ...row,
      false_positive: Boolean(row.false_positive),
      request_response: row.request_response ? JSON.parse(row.request_response) : undefined,
    }));
  }

  async insertVulnerability(data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

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

  async insertVulnerabilities(
    vulnerabilities: any[]
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const insertMany = this.db.transaction((vulns) => {
      for (const vuln of vulns) {
        this.insertVulnerability(vuln);
      }
    });

    insertMany(vulnerabilities);
  }

  async updateVulnerability(
    id: number,
    data: { false_positive?: boolean; notes?: string }
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

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

  async deleteVulnerability(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM vulnerabilities WHERE id = ?');
    stmt.run(id);
  }

  // ==================== 统计查询 ====================

  async getDashboardStats(): Promise<{
    total_targets: number;
    total_scans: number;
    total_vulnerabilities: number;
    severity_stats: Record<string, number>;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const targetCount = this.db.prepare('SELECT COUNT(*) as count FROM targets').get() as {
      count: number;
    };
    const scanCount = this.db.prepare('SELECT COUNT(*) as count FROM scan_tasks').get() as {
      count: number;
    };
    const vulnCount = this.db.prepare(
      'SELECT COUNT(*) as count FROM vulnerabilities WHERE false_positive = 0'
    ).get() as { count: number };

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
      severity_stats: severityStats.reduce(
        (acc, { severity, count }) => {
          acc[severity] = count;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  // ==================== 事务支持 ====================

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(() => {
      return callback();
    });

    return transaction();
  }

  // ==================== 健康检查 ====================

  async healthCheck(): Promise<boolean> {
    if (!this.db) return false;

    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }
}
