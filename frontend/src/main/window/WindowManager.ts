/**
 * 窗口管理器
 */

import { BrowserWindow, screen } from 'electron';
import path from 'path';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  createMainWindow(): BrowserWindow {
    console.log('[WindowManager] Creating main window...');

    // 获取屏幕尺寸
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // 计算 preload 路径
    // __dirname 在构建后指向 dist/main/
    const preloadPath = path.join(__dirname, '..', 'preload', 'index.js');
    console.log('[WindowManager] Preload path:', preloadPath);

    // 创建窗口
    this.mainWindow = new BrowserWindow({
      width: Math.min(1400, width - 100),
      height: Math.min(900, height - 100),
      backgroundColor: '#0F172A',
      show: false, // 延迟显示，等窗口准备好
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        // 安全配置
        sandbox: true,
        webSecurity: true,
      },
    });

    // 窗口事件
    this.mainWindow.once('ready-to-show', () => {
      console.log('[WindowManager] Window ready to show');
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      console.log('[WindowManager] Window closed');
      this.mainWindow = null;
    });

    // 添加错误处理
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[WindowManager] Failed to load page:', errorCode, errorDescription);
    });

    // 监听 preload 脚本加载
    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('[WindowManager] Page loaded successfully');
    });

    // 加载页面
    // 注意：开发模式下也使用构建后的文件，以便加载 preload 脚本
    // 如果需要热重载，请使用 vite 的 HMR 功能配合构建后的文件
    if (process.env.NODE_ENV === 'development' && process.env.VITE_DEV === 'true') {
      // 只有在明确设置 VITE_DEV=true 时才使用 Vite 开发服务器
      // 这种模式下 preload 脚本不会加载
      console.log('[WindowManager] Loading from Vite dev server (preload will NOT work)');
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      // 默认使用构建后的文件（包含 preload 脚本）
      const htmlPath = path.join(__dirname, '..', 'index.html');
      console.log('[WindowManager] Loading from dist:', htmlPath);
      this.mainWindow.loadFile(htmlPath);
      if (process.env.NODE_ENV === 'development') {
        this.mainWindow.webContents.openDevTools();
      }
    }

    return this.mainWindow;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  focusMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();
    }
  }

  closeMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }

  minimizeMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.minimize();
    }
  }

  maximizeMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    }
  }

  sendToMainWindow(channel: string, ...args: any[]): void {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }
}
