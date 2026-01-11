/**
 * 暴力破解服务
 * 使用 SQLite 直接存储
 */

import { DatabaseManager } from '../database/DatabaseManager';

export interface BruteTask {
  id: number;
  name: string;
  request_id: number;
  type: string;
  status: string;
  total_payloads: number;
  sent_payloads: number;
  success_count: number;
  failure_count: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BrutePayloadSet {
  id: number;
  name: string;
  type: string;
  config: Record<string, any>;
  created_at: string;
}

export interface BruteResult {
  id: number;
  task_id: number;
  param_name: string;
  payload: string;
  status: string;
  status_code?: number;
  response_length?: number;
  response_time: number;
  body?: string;
  error?: string;
  created_at: string;
}

export class BruteService {
  private static instance: BruteService;
  private db: DatabaseManager;
  private activeTasks: Map<number, any> = new Map();

  private constructor() {
    this.db = DatabaseManager.getInstance();
  }

  static getInstance(): BruteService {
    if (!BruteService.instance) {
      BruteService.instance = new BruteService();
    }
    return BruteService.instance;
  }

  // 获取所有暴力破解任务
  async getAllBruteTasks(): Promise<BruteTask[]> {
    return await this.db.getAllBruteTasks();
  }

  // 获取单个任务
  async getBruteTask(id: number): Promise<BruteTask> {
    const task = await this.db.getBruteTask(id);
    if (!task) {
      throw new Error('Brute task not found');
    }
    return task;
  }

  // 创建任务
  async createBruteTask(data: {
    name: string;
    request_id?: number;
    type?: string;
    total_payloads?: number;
  }): Promise<BruteTask> {
    const id = await this.db.createBruteTask(data);
    return await this.getBruteTask(id);
  }

  // 启动任务
  async startBruteTask(id: number): Promise<void> {
    const task = await this.getBruteTask(id);

    // 更新任务状态
    await this.db.updateBruteTask(id, {
      status: 'running',
      started_at: new Date().toISOString(),
    });

    // 这里应该启动实际的暴力破解逻辑
    // 由于暴力破解需要 HTTP 请求能力，暂时标记为完成
    // 在真实场景中，这里会使用 ReplayService 来发送请求

    // 模拟完成
    await this.db.updateBruteTask(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  }

  // 取消任务
  async cancelBruteTask(id: number): Promise<void> {
    await this.db.updateBruteTask(id, {
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    });

    // 清理活动任务
    this.activeTasks.delete(id);
  }

  // 删除任务
  async deleteBruteTask(id: number): Promise<void> {
    await this.db.deleteBruteTask(id);
    this.activeTasks.delete(id);
  }

  // 获取任务结果
  async getBruteTaskResults(id: number): Promise<BruteResult[]> {
    return await this.db.getBruteTaskResults(id);
  }

  // 分析结果
  async analyzeBruteResults(id: number, filters: {
    status?: string;
    status_code?: number;
  }): Promise<BruteResult[]> {
    let results = await this.db.getBruteTaskResults(id);

    if (filters.status) {
      results = results.filter(r => r.status === filters.status);
    }
    if (filters.status_code !== undefined) {
      results = results.filter(r => r.status_code === filters.status_code);
    }

    return results;
  }

  // 获取所有载荷集
  async getAllBrutePayloadSets(): Promise<BrutePayloadSet[]> {
    return await this.db.getAllBrutePayloadSets();
  }

  // 创建载荷集
  async createBrutePayloadSet(data: {
    name: string;
    type?: string;
    config?: Record<string, any>;
  }): Promise<BrutePayloadSet> {
    const id = await this.db.createBrutePayloadSet(data);
    const sets = await this.db.getAllBrutePayloadSets();
    return sets.find(s => s.id === id)!;
  }

  // 导入载荷
  async importBrutePayloads(setId: number, fileContent: string): Promise<void> {
    const payloads = fileContent.split('\n').filter(p => p.trim());
    await this.db.addPayloadsToSet(setId, payloads);
  }
}
