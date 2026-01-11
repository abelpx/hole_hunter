/**
 * 端口扫描服务
 * 通过调用 Go 可执行文件进行端口扫描，结果保存到数据库
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseManager } from '../database/DatabaseManager';

export interface PortScanOptions {
  target: string;
  ports?: number[];
  timeout?: number;
  batch_size?: number;
}

export interface PortScanResult {
  port: number;
  status: 'open' | 'closed' | 'filtered';
  service?: string;
  latency?: number;
}

export class PortScanService {
  private static instance: PortScanService;
  private toolPath: string;
  private db: DatabaseManager;

  private constructor() {
    this.toolPath = this.findToolExecutable();
    this.db = DatabaseManager.getInstance();
  }

  static getInstance(): PortScanService {
    if (!PortScanService.instance) {
      PortScanService.instance = new PortScanService();
    }
    return PortScanService.instance;
  }

  /**
   * 查找工具可执行文件
   */
  private findToolExecutable(): string {
    const isDev = process.env.NODE_ENV === 'development';
    const executableName = process.platform === 'win32' ? 'portscan.exe' : 'portscan';

    const possiblePaths = [];

    if (isDev) {
      // 开发环境：从项目根目录查找
      const projectRoot = path.join(__dirname, '../../..');
      possiblePaths.push(
        path.join(projectRoot, 'backend', 'bin', executableName),
        path.join(projectRoot, 'bin', executableName),
      );
    } else {
      // 生产环境：从 app.asar.unpacked 或 resources 目录查找
      possiblePaths.push(
        path.join(process.resourcesPath, 'bin', executableName),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', executableName)
      );
    }

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log(`[PortScanService] Tool found at: ${p}`);
        return p;
      }
    }

    console.warn(`[PortScanService] Tool executable not found, using fallback`);
    return executableName;
  }

  /**
   * 执行端口扫描并保存到数据库
   */
  async scanPorts(options: PortScanOptions): Promise<PortScanResult[]> {
    // 创建扫描任务
    const taskId = await this.db.createPortScanTask({
      target: options.target,
      ports: options.ports || await this.getCommonPorts(),
      timeout: options.timeout || 2000,
      batch_size: options.batch_size || 50,
    });

    await this.db.updatePortScanTask(taskId, {
      status: 'running',
      started_at: new Date().toISOString(),
    });

    try {
      // 执行扫描
      const results = await this.executeScan(options);

      // 保存结果到数据库
      await this.db.batchCreatePortScanResults(
        results.map(r => ({
          task_id: taskId,
          port: r.port,
          status: r.status,
          service: r.service,
          banner: r.service,
          latency: r.latency || 0,
        }))
      );

      // 更新任务状态
      await this.db.updatePortScanTask(taskId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      return results;
    } catch (error) {
      await this.db.updatePortScanTask(taskId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * 获取端口扫描任务
   */
  async getScanTask(taskId: number): Promise<any | null> {
    return await this.db.getPortScanTask(taskId);
  }

  /**
   * 获取所有端口扫描任务
   */
  async getAllScanTasks(): Promise<any[]> {
    return await this.db.getAllPortScanTasks();
  }

  /**
   * 获取端口扫描结果
   */
  async getScanResults(taskId: number): Promise<PortScanResult[]> {
    return await this.db.getPortScanResults(taskId);
  }

  /**
   * 执行实际的端口扫描
   */
  private executeScan(options: PortScanOptions): Promise<PortScanResult[]> {
    return new Promise((resolve, reject) => {
      const args = this.buildArgs(options);
      console.log(`[PortScanService] Starting scan with args:`, args.join(' '));

      const process = spawn(this.toolPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`[PortScanService] stderr:`, data.toString());
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result.data || result);
          } catch (e) {
            reject(new Error(`Failed to parse output: ${output}`));
          }
        } else {
          reject(new Error(`Scan failed with exit code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start scan process: ${error.message}`));
      });
    });
  }

  /**
   * 获取常见端口列表
   */
  async getCommonPorts(): Promise<number[]> {
    return [
      21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995,
      1723, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 8888, 9200, 27017
    ];
  }

  /**
   * 构建命令行参数
   */
  private buildArgs(options: PortScanOptions): string[] {
    const args: string[] = ['--cmd', 'scan'];

    // 目标
    args.push('--target', options.target);

    // 端口
    if (options.ports && options.ports.length > 0) {
      args.push('--ports', options.ports.join(','));
    }

    // 超时
    if (options.timeout) {
      args.push('--timeout', options.timeout.toString());
    }

    // 批处理大小
    if (options.batch_size) {
      args.push('--batch-size', options.batch_size.toString());
    }

    // 输出格式
    args.push('--json');

    return args;
  }
}
