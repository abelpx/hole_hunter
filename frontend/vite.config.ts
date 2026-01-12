import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react()
  ],
  base: './', // 使用相对路径，适配 Electron 的 loadFile
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      // 添加 wailsjs 路径别名
      '@wailsjs': path.resolve(__dirname, 'wailsjs/wailsjs')
    }
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) => {
        // 忽略动态 import 的警告
        if (warning.code === 'DYNAMIC_IMPORT_PREFIX_RESOLUTION') {
          return;
        }
        warn(warning);
      }
    }
  },
  // 开发服务器优化
  server: {
    port: 3000,
    strictPort: true,
    fs: {
      // 允许访问项目根目录和 wailsjs 目录
      allow: ['..', '.']
    }
  }
});
