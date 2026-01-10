/**
 * Electron 主进程入口
 */

import { app } from 'electron';
import { WindowManager } from './window/WindowManager';
import { IPCHandlers } from './ipc/handlers';
import { DatabaseManager } from './database/DatabaseManager';
import { BackendService } from './backend/BackendService';

class Application {
  private windowManager: WindowManager;
  private ipcHandlers: IPCHandlers;
  private databaseManager: DatabaseManager;
  private backendService: BackendService;

  constructor() {
    this.windowManager = new WindowManager();
    this.databaseManager = DatabaseManager.getInstance();
    this.backendService = BackendService.getInstance();
    // 传递依赖给 IPC 处理器
    this.ipcHandlers = new IPCHandlers(this.databaseManager, undefined, this.backendService);
  }

  async initialize() {
    console.log('[App] Initializing HoleHunter application...');

    // 注册应用事件
    this.registerAppEvents();

    // 当 Electron 准备好时初始化并创建窗口
    app.whenReady().then(async () => {
      console.log('[App] Electron app is ready');

      // 1. 先初始化数据库
      try {
        await this.databaseManager.initialize();
        console.log('[App] Database initialized successfully');
      } catch (error) {
        console.error('[App] Failed to initialize database:', error);
      }

      // 2. 启动后端服务
      try {
        await this.backendService.start();
        console.log('[App] Backend service started successfully');
      } catch (error) {
        console.error('[App] Failed to start backend service:', error);
        // 后端启动失败不应该阻止应用启动
        // 用户可以在设置中手动配置或重试
      }

      // 3. 创建窗口
      this.windowManager.createMainWindow();
      console.log('[App] Main window created');
    });
  }

  private registerAppEvents() {
    // 所有窗口关闭时
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // macOS 点击 dock 图标时重新创建窗口
    app.on('activate', () => {
      if (!this.windowManager.getMainWindow()) {
        this.windowManager.createMainWindow();
      }
    });

    // 应用退出前清理
    app.on('before-quit', async () => {
      this.ipcHandlers.dispose();
      await this.databaseManager.close();
      await this.backendService.stop();
    });

    // 处理未捕获的异常
    process.on('uncaughtException' as any, (error: Error) => {
      console.error('Uncaught Exception:', error);
    });

    process.on('unhandledRejection' as any, (reason: unknown, promise: unknown) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }
}

// 创建应用实例并初始化
const application = new Application();
application.initialize().catch((error) => {
  console.error('Failed to initialize application:', error);
  app.quit();
});
