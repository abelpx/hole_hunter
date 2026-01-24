import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './renderer/App'
import './renderer/styles/index.css'

// 导入 Wails 运行时（确保在 Wails 环境中正确加载）
// 注意：这不会在浏览器中加载，因为 Wails 运行时只在 WebView2 中存在

// 设置日志拦截，将日志发送到 Go 后端以便调试
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// 检查是否在 Wails 环境中
// 需要等待 Wails 注入完成
const isWails = (window as any).go !== undefined;

// 打印调试信息
console.log('[main] Environment check:', {
  hasWindowGo: typeof (window as any).go !== 'undefined',
  hasWindowRuntime: typeof (window as any).runtime !== 'undefined',
  location: window.location.href,
  userAgent: navigator.userAgent
});

if (isWails) {
  try {
    const LogFromFrontend = (window as any).go?.main?.App?.LogFromFrontend;

    if (LogFromFrontend) {
      console.log = (...args: any[]) => {
        originalConsoleLog(...args);
        const message = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        LogFromFrontend('debug', message);
      };

      console.error = (...args: any[]) => {
        originalConsoleError(...args);
        const message = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        LogFromFrontend('error', message);
      };

      console.warn = (...args: any[]) => {
        originalConsoleWarn(...args);
        const message = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        LogFromFrontend('warn', message);
      };

      // 记录环境信息
      console.log('[main] Wails environment detected, log interceptor installed');
      console.log('[main] window.go keys:', Object.keys((window as any).go || {}));
    }
  } catch (e) {
    originalConsoleError('Failed to setup log interceptor:', e);
  }
} else {
  originalConsoleLog('[main] Running in browser mode, no log interceptor');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
