/**
 * API 类型测试
 * 验证前端类型定义是否正确
 */

import { describe, it, expect } from 'vitest';
import { models } from '@wailsjs/go/models';

describe('API 类型定义测试', () => {
  it('TemplateFilterUnified 类型可以被实例化和设置', () => {
    const filter = new models.TemplateFilterUnified();

    // 设置属性后验证
    filter.category = 'xss';
    filter.search = 'test';
    filter.severity = 'high';

    expect(filter.category).toBe('xss');
    expect(filter.search).toBe('test');
    expect(filter.severity).toBe('high');
  });
});
