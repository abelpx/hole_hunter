/**
 * MySQLAdapter - MySQL/MariaDB 数据库适配器
 *
 * 使用 mysql2 实现（Web 端可选）
 *
 * 注意：此适配器仅在 Web 端或需要远程数据库时使用
 * 桌面端默认使用 SQLiteAdapter
 */

import mysql from 'mysql2/promise';
import {
  IDatabaseAdapter,
  Target,
  ScanTask,
  Vulnerability,
  CreateTargetRequest,
  UpdateTargetRequest,
  CreateScanRequest,
} from '../IDatabaseAdapter';
import { DatabaseConfig } from '../DatabaseConfig';

export class MySQLAdapter implements IDatabaseAdapter {
  private pool: mysql.Pool | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const mysqlConfig = this.config.connection.mysql;
    if (!mysqlConfig) {
      throw new Error('MySQL configuration is required');
    }

    console.log(`[MySQL] Connecting to ${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database}`);

    // 创建连接池
    this.pool = mysql.createPool({
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      user: mysqlConfig.user,
      password: mysqlConfig.password,
      database: mysqlConfig.database,
      waitForConnections: true,
      connectionLimit: mysqlConfig.pool?.max || 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    // 测试连接
    const connection = await this.pool.getConnection();
    await connection.ping();
    connection.release();

    // 创建表结构
    await this.createSchema();
  }

  private async createSchema(): Promise<void> {
    if (!this.pool) throw new Error('Database not initialized');

    const connection = await this.pool.getConnection();

    try {
      await connection.query(`
        -- 目标表
        CREATE TABLE IF NOT EXISTS targets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          url VARCHAR(2048) NOT NULL UNIQUE,
          description TEXT,
          tags JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- 扫描任务表
        CREATE TABLE IF NOT EXISTS scan_tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          target_id INT NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          strategy VARCHAR(50),
          templates_used JSON,
          started_at TIMESTAMP NULL,
          completed_at TIMESTAMP NULL,
          total_templates INT DEFAULT 0,
          executed_templates INT DEFAULT 0,
          progress INT DEFAULT 0,
          current_template VARCHAR(255),
          error TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE CASCADE,
          INDEX idx_target_id (target_id),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- 漏洞结果表
        CREATE TABLE IF NOT EXISTS vulnerabilities (
          id INT AUTO_INCREMENT PRIMARY KEY,
          task_id INT NOT NULL,
          template_id VARCHAR(255),
          severity VARCHAR(50),
          name VARCHAR(255),
          description TEXT,
          url VARCHAR(2048),
          matched_at VARCHAR(2048),
          request_response JSON,
          false_positive BOOLEAN DEFAULT FALSE,
          notes TEXT,
          cve VARCHAR(255),
          cvss DECIMAL(3,1),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (task_id) REFERENCES scan_tasks(id) ON DELETE CASCADE,
          INDEX idx_task_id (task_id),
          INDEX idx_severity (severity),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- 配置表
        CREATE TABLE IF NOT EXISTS configurations (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        -- 自定义模板表
        CREATE TABLE IF NOT EXISTS custom_templates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          path VARCHAR(500) NOT NULL,
          content TEXT,
          enabled BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } finally {
      connection.release();
    }
  }

  close(): void {
    if (this.pool) {
      this.pool.end();
      this.pool = null;
    }
  }

  // ==================== 辅助方法 ====================

  private async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.pool) throw new Error('Database not initialized');

    const [rows] = await this.pool.execute(sql, params);
    return rows as T[];
  }

  private async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  // ==================== 目标管理 ====================

  async getTargets(): Promise<Target[]> {
    const rows = await this.query<any>(
      'SELECT * FROM targets ORDER BY created_at DESC'
    );

    return rows.map((row) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  }

  async getTarget(id: number): Promise<Target | null> {
    const row = await this.queryOne<any>('SELECT * FROM targets WHERE id = ?', [id]);

    if (!row) return null;

    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    };
  }

  async createTarget(data: CreateTargetRequest): Promise<number> {
    const result = await this.query<mysql.OkPacket>(
      `INSERT INTO targets (name, url, description, tags) VALUES (?, ?, ?, ?)`,
      [
        data.name,
        data.url,
        data.description || null,
        data.tags ? JSON.stringify(data.tags) : null,
      ]
    );

    return result.insertId;
  }

  async updateTarget(id: number, data: UpdateTargetRequest): Promise<void> {
    await this.query(
      `UPDATE targets SET name = ?, url = ?, description = ?, tags = ? WHERE id = ?`,
      [
        data.name,
        data.url,
        data.description || null,
        data.tags ? JSON.stringify(data.tags) : null,
        id,
      ]
    );
  }

  async deleteTarget(id: number): Promise<void> {
    await this.query('DELETE FROM targets WHERE id = ?', [id]);
  }

  // ==================== 扫描任务管理 ====================

  async getScanTasks(limit?: number): Promise<ScanTask[]> {
    let sql = 'SELECT * FROM scan_tasks ORDER BY created_at DESC';
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    const rows = await this.query<any>(sql);

    return rows.map((row) => ({
      ...row,
      templates_used: row.templates_used ? JSON.parse(row.templates_used) : [],
    }));
  }

  async getScanTask(id: number): Promise<ScanTask | null> {
    const row = await this.queryOne<any>('SELECT * FROM scan_tasks WHERE id = ?', [id]);

    if (!row) return null;

    return {
      ...row,
      templates_used: row.templates_used ? JSON.parse(row.templates_used) : [],
    };
  }

  async createScanTask(data: CreateScanRequest): Promise<number> {
    const result = await this.query<mysql.OkPacket>(
      `INSERT INTO scan_tasks (target_id, status, strategy, templates_used) VALUES (?, ?, ?, ?)`,
      [data.target_id, 'pending', data.strategy, data.templates ? JSON.stringify(data.templates) : null]
    );

    return result.insertId;
  }

  async updateScanStatus(id: number, status: ScanTask['status']): Promise<void> {
    await this.query('UPDATE scan_tasks SET status = ? WHERE id = ?', [status, id]);
  }

  async updateScanProgress(
    id: number,
    progress: number,
    executedTemplates?: number,
    currentTemplate?: string
  ): Promise<void> {
    await this.query(
      `UPDATE scan_tasks SET progress = ?, executed_templates = ?, current_template = ? WHERE id = ?`,
      [progress, executedTemplates || 0, currentTemplate || null, id]
    );
  }

  async completeScanTask(
    id: number,
    status: 'completed' | 'failed' | 'cancelled',
    error?: string
  ): Promise<void> {
    await this.query(
      `UPDATE scan_tasks SET status = ?, completed_at = CURRENT_TIMESTAMP, error = ?, progress = 100 WHERE id = ?`,
      [status, error || null, id]
    );
  }

  async deleteScanTask(id: number): Promise<void> {
    await this.query('DELETE FROM scan_tasks WHERE id = ?', [id]);
  }

  // ==================== 漏洞管理 ====================

  async getVulnerabilities(filter?: { task_id?: number; severity?: string }): Promise<Vulnerability[]> {
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

    const rows = await this.query<any>(sql, params);

    return rows.map((row) => ({
      ...row,
      false_positive: Boolean(row.false_positive),
      request_response: row.request_response ? JSON.parse(row.request_response) : undefined,
    }));
  }

  async insertVulnerability(data: any): Promise<void> {
    await this.query(
      `INSERT INTO vulnerabilities (task_id, template_id, severity, name, description, url, matched_at, request_response, false_positive, notes, cve, cvss)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.task_id,
        data.template_id,
        data.severity,
        data.name,
        data.description || null,
        data.url,
        data.matched_at,
        data.request_response ? JSON.stringify(data.request_response) : null,
        data.false_positive,
        data.notes || null,
        data.cve || null,
        data.cvss || null,
      ]
    );
  }

  async insertVulnerabilities(
    vulnerabilities: any[]
  ): Promise<void> {
    const connection = await this.pool!.getConnection();

    try {
      await connection.beginTransaction();

      for (const vuln of vulnerabilities) {
        await this.insertVulnerability(vuln);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateVulnerability(
    id: number,
    data: { false_positive?: boolean; notes?: string }
  ): Promise<void> {
    await this.query(
      'UPDATE vulnerabilities SET false_positive = ?, notes = ? WHERE id = ?',
      [data.false_positive ?? null, data.notes || null, id]
    );
  }

  async deleteVulnerability(id: number): Promise<void> {
    await this.query('DELETE FROM vulnerabilities WHERE id = ?', [id]);
  }

  // ==================== 统计查询 ====================

  async getDashboardStats(): Promise<{
    total_targets: number;
    total_scans: number;
    total_vulnerabilities: number;
    severity_stats: Record<string, number>;
  }> {
    const targetCount = await this.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM targets');
    const scanCount = await this.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM scan_tasks');
    const vulnCount = await this.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM vulnerabilities WHERE false_positive = 0'
    );

    const severityStats = await this.query<{ severity: string; count: number }>(
      `SELECT severity, COUNT(*) as count
       FROM vulnerabilities
       WHERE false_positive = 0
       GROUP BY severity`
    );

    return {
      total_targets: targetCount?.count || 0,
      total_scans: scanCount?.count || 0,
      total_vulnerabilities: vulnCount?.count || 0,
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
    const connection = await this.pool!.getConnection();

    try {
      await connection.beginTransaction();
      const result = await callback();
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==================== 健康检查 ====================

  async healthCheck(): Promise<boolean> {
    if (!this.pool) return false;

    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch {
      return false;
    }
  }
}
