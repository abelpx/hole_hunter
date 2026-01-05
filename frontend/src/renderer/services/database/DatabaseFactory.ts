/**
 * DatabaseFactory - 数据库工厂
 *
 * 根据配置创建对应的数据库适配器实例
 */

import { IDatabaseAdapter } from './IDatabaseAdapter';
import { SQLiteAdapter } from './adapters/SQLiteAdapter';
import { MySQLAdapter } from './adapters/MySQLAdapter';
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
        const mysqlAdapter = new MySQLAdapter(dbConfig);
        await mysqlAdapter.initialize();
        return mysqlAdapter;

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
   */
  static async createMySQL(
    host: string,
    port: number,
    database: string,
    user: string,
    password: string
  ): Promise<IDatabaseAdapter> {
    const config: DatabaseConfig = {
      type: DatabaseType.MySQL,
      connection: {
        mysql: {
          host,
          port,
          database,
          user,
          password,
          pool: {
            min: 2,
            max: 10,
          },
        },
      },
    };

    return this.createAdapter(config);
  }
}

export default DatabaseFactory;
