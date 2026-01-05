/**
 * DatabaseManager - 数据库管理器
 *
 * 提供统一的数据库访问入口（单例模式）
 */

import { IDatabaseAdapter } from './IDatabaseAdapter';
import { DatabaseFactory } from './DatabaseFactory';
import { loadDatabaseConfig, DatabaseType } from './DatabaseConfig';

class DatabaseManager {
  private adapter: IDatabaseAdapter | null = null;
  private initialized = false;

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[DatabaseManager] Already initialized');
      return;
    }

    console.log('[DatabaseManager] Initializing...');

    // 加载配置
    const config = loadDatabaseConfig();
    console.log(`[DatabaseManager] Database type: ${config.type}`);

    // 创建适配器
    this.adapter = await DatabaseFactory.createAdapter(config);
    this.initialized = true;

    // 健康检查
    const healthy = await this.adapter.healthCheck();
    if (!healthy) {
      throw new Error('Database health check failed');
    }

    console.log('[DatabaseManager] Initialized successfully');
  }

  /**
   * 获取数据库适配器
   */
  getAdapter(): IDatabaseAdapter {
    if (!this.adapter) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.adapter;
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.adapter) {
      this.adapter.close();
      this.adapter = null;
      this.initialized = false;
    }
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取当前数据库类型
   */
  getDatabaseType(): DatabaseType {
    const config = loadDatabaseConfig();
    return config.type;
  }
}

// 导出单例
const dbManager = new DatabaseManager();

export default dbManager;

// 便捷导出
export function getDatabase(): IDatabaseAdapter {
  return dbManager.getAdapter();
}

export async function initDatabase(): Promise<void> {
  await dbManager.initialize();
}

export async function closeDatabase(): Promise<void> {
  await dbManager.close();
}

export function isDatabaseInitialized(): boolean {
  return dbManager.isInitialized();
}
