/**
 * API 类型测试
 * 验证前端类型定义是否正确
 */

import { describe, it, expect } from 'vitest';
import { models } from '@wailsjs/go/models';

describe('API 类型定义测试', () => {
  it('TemplateFilter 类型可以被实例化和设置', () => {
    const filter = new models.TemplateFilter();
    filter.category = 'all';
    filter.search = '';
    filter.severity = 'all';
    filter.author = '';

    expect(filter.category).toBe('all');
    expect(filter.search).toBe('');
    expect(filter.severity).toBe('all');
    expect(filter.author).toBe('');
  });

  it('TemplateFilter 具有可设置的属性', () => {
    const filter = new models.TemplateFilter();

    // 设置属性后验证
    filter.category = 'xss';
    filter.search = 'test';
    filter.severity = 'high';
    filter.author = 'researcher';

    expect(filter.category).toBe('xss');
    expect(filter.search).toBe('test');
    expect(filter.severity).toBe('high');
    expect(filter.author).toBe('researcher');
  });
});
