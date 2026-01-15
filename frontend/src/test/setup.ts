import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// 扩展 Vitest 的 expect 断言
expect.extend(matchers);

// 每个测试后清理
afterEach(() => {
  cleanup();
});

// Mock Wails runtime
global.window = global.window || {};
global.window.wails = {
  EventsOn: () => {},
  EventsOff: () => {},
  EventsEmit: () => {},
};

// Mock Wails Go bindings
import { vi } from 'vitest';

vi.mock('../renderer/wailsjs/go/main/App', () => ({
  GetEnvironment: () => 'browser',
  CheckDatabaseHealth: () => Promise.resolve({ healthy: true, type: 'sqlite' }),
}));
