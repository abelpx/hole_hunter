/**
 * 域名爆破服务
 * 通过调用 Go 可执行文件进行子域名枚举，结果保存到数据库
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseManager } from '../database/DatabaseManager';

export interface DomainBruteOptions {
  domain: string;
  wordlist?: string[];
  timeout?: number;
  batch_size?: number;
}

export interface SubdomainResult {
  subdomain: string;
  resolved: boolean;
  ips?: string[];
  latency?: number;
}

export class DomainBruteService {
  private static instance: DomainBruteService;
  private toolPath: string;
  private db: DatabaseManager;

  private constructor() {
    this.toolPath = this.findToolExecutable();
    this.db = DatabaseManager.getInstance();
  }

  static getInstance(): DomainBruteService {
    if (!DomainBruteService.instance) {
      DomainBruteService.instance = new DomainBruteService();
    }
    return DomainBruteService.instance;
  }

  /**
   * 查找工具可执行文件
   */
  private findToolExecutable(): string {
    const isDev = process.env.NODE_ENV === 'development';
    const executableName = process.platform === 'win32' ? 'domainbrute.exe' : 'domainbrute';

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
        console.log(`[DomainBruteService] Tool found at: ${p}`);
        return p;
      }
    }

    console.warn(`[DomainBruteService] Tool executable not found, using fallback`);
    return executableName;
  }

  /**
   * 执行域名爆破并保存到数据库
   */
  async bruteSubdomains(options: DomainBruteOptions): Promise<SubdomainResult[]> {
    // 创建爆破任务
    const taskId = await this.db.createDomainBruteTask({
      domain: options.domain,
      wordlist: options.wordlist || await this.getDefaultWordlist(),
      timeout: options.timeout || 2000,
      batch_size: options.batch_size || 50,
    });

    await this.db.updateDomainBruteTask(taskId, {
      status: 'running',
      started_at: new Date().toISOString(),
    });

    try {
      // 执行爆破
      const results = await this.executeBrute(options);

      // 保存结果到数据库
      await this.db.batchCreateDomainBruteResults(
        results.map(r => ({
          task_id: taskId,
          subdomain: r.subdomain,
          resolved: r.resolved,
          ips: r.ips || [],
          latency: r.latency || 0,
        }))
      );

      // 更新任务状态
      await this.db.updateDomainBruteTask(taskId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      return results;
    } catch (error) {
      await this.db.updateDomainBruteTask(taskId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * 获取域名爆破任务
   */
  async getBruteTask(taskId: number): Promise<any | null> {
    return await this.db.getDomainBruteTask(taskId);
  }

  /**
   * 获取所有域名爆破任务
   */
  async getAllBruteTasks(): Promise<any[]> {
    return await this.db.getAllDomainBruteTasks();
  }

  /**
   * 获取域名爆破结果
   */
  async getBruteResults(taskId: number): Promise<SubdomainResult[]> {
    return await this.db.getDomainBruteResults(taskId);
  }

  /**
   * 执行实际的域名爆破
   */
  private executeBrute(options: DomainBruteOptions): Promise<SubdomainResult[]> {
    return new Promise((resolve, reject) => {
      const args = this.buildArgs(options);
      console.log(`[DomainBruteService] Starting brute force with args:`, args.join(' '));

      const process = spawn(this.toolPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 发送字典到 stdin
      if (options.wordlist && options.wordlist.length > 0) {
        process.stdin.write(options.wordlist.join('\n'));
        process.stdin.end();
      } else {
        process.stdin.end();
      }

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`[DomainBruteService] stderr:`, data.toString());
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
          reject(new Error(`Brute force failed with exit code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start brute force process: ${error.message}`));
      });
    });
  }

  /**
   * 获取默认字典
   */
  async getDefaultWordlist(): Promise<string[]> {
    return [
      'www', 'mail', 'ftp', 'admin', 'api', 'dev', 'staging', 'test', 'blog',
      'shop', 'portal', 'app', 'mobile', 'cdn', 'static', 'assets', 'img', 'images',
      'ns', 'ns1', 'ns2', 'mx', 'smtp', 'pop', 'imap', 'webmail', 'email',
      'secure', 'vpn', 'remote', 'ssh', 'cpanel', 'whm', 'webdisk', 'soap',
      'api', 'v1', 'v2', 'v3', 'stage', 'production', 'prod', 'pre', 'preview',
      'demo', 'beta', 'alpha', 'uat', 'qa', 'sandbox', 'dev1', 'dev2'
    ];
  }

  /**
   * 查询 DNS 记录并保存到数据库
   */
  async getDNSRecords(domain: string, type: 'mx' | 'ns' | 'txt'): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const args = ['--cmd', 'records', '--domain', domain, '--type', type, '--json'];

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
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            const records = result.data || result;

            // 保存到数据库
            this.db.createDNSRecord({
              domain,
              type,
              records,
            }).catch(err => console.error('Failed to save DNS records:', err));

            resolve(records);
          } catch (e) {
            reject(new Error(`Failed to parse output: ${output}`));
          }
        } else {
          reject(new Error(`DNS query failed with exit code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start DNS query process: ${error.message}`));
      });
    });
  }

  /**
   * 构建命令行参数
   */
  private buildArgs(options: DomainBruteOptions): string[] {
    const args: string[] = ['--cmd', 'brute'];

    // 域名
    args.push('--domain', options.domain);

    // 字典（通过 stdin 传递，这里标记使用 stdin）
    if (options.wordlist && options.wordlist.length > 0) {
      args.push('--use-stdin');
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
