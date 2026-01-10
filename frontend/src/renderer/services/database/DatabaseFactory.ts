/**
 * DatabaseFactory - 数据库工厂
 *
 * 根据配置创建对应的数据库适配器实例
 *
 * ============================================================================
 * 注意：此代码目前在桌面版本中未被使用
 * ----------------------------------------------------------------------------
 *
 * 桌面版本的数据库操作架构：
 * - 所有数据库操作通过主进程的 DatabaseManager (better-sqlite3) 完成
 * - 渲染进程通过 IPC 通道与主进程通信
 * - 当前实现的主进程路径：src/main/database/DatabaseManager.ts
 *
 * 保留此代码的原因：
 * - 为未来可能的 Web 版本预留数据库适配层
 * - 支持多种数据库后端（SQLite、MySQL、PostgreSQL）
 * - 可以用于单元测试和集成测试
 *
 * 如果未来需要 Web 版本，可以：
 * 1. 使用此工厂模式创建数据库适配器
 * 2. 通过 HTTP API 与后端通信
 * 3. 保持与桌面版本相同的接口定义
 * ============================================================================
 */

import { IDatabaseAdapter } from './IDatabaseAdapter';
import { SQLiteAdapter } from './adapters/SQLiteAdapter';
import { loadDatabaseConfig, DatabaseConfig, DatabaseType } from './DatabaseConfig';

export class DatabaseFactory {
  /**
   * 根据配置创建数据库适配器
   */
  static async createAdapter(config?: DatabaseConfig): Promise<IDatabaseAdapter> {
    // 加载配置
    const dbConfig = config || loadDatabaseConfig();

    console.log(`[DatabaseFactory] Creating adapter for type: ${dbConfig.type}`);

    // 根据类型创建适配器
    switch (dbConfig.type) {
      case DatabaseType.SQLite:
        const sqliteAdapter = new SQLiteAdapter(dbConfig);
        await sqliteAdapter.initialize();
        return sqliteAdapter;

      case DatabaseType.MySQL:
      case DatabaseType.MariaDB:
        throw new Error('MySQL adapter is not supported in desktop application');

      case DatabaseType.PostgreSQL:
        throw new Error('PostgreSQL adapter is not implemented yet');

      default:
        throw new Error(`Unsupported database type: ${dbConfig.type}`);
    }
  }

  /**
   * 快捷方法：创建 SQLite 适配器（桌面端默认）
   */
  static async createSQLite(dbPath?: string): Promise<IDatabaseAdapter> {
    const config: DatabaseConfig = {
      type: DatabaseType.SQLite,
      connection: {
        sqlite: {
          path: dbPath,
          wal: true,
        },
      },
    };

    return this.createAdapter(config);
  }

  /**
   * 快捷方法：创建 MySQL 适配器（Web 端）
   * @deprecated MySQL is not supported in desktop application
   */
  static async createMySQL(
    _host: string,
    _port: number,
    _database: string,
    _user: string,
    _password: string
  ): Promise<IDatabaseAdapter> {
    throw new Error('MySQL adapter is not supported in desktop application');
  }
}

export default DatabaseFactory;
