/**
 * 数据库使用示例
 *
 * 演示如何使用可配置的数据库层
 */

import {
  getDatabase,
  initDatabase,
  closeDatabase,
  isDatabaseInitialized,
} from './DatabaseManager';
import { DatabaseFactory } from './DatabaseFactory';
import { DatabaseType } from './DatabaseConfig';

// ==================== 示例 1: 使用默认配置（推荐）====================

async function example1() {
  // 初始化数据库（自动根据环境变量选择数据库）
  // 桌面端默认 SQLite，Web 端可配置 MySQL
  await initDatabase();

  // 获取数据库实例
  const db = getDatabase();

  // 使用数据库（所有数据库类型 API 一致）
  const targets = await db.getTargets();
  console.log('Targets:', targets);

  // 创建目标
  const targetId = await db.createTarget({
    name: 'Example',
    url: 'https://example.com',
    tags: ['production', 'web'],
  });
  console.log('Created target:', targetId);

  // 关闭连接
  await closeDatabase();
}

// ==================== 示例 2: 指定 SQLite ====================

async function example2() {
  // 创建 SQLite 适配器（默认路径）
  const db1 = await DatabaseFactory.createSQLite();
  const targets = await db1.getTargets();

  // 或指定自定义路径
  const db2 = await DatabaseFactory.createSQLite('/custom/path/holehunter.db');
}

// ==================== 示例 3: 指定 MySQL（Web 端）====================

async function example3() {
  // 创建 MySQL 适配器
  const db = await DatabaseFactory.createMySQL(
    'localhost',      // host
    3306,             // port
    'holehunter',     // database
    'root',           // user
    'password123'     // password
  );

  // 使用方式与 SQLite 完全相同
  const targets = await db.getTargets();
  console.log('Targets from MySQL:', targets);

  // 关闭连接
  db.close();
}

// ==================== 示例 4: 根据环境变量动态选择 ====================

async function example4() {
  // 从环境变量读取配置
  const dbType = process.env.HOLEHUNTER_DB_TYPE as DatabaseType;

  console.log('Database Type:', dbType); // sqlite | mysql | mariadb | postgresql

  // 初始化（自动选择适配器）
  await initDatabase();

  // 所有数据库操作使用相同 API
  const db = getDatabase();

  // 目标管理
  const targets = await db.getTargets();
  const target = await db.getTarget(1);
  const newId = await db.createTarget({
    name: 'New Target',
    url: 'https://example.com',
  });
  await db.updateTarget(newId, { name: 'Updated Target' });
  await db.deleteTarget(newId);

  // 扫描任务
  const taskId = await db.createScanTask({
    target_id: 1,
    strategy: 'quick',
    templates: ['cves', 'vulnerabilities'],
  });

  await db.updateScanStatus(taskId, 'running');
  await db.updateScanProgress(taskId, 50, 100, 'CVE-2024-XXXX');
  await db.completeScanTask(taskId, 'completed');

  // 漏洞管理
  const vulns = await db.getVulnerabilities({ task_id: taskId });
  await db.insertVulnerability({
    task_id: taskId,
    template_id: 'cve-2024-1234',
    severity: 'critical',
    name: 'Remote Code Execution',
    url: 'https://example.com/admin',
    matched_at: new Date().toISOString(),
    false_positive: false,
  });

  // 批量插入
  await db.insertVulnerabilities([
    {
      task_id: taskId,
      template_id: 'template-1',
      severity: 'high',
      name: 'SQL Injection',
      url: 'https://example.com/api',
      matched_at: new Date().toISOString(),
      false_positive: false,
    },
    {
      task_id: taskId,
      template_id: 'template-2',
      severity: 'medium',
      name: 'XSS',
      url: 'https://example.com/search',
      matched_at: new Date().toISOString(),
      false_positive: false,
    },
  ]);

  // 统计
  const stats = await db.getDashboardStats();
  console.log('Stats:', stats);
  // {
  //   total_targets: 10,
  //   total_scans: 50,
  //   total_vulnerabilities: 123,
  //   severity_stats: { critical: 5, high: 20, medium: 50, low: 30, info: 18 }
  // }

  // 事务
  await db.transaction(async () => {
    await db.createTarget({ name: 'Target 1', url: 'https://example1.com' });
    await db.createTarget({ name: 'Target 2', url: 'https://example2.com' });
    // 如果出错，自动回滚
  });

  // 健康检查
  const healthy = await db.healthCheck();
  console.log('Database healthy:', healthy);

  // 关闭
  await closeDatabase();
}

// ==================== 示例 5: 在 React 组件中使用 ====================

import { useEffect, useState } from 'react';

export function TargetList() {
  const [targets, setTargets] = useState([]);

  useEffect(() => {
    async function loadTargets() {
      try {
        await initDatabase();
        const db = getDatabase();
        const data = await db.getTargets();
        setTargets(data);
      } catch (error) {
        console.error('Failed to load targets:', error);
      }
    }

    loadTargets();

    // 清理
    return () => {
      closeDatabase();
    };
  }, []);

  return (
    <div>
      <h1>Targets ({targets.length})</h1>
      <ul>
        {targets.map((target: any) => (
          <li key={target.id}>
            {target.name} - {target.url}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ==================== 示例 6: 错误处理 ====================

async function example6() {
  try {
    await initDatabase();
    const db = getDatabase();

    // 检查数据库连接
    const healthy = await db.healthCheck();
    if (!healthy) {
      throw new Error('Database connection failed');
    }

    // 执行操作
    const targets = await db.getTargets();

  } catch (error) {
    if (error instanceof Error) {
      console.error('Database error:', error.message);

      // 显示用户友好的错误信息
      if (error.message.includes('Database not initialized')) {
        alert('数据库未初始化，请先配置数据库');
      } else if (error.message.includes('connection')) {
        alert('无法连接到数据库服务器，请检查网络和配置');
      } else {
        alert('数据库操作失败：' + error.message);
      }
    }
  }
}

// ==================== 示例 7: 切换数据库 ====================

async function example7() {
  // 场景：桌面应用，默认使用 SQLite
  // 但用户可以选择使用远程 MySQL

  // 1. 读取用户配置
  const userConfig = {
    database: {
      type: 'mysql', // 用户选择了 MySQL
      host: 'remote-server.com',
      port: 3306,
      database: 'holehunter',
      user: 'remote_user',
      password: 'secure_password',
    },
  };

  // 2. 创建 MySQL 适配器
  const db = await DatabaseFactory.createMySQL(
    userConfig.database.host,
    userConfig.database.port,
    userConfig.database.database,
    userConfig.database.user,
    userConfig.database.password
  );

  // 3. 使用数据库（API 完全相同）
  const targets = await db.getTargets();
  console.log('Remote targets:', targets);

  // 4. 完成，关闭连接
  db.close();
}

export {
  example1,
  example2,
  example3,
  example4,
  example5,
  example6,
  example7,
};
