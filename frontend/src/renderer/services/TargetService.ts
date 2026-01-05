/**
 * TargetService - 目标管理服务
 */

import { getDatabase, CreateTargetRequest, UpdateTargetRequest, Target } from './database/DatabaseService';

export class TargetService {
  private db = getDatabase();

  /**
   * 获取所有目标
   */
  getTargets(): Target[] {
    return this.db.getTargets();
  }

  /**
   * 获取单个目标
   */
  getTarget(id: number): Target | null {
    return this.db.getTarget(id);
  }

  /**
   * 创建目标
   */
  createTarget(data: CreateTargetRequest): Target {
    // 验证 URL
    if (!this.validateUrl(data.url)) {
      throw new Error('Invalid URL format');
    }

    // 检查是否已存在
    const existing = this.db.getTargets().find(t => t.url === data.url);
    if (existing) {
      throw new Error('Target with this URL already exists');
    }

    const id = this.db.createTarget(data);
    return this.db.getTarget(id)!;
  }

  /**
   * 更新目标
   */
  updateTarget(id: number, data: UpdateTargetRequest): Target {
    if (!this.db.getTarget(id)) {
      throw new Error('Target not found');
    }

    // 如果更新 URL，验证新 URL
    if (data.url && !this.validateUrl(data.url)) {
      throw new Error('Invalid URL format');
    }

    this.db.updateTarget(id, data);
    return this.db.getTarget(id)!;
  }

  /**
   * 删除目标
   */
  deleteTarget(id: number): void {
    if (!this.db.getTarget(id)) {
      throw new Error('Target not found');
    }

    this.db.deleteTarget(id);
  }

  /**
   * 验证 URL 格式
   */
  validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * 搜索目标
   */
  searchTargets(query: string): Target[] {
    const targets = this.db.getTargets();
    const lowerQuery = query.toLowerCase();

    return targets.filter(
      t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.url.toLowerCase().includes(lowerQuery) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

export default new TargetService();
