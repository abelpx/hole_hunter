/**
 * DatabaseConfig - 数据库配置
 *
 * 支持根据环境配置选择不同的数据库实现
 */

export enum DatabaseType {
  SQLite = 'sqlite',
  MySQL = 'mysql',
  MariaDB = 'mariadb',
  PostgreSQL = 'postgresql',
}

export interface DatabaseConfig {
  /** 数据库类型 */
  type: DatabaseType;
  /** 连接配置 */
  connection: DatabaseConnectionConfig;
}

export interface DatabaseConnectionConfig {
  // SQLite 配置
  sqlite?: {
    /** 数据库文件路径 */
    path?: string;
    /** 是否启用 WAL 模式 */
    wal?: boolean;
  };

  // MySQL/MariaDB 配置
  mysql?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    /** 连接池配置 */
    pool?: {
      min: number;
      max: number;
    };
  };

  // PostgreSQL 配置
  postgresql?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    /** 连接池配置 */
    pool?: {
      min: number;
      max: number;
    };
  };
}

/**
 * 默认配置
 */
export const DEFAULT_DATABASE_CONFIG: DatabaseConfig = {
  type: DatabaseType.SQLite,
  connection: {
    sqlite: {
      path: undefined, // 使用默认路径
      wal: true,
    },
  },
};

/**
 * 从环境变量或配置文件加载数据库配置
 */
export function loadDatabaseConfig(): DatabaseConfig {
  // 从环境变量读取
  const dbType = process.env.HOLEHUNTER_DB_TYPE as DatabaseType;

  // 如果没有配置，使用默认 SQLite
  if (!dbType || dbType === DatabaseType.SQLite) {
    return DEFAULT_DATABASE_CONFIG;
  }

  // 根据类型加载不同配置
  switch (dbType) {
    case DatabaseType.MySQL:
    case DatabaseType.MariaDB:
      return {
        type: dbType,
        connection: {
          mysql: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            database: process.env.DB_NAME || 'holehunter',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            pool: {
              min: parseInt(process.env.DB_POOL_MIN || '2'),
              max: parseInt(process.env.DB_POOL_MAX || '10'),
            },
          },
        },
      };

    case DatabaseType.PostgreSQL:
      return {
        type: dbType,
        connection: {
          postgresql: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'holehunter',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            pool: {
              min: parseInt(process.env.DB_POOL_MIN || '2'),
              max: parseInt(process.env.DB_POOL_MAX || '10'),
            },
          },
        },
      };

    default:
      return DEFAULT_DATABASE_CONFIG;
  }
}
