/**
 * NucleiService - 扫描引擎 CLI 集成服务（一期桌面版）
 *
 * 使用 node:child_process 调用扫描引擎 CLI，实时解析 JSON 输出
 */

import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'events';

export interface NucleiOptions {
  /** 目标 URL */
  target: string;
  /** 模板列表（路径或分类） */
  templates: string[];
  /** 请求速率限制（req/s）*/
  rateLimit?: number;
  /** 超时时间（秒）*/
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 并发数 */
  concurrency?: number;
}

export interface NucleiResult {
  /** 模板 ID */
  template: string;
  /** 漏洞类型 */
  type: string;
  /** 匹配位置 */
  matched_at: string;
  /** 严重程度 */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  /** 漏洞名称 */
  info?: {
    name: string;
    description?: string;
    reference?: string[];
    tags?: string[];
  };
  /** HTTP 请求 */
  request: string;
  /** HTTP 响应 */
  response: string;
  /** 响应头 */
  response_headers?: Record<string, string>;
  /** 状态码 */
  status_code?: number;
  /** CVE 编号 */
  cve?: string[];
  /** CVSS 评分 */
  cvss?: number;
  /** 提取的数据 */
  extracted_results?: string[];
  /** 匹配的时间 */
  timestamp?: string;
}

export interface ScanProgress {
  /** 执行的模板数 */
  executed: number;
  /** 总模板数 */
  total: number;
  /** 当前模板 */
  currentTemplate: string;
  /** 进度百分比 */
  progress: number;
}

/**
 * 扫描引擎服务类
 *
 * @example
 * ```typescript
 * const nuclei = new NucleiService();
 *
 * nuclei.on('result', (result) => {
 *   console.log('Found vulnerability:', result.info?.name);
 * });
 *
 * nuclei.on('progress', (progress) => {
 *   console.log(`Progress: ${progress.progress}%`);
 * });
 *
 * await nuclei.scan({
 *   target: 'https://example.com',
 *   templates: ['cves', 'exposures'],
 *   rateLimit: 150,
 * });
 * ```
 */
export class NucleiService extends EventEmitter {
  private process: ChildProcess | null = null;
  private isScanning = false;
  private results: NucleiResult[] = [];

  constructor() {
    super();
  }

  /**
   * 执行扫描
   */
  async scan(options: NucleiOptions): Promise<NucleiResult[]> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    this.isScanning = true;
    this.results = [];

