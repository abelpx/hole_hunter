/**
 * 后端服务管理器
 * 负责启动和管理内嵌的 Go 后端服务
 */

import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export class BackendService {
  private static instance: BackendService;
  private backendProcess: ChildProcess | null = null;
  private backendPort: string;
  private isRunning: boolean = false;

  private constructor() {
    // 使用动态端口，避免占用宿主机端口
    this.backendPort = this.getAvailablePort();
  }

  static getInstance(): BackendService {
    if (!BackendService.instance) {
      BackendService.instance = new BackendService();
    }
    return BackendService.instance;
  }

  /**
   * 获取后端服务 URL
   */
  getBackendURL(): string {
    return `http://127.0.0.1:${this.backendPort}`;
  }

  /**
   * 获取后端端口
   */
  getBackendPort(): string {
    return this.backendPort;
  }

  /**
   * 启动后端服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[BackendService] Backend service is already running');
      return;
    }

    const startTime = Date.now();
    console.log('[BackendService] Starting backend service...');

    try {
      // 获取后端可执行文件路径
      const backendPath = this.getBackendExecutablePath();
      console.log('[BackendService] Backend path:', backendPath);

      // 检查后端文件是否存在
      if (!fs.existsSync(backendPath)) {
        throw new Error(`Backend executable not found: ${backendPath}`);
      }

      // 设置环境变量
      const dbPath = path.join(app.getPath('userData'), 'data', 'holehunter.db');
      const env = {
        ...process.env,
        SERVER_PORT: this.backendPort,
        DATABASE_PATH: dbPath,
      };

      console.log('[BackendService] Environment:', {
        SERVER_PORT: this.backendPort,
        DATABASE_PATH: dbPath,
        NODE_ENV: process.env.NODE_ENV,
      });

      // 启动后端进程
      this.backendProcess = spawn(backendPath, [], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      console.log('[BackendService] Backend process spawned, PID:', this.backendProcess.pid);

      // 监听后端输出
      if (this.backendProcess.stdout) {
        this.backendProcess.stdout.on('data', (data) => {
          console.log(`[Backend] ${data.toString().trim()}`);
        });
      }

      if (this.backendProcess.stderr) {
        this.backendProcess.stderr.on('data', (data) => {
          console.error(`[Backend Error] ${data.toString().trim()}`);
        });
      }

      // 监听进程退出
      this.backendProcess.on('error', (error) => {
        console.error('[BackendService] Backend process error:', error);
        this.isRunning = false;
      });

      this.backendProcess.on('exit', (code, signal) => {
        console.log(`[BackendService] Backend process exited with code ${code}, signal ${signal}`);
        this.isRunning = false;
      });

      // 等待后端服务启动
      console.log('[BackendService] Waiting for backend to be ready...');
      await this.waitForBackendReady();

      this.isRunning = true;
      const elapsed = Date.now() - startTime;
      console.log(`[BackendService] ✓ Backend service started on port ${this.backendPort} in ${elapsed}ms`);
    } catch (error) {
      console.error('[BackendService] ✗ Failed to start backend service:', error);
      throw error;
    }
  }

  /**
   * 停止后端服务
   */
  async stop(): Promise<void> {
    if (!this.backendProcess || !this.isRunning) {
      return;
    }

    console.log('Stopping backend service...');

    return new Promise((resolve) => {
      if (this.backendProcess) {
        // 尝试优雅关闭
        this.backendProcess.on('exit', () => {
          this.backendProcess = null;
          this.isRunning = false;
          console.log('Backend service stopped');
          resolve();
        });

        // 发送 SIGTERM 信号
        this.backendProcess.kill('SIGTERM');

        // 5秒后强制关闭
        setTimeout(() => {
          if (this.backendProcess) {
            this.backendProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      } else {
        resolve();
      }
    });
  }

  /**
   * 重启后端服务
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * 检查后端服务是否运行中
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * 获取后端可执行文件路径
   */
  private getBackendExecutablePath(): string {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // 开发环境：使用项目根目录的 backend/bin/server
      // __dirname 在编译后指向 dist/main/，所以需要向上三级到达项目根目录
      const projectRoot = path.join(__dirname, '../../..');
      const backendBinPath = path.join(projectRoot, 'backend', 'bin');

      if (process.platform === 'win32') {
        return path.join(backendBinPath, 'server.exe');
      }
      return path.join(backendBinPath, 'server');
    } else {
      // 生产环境：使用打包在 app.asar.unpacked 中的后端文件
      // electron-builder 将 asarUnpack 中的文件解压到 app.asar.unpacked 目录
      const ext = process.platform === 'win32' ? '.exe' : '';
      // 后端文件位于 app.asar.unpacked/build/backend/server
      return path.join(process.resourcesPath, 'app.asar.unpacked', 'build', 'backend', `server${ext}`);
    }
  }

  /**
   * 等待后端服务就绪
   */
  private async waitForBackendReady(maxRetries = 30): Promise<void> {
    const healthCheckURL = `${this.getBackendURL()}/api/v1/health`;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(healthCheckURL);
        if (response.ok) {
          console.log('Backend service is ready');
          return;
        }
      } catch (error) {
        // 后端尚未就绪，继续等待
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    throw new Error('Backend service failed to start within timeout');
  }

  /**
   * 获取可用端口
   */
  private getAvailablePort(): string {
    // 在开发环境使用固定端口，生产环境使用随机端口
    if (process.env.NODE_ENV === 'development') {
      return '18080';
    }

    // 生成 10000-20000 之间的随机端口
    return Math.floor(Math.random() * 10000 + 10000).toString();
  }

  /**
   * 发送 GET 请求到后端 API
   */
  async get(endpoint: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = `${this.getBackendURL()}${endpoint}`;
      const urlObj = new URL(url);

      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = (urlObj.protocol === 'https:' ? https : http).request(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  /**
   * 发送 POST 请求到后端 API
   */
  async post(endpoint: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = `${this.getBackendURL()}${endpoint}`;
      const urlObj = new URL(url);
      const postData = JSON.stringify(data);

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = (urlObj.protocol === 'https:' ? https : http).request(url, options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(responseData));
            } catch (e) {
              resolve(responseData);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }
}
