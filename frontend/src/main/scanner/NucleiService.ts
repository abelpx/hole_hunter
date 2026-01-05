/**
 * Nuclei 扫描引擎服务
 * 封装 Nuclei CLI 的调用和管理
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

// 扫描配置
export interface NucleiConfig {
  // 目标
  targets: string[];
  targetFile?: string;

  // 模板
  templates?: string[];
  templatesPath?: string;
  severity?: string[];
  tags?: string[];
  excludeTags?: string[];

  // 扫描选项
  rateLimit?: number;
  concurrency?: number;
  timeout?: number;
  retries?: number;

  // 输出
  output?: string;
  jsonOutput?: string;

  // 其他选项
  headers?: string[];
  skipDeps?: boolean;
  updateTemplates?: boolean;
}

// 扫描状态
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// 扫描进度
export interface ScanProgress {
  scanId: number;
  status: ScanStatus;
  progress: number;
  currentTemplate?: string;
  totalTemplates: number;
  completedTemplates: number;
  findings: number;
  startTime: string;
  endTime?: string;
  error?: string;
}

// Nuclei 输出（JSON 格式）
export interface NucleiOutput {
  template: string;
  templateID: string;
  info: {
    name: string;
    author: string[];
    severity: string;
    description?: string;
    reference?: string[];
    tags: string[];
  };
  type: string;
  host: string;
  port?: string;
  url: string;
  matched_at: string;
  extracted_results?: string[];
  request?: string;
  response?: string;
  cve?: string[];
  cvss?: number;
  timestamp: string;
}

// 扫描事件
export interface ScanEvents {
  start: (scanId: number) => void;
  progress: (progress: ScanProgress) => void;
  finding: (scanId: number, finding: NucleiOutput) => void;
  complete: (scanId: number, result: ScanProgress) => void;
  error: (scanId: number, error: string) => void;
}

export class NucleiService extends EventEmitter {
  private static instance: NucleiService;
  private scans: Map<number, ChildProcess> = new Map();
  private nucleiPath: string;

  private constructor() {
    super();
    // Nuclei 可执行文件路径
    this.nucleiPath = this.findNucleiExecutable();
  }

  static getInstance(): NucleiService {
    if (!NucleiService.instance) {
      NucleiService.instance = new NucleiService();
    }
    return NucleiService.instance;
  }

  /**
   * 查找 Nuclei 可执行文件
   */
  private findNucleiExecutable(): string {
    const possiblePaths = [
      // 开发环境路径
      path.join(__dirname, '../../../bin/nuclei'),
      path.join(__dirname, '../../../bin/nuclei.exe'),
      // 生产环境路径
      path.join(process.resourcesPath, 'bin/nuclei'),
      path.join(process.resourcesPath, 'bin/nuclei.exe'),
      // 系统路径
      'nuclei',
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // 默认返回 nuclei，假设在 PATH 中
    return 'nuclei';
  }

  /**
   * 检查 Nuclei 是否可用
   */
  async checkAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn(this.nucleiPath, ['-version'], {
        stdio: 'pipe',
      });

      process.on('error', () => resolve(false));
      process.on('close', (code) => resolve(code === 0));
    });
  }

  /**
   * 获取 Nuclei 版本
   */
  async getVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.nucleiPath, ['-version'], {
        stdio: 'pipe',
      });

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error('Failed to get Nuclei version'));
        }
      });

      process.on('error', reject);
    });
  }

  /**
   * 更新模板
   */
  async updateTemplates(): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.nucleiPath, ['-silent', '-update-templates'], {
        stdio: 'pipe',
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Failed to update templates'));
        }
      });

      process.on('error', reject);
    });
  }

  /**
   * 构建命令行参数
   */
  private buildArgs(config: NucleiConfig): string[] {
    const args: string[] = [];

    // 目标
    if (config.targetFile) {
      args.push('-list', config.targetFile);
    } else if (config.targets.length > 0) {
      args.push('-u', ...config.targets);
    }

    // 模板
    if (config.templates && config.templates.length > 0) {
      args.push('-templates', ...config.templates);
    } else if (config.templatesPath) {
      args.push('-templates', config.templatesPath);
    } else {
      // 使用默认模板
      args.push('-templates', '');
    }

    // 严重性
    if (config.severity && config.severity.length > 0) {
      args.push('-severity', config.severity.join(','));
    }

    // 标签
    if (config.tags && config.tags.length > 0) {
      args.push('-tags', config.tags.join(','));
    }

    // 排除标签
    if (config.excludeTags && config.excludeTags.length > 0) {
      args.push('-exclude-tags', config.excludeTags.join(','));
    }

    // 扫描选项
    if (config.rateLimit) {
      args.push('-rate-limit', config.rateLimit.toString());
    }

    if (config.concurrency) {
      args.push('-c', config.concurrency.toString());
    }

    if (config.timeout) {
      args.push('-timeout', config.timeout.toString());
    }

    if (config.retries) {
      args.push('-retries', config.retries.toString());
    }

    // 输出
    if (config.jsonOutput) {
      args.push('-json', '-o', config.jsonOutput);
    }

    // 自定义头
    if (config.headers && config.headers.length > 0) {
      config.headers.forEach((header) => {
        args.push('-header', header);
      });
    }

    // 跳过依赖检查
    if (config.skipDeps) {
      args.push('-skip-deps');
    }

    // 静默模式（减少输出）
    args.push('-silent');
    args.push('-no-color');

    return args;
  }

  /**
   * 执行扫描
   */
  async startScan(scanId: number, config: NucleiConfig): Promise<void> {
    if (this.scans.has(scanId)) {
      throw new Error(`Scan ${scanId} is already running`);
    }

    const args = this.buildArgs(config);
    console.log(`Starting scan ${scanId} with args:`, args.join(' '));

    const process = spawn(this.nucleiPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.scans.set(scanId, process);

    let findings = 0;
    let currentTemplate = '';
    let totalTemplates = 0;
    let completedTemplates = 0;

    // 处理标准输出（JSON 格式的漏洞结果）
    process.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);

      lines.forEach((line) => {
        try {
          const finding: NucleiOutput = JSON.parse(line);
          findings++;
          currentTemplate = finding.templateID;
          completedTemplates++;

          // 发出漏洞发现事件
          this.emit('finding', scanId, finding);

          // 更新进度
          this.emit('progress', {
            scanId,
            status: 'running',
            progress: totalTemplates > 0 ? (completedTemplates / totalTemplates) * 100 : 0,
            currentTemplate,
            totalTemplates,
            completedTemplates,
            findings,
            startTime: new Date().toISOString(),
          } as ScanProgress);
        } catch (error) {
          console.error('Failed to parse Nuclei output:', error);
        }
      });
    });

    // 处理标准错误（进度和状态信息）
    process.stderr.on('data', (data) => {
      const output = data.toString();
      console.log(`Nuclei stderr [${scanId}]:`, output);

      // 解析进度信息（需要根据实际 Nuclei 输出调整）
      const progressMatch = output.match(/(\d+)\/(\d+)/);
      if (progressMatch) {
        completedTemplates = parseInt(progressMatch[1], 10);
        totalTemplates = parseInt(progressMatch[2], 10);

        this.emit('progress', {
          scanId,
          status: 'running',
          progress: (completedTemplates / totalTemplates) * 100,
          currentTemplate,
          totalTemplates,
          completedTemplates,
          findings,
          startTime: new Date().toISOString(),
        } as ScanProgress);
      }
    });

    // 处理进程退出
    process.on('close', (code) => {
      this.scans.delete(scanId);

      const result: ScanProgress = {
        scanId,
        status: code === 0 ? 'completed' : 'failed',
        progress: 100,
        currentTemplate,
        totalTemplates,
        completedTemplates,
        findings,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      };

      if (code === 0) {
        this.emit('complete', scanId, result);
      } else if (code === null || code === 130) {
        // 用户取消
        result.status = 'cancelled';
        this.emit('complete', scanId, result);
      } else {
        result.error = `Scan failed with exit code ${code}`;
        this.emit('error', scanId, result.error);
      }
    });

    // 处理错误
    process.on('error', (error) => {
      this.scans.delete(scanId);
      this.emit('error', scanId, error.message);
    });

    // 发出开始事件
    this.emit('start', scanId);
  }

  /**
   * 取消扫描
   */
  cancelScan(scanId: number): boolean {
    const process = this.scans.get(scanId);
    if (process) {
      process.kill('SIGTERM');
      return true;
    }
    return false;
  }

  /**
   * 强制终止扫描
   */
  killScan(scanId: number): boolean {
    const process = this.scans.get(scanId);
    if (process) {
      process.kill('SIGKILL');
      return true;
    }
    return false;
  }

  /**
   * 获取运行中的扫描列表
   */
  getRunningScans(): number[] {
    return Array.from(this.scans.keys());
  }

  /**
   * 检查扫描是否正在运行
   */
  isScanRunning(scanId: number): boolean {
    return this.scans.has(scanId);
  }
}