    return new Promise((resolve, reject) => {
      try {
        // 构建扫描引擎命令参数
        const args = this.buildArgs(options);

        console.log('Starting Nuclei with args:', args);

        // 启动扫描引擎进程
        this.process = spawn('nuclei', args, {
          env: { ...process.env },
        });

        let stdoutBuffer = '';

        // 处理标准输出（JSON 格式的结果）
        this.process.stdout?.on('data', (data) => {
          stdoutBuffer += data.toString();
          const lines = stdoutBuffer.split('\n');
          stdoutBuffer = lines.pop() || ''; // 保留最后一个不完整的行

          for (const line of lines) {
            if (line.trim()) {
              try {
                const result = JSON.parse(line) as NucleiResult;
                this.results.push(result);

                // 触发 result 事件
                this.emit('result', result);

                // 触发进度更新
                this.emit('progress', {
                  executed: this.results.length,
                  total: this.results.length,
                  currentTemplate: result.template,
                  progress: 0, // Nuclei 不提供总模板数，需要其他方式计算
                });
              } catch (err) {
                console.error('Failed to parse Nuclei output:', err);
                console.error('Raw output:', line);
              }
            }
          }
        });

        // 处理错误输出
        this.process.stderr?.on('data', (data) => {
          const message = data.toString().trim();
          console.error('Nuclei stderr:', message);

          // 触发错误事件
          this.emit('error', message);
        });

        // 处理进程退出
        this.process.on('close', (code) => {
          this.isScanning = false;
          this.process = null;

          if (code === 0 || code === null) {
            console.log(`Nuclei scan completed. Found ${this.results.length} vulnerabilities.`);
            resolve(this.results);
          } else {
            reject(new Error(`Nuclei exited with code ${code}`));
          }
        });

        // 处理进程错误
        this.process.on('error', (err) => {
          this.isScanning = false;
          this.process = null;
          reject(new Error(`Failed to start Nuclei: ${err.message}`));
        });

      } catch (error) {
        this.isScanning = false;
        this.process = null;
        reject(error);
      }
    });
  }

  /**
   * 取消扫描
   */
  cancel(): void {
    if (this.process) {
      console.log('Cancelling Nuclei scan...');
      this.process.kill('SIGTERM');

      // 如果进程在 5 秒后仍未退出，强制杀死
      setTimeout(() => {
        if (this.process) {
          console.log('Force killing Nuclei process...');
          this.process.kill('SIGKILL');
        }
      }, 5000);

      this.isScanning = false;
      this.process = null;
    }
  }

  /**
   * 检查是否正在扫描
   */
  isActive(): boolean {
    return this.isScanning;
  }

  /**
   * 获取已收集的结果
   */
  getResults(): NucleiResult[] {
    return [...this.results];
  }

  /**
   * 构建扫描引擎命令参数
   */
  private buildArgs(options: NucleiOptions): string[] {
    const args: string[] = [];

    // 目标
    args.push('-u', options.target);

    // 模板
    if (options.templates.length > 0) {
      args.push('-t', options.templates.join(','));
    }

    // 输出格式
    args.push('-json');

    // 静默模式（减少输出）
    args.push('-silent');

    // 不发送更新统计
    args.push('-no-color');

    // 请求速率限制
    if (options.rateLimit) {
      args.push('-rate', String(options.rateLimit));
    }

    // 超时时间
    if (options.timeout) {
      args.push('-timeout', String(options.timeout));
    }

    // 重试次数
    if (options.retries !== undefined) {
      args.push('-retries', String(options.retries));
    }

    // 并发数
    if (options.concurrency) {
      args.push('-c', String(options.concurrency));
    }

    return args;
  }

  /**
   * 检查扫描引擎是否已安装
   */
  static async checkInstallation(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('nuclei', ['-version'], { stdio: 'ignore' });

      process.on('close', (code) => {
        resolve(code === 0);
      });

      process.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * 获取扫描引擎版本
   */
  static async getVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('nuclei', ['-version']);

      let output = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          const match = output.match(/Version:\s*(\d+\.\d+\.\d+)/);
          resolve(match ? match[1] : 'unknown');
        } else {
          reject(new Error('Failed to get Nuclei version'));
        }
      });

      process.on('error', () => {
        reject(new Error('Nuclei is not installed'));
      });
    });
  }

  /**
   * 更新扫描模板
   */
  static async updateTemplates(): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('nuclei', ['-update-templates']);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to update templates (exit code: ${code})`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to start template update: ${err.message}`));
      });
    });
  }

  /**
   * 获取可用的模板分类
   */
  static async getTemplateCategories(): Promise<string[]> {
    // 这里可以扫描模板目录获取分类
    // 暂时返回硬编码的常用分类
    return [
      'cves',
      'vulnerabilities',
      'exposed-panels',
      'technologies',
      'misconfiguration',
      'exposures',
      'iot',
      'network',
      'takeovers',
      'workflows',
    ];
  }

  /**
   * 获取模板统计信息
   */
  static async getTemplateStats(): Promise<{ total: number; byCategory: Record<string, number> }> {
    // 这里需要实际扫描模板目录
    // 暂时返回模拟数据
    return {
      total: 6000,
      byCategory: {
        cves: 2500,
        vulnerabilities: 800,
        'exposed-panels': 600,
        technologies: 1200,
        misconfiguration: 400,
        exposures: 300,
        iot: 100,
        network: 100,
      },
    };
  }
}

export default NucleiService;
