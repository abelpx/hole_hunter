/**
 * 暴力破解 Store
 * 使用 Zustand 管理暴力破解任务状态
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { BruteTask, CreateBruteTaskRequest, BrutePayloadSet, CreatePayloadSetRequest, BruteResult } from '../types';
import { getService } from '../services/WailsService';

// Store 状态
interface BruteState {
  // 数据
  tasks: BruteTask[];
  payloadSets: BrutePayloadSet[];
  selectedTask: BruteTask | null;
  results: BruteResult[];

  // 加载状态
  loading: boolean;
  creatingTask: boolean;
  error: string | null;

  // UI 状态
  showConfigModal: boolean;
  showPayloadSetModal: boolean;
  selectedRequestId: number | null;

  // Actions
  fetchTasks: () => Promise<void>;
  fetchPayloadSets: () => Promise<void>;
  createTask: (data: CreateBruteTaskRequest) => Promise<number>;
  startTask: (id: number) => Promise<void>;
  cancelTask: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  getTaskResults: (id: number) => Promise<BruteResult[]>;
  createPayloadSet: (data: CreatePayloadSetRequest) => Promise<number>;

  // UI Actions
  setSelectedTask: (task: BruteTask | null) => void;
  setShowConfigModal: (show: boolean) => void;
  setShowPayloadSetModal: (show: boolean) => void;
  setSelectedRequestId: (id: number | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBruteStore = create<BruteState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      tasks: [],
      payloadSets: [],
      selectedTask: null,
      results: [],
      loading: false,
      creatingTask: false,
      error: null,
      showConfigModal: false,
      showPayloadSetModal: false,
      selectedRequestId: null,

      // 获取所有任务
      fetchTasks: async () => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          const tasks = await service.getAllBruteTasks();
          set({ tasks, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      // 获取所有载荷集
      fetchPayloadSets: async () => {
        try {
          const service = getService();
          const payloadSets = await service.getAllBrutePayloadSets();
          set({ payloadSets });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      // 创建任务
      createTask: async (data) => {
        set({ creatingTask: true, error: null });
        try {
          const service = getService();
          const task = await service.createBruteTask(data);
          set({ creatingTask: false });

          // 重新获取任务列表
          const tasks = await service.getAllBruteTasks();
          set({ tasks });

          return task.id;
        } catch (error: any) {
          set({ error: error.message, creatingTask: false });
          throw error;
        }
      },

      // 启动任务
      startTask: async (id: number) => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          await service.startBruteTask(id);

          // 更新本地状态
          const { tasks } = get();
          const updatedTasks = tasks.map((t) =>
            t.id === id ? { ...t, status: 'running' as const } : t
          );
          set({ tasks: updatedTasks, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 取消任务
      cancelTask: async (id: number) => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          await service.cancelBruteTask(id);

          // 更新本地状态
          const { tasks } = get();
          const updatedTasks = tasks.map((t) =>
            t.id === id ? { ...t, status: 'cancelled' as const } : t
          );
          set({ tasks: updatedTasks, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 删除任务
      deleteTask: async (id: number) => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          await service.deleteBruteTask(id);

          // 更新本地状态
          const { tasks } = get();
          const updatedTasks = tasks.filter((t) => t.id !== id);
          set({ tasks: updatedTasks, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 获取任务结果
      getTaskResults: async (id: number) => {
        try {
          const service = getService();
          const results = await service.getBruteTaskResults(id);
          set({ results });
          return results;
        } catch (error: any) {
          set({ error: error.message });
          return [];
        }
      },

      // 创建载荷集
      createPayloadSet: async (data) => {
        try {
          const service = getService();
          const payloadSet = await service.createBrutePayloadSet(data);

          // 重新获取载荷集列表
          const payloadSets = await service.getAllBrutePayloadSets();
          set({ payloadSets });

          return payloadSet.id;
        } catch (error: any) {
          set({ error: error.message });
          throw error;
        }
      },

      // 设置选中的任务
      setSelectedTask: (task: BruteTask | null) => {
        set({ selectedTask: task });
      },

      // 设置配置模态框显示状态
      setShowConfigModal: (show: boolean) => {
        set({ showConfigModal: show });
      },

      // 设置载荷集模态框显示状态
      setShowPayloadSetModal: (show: boolean) => {
        set({ showPayloadSetModal: show });
      },

      // 设置选中的请求 ID
      setSelectedRequestId: (id: number | null) => {
        set({ selectedRequestId: id });
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ loading });
      },

      // 设置错误
      setError: (error: string | null) => {
        set({ error });
      },
    }),
    { name: 'BruteStore' }
  )
);
