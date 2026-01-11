/**
 * HTTP 重放 Store
 * 使用 Zustand 管理 HTTP 重放状态
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { HttpRequest, CreateHttpRequest, HttpResponse } from '../types';
import { getService } from '../services/WailsService';

interface ReplayState {
  // 数据
  requests: HttpRequest[];
  selectedRequestId: number | null;
  responses: Map<number, HttpResponse[]>;
  currentResponse: HttpResponse | null;

  // 加载状态
  loading: boolean;
  sending: boolean;
  error: string | null;

  // UI 状态
  showRequestModal: boolean;
  showImportModal: boolean;

  // Actions
  fetchRequests: () => Promise<void>;
  createRequest: (data: CreateHttpRequest) => Promise<void>;
  updateRequest: (id: number, data: Partial<CreateHttpRequest>) => Promise<void>;
  deleteRequest: (id: number) => Promise<void>;
  sendRequest: (id: number) => Promise<void>;
  getResponseHistory: (requestId: number) => Promise<HttpResponse[]>;
  importRequest: (data: string, type: 'curl' | 'http') => Promise<void>;

  // UI Actions
  setSelectedRequest: (id: number | null) => void;
  setCurrentResponse: (response: HttpResponse | null) => void;
  setShowRequestModal: (show: boolean) => void;
  setShowImportModal: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  setError: (error: string | null) => void;
}

export const useReplayStore = create<ReplayState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      requests: [],
      selectedRequestId: null,
      responses: new Map(),
      currentResponse: null,
      loading: false,
      sending: false,
      error: null,
      showRequestModal: false,
      showImportModal: false,

      // 获取所有请求
      fetchRequests: async () => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          const requests = await service.getAllHttpRequests();
          set({ requests, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      // 创建请求
      createRequest: async (data) => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          await service.createHttpRequest(data);
          // 重新获取列表
          const requests = await service.getAllHttpRequests();
          set({ requests, loading: false, showRequestModal: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 更新请求
      updateRequest: async (id, data) => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          await service.updateHttpRequest(id, data);
          // 更新本地状态
          const { requests } = get();
          const updatedRequests = requests.map((r) =>
            r.id === id ? { ...r, ...data } : r
          );
          set({ requests: updatedRequests, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 删除请求
      deleteRequest: async (id) => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          await service.deleteHttpRequest(id);
          // 从本地状态移除
          const { requests, selectedRequestId } = get();
          set({
            requests: requests.filter((r) => r.id !== id),
            selectedRequestId: selectedRequestId === id ? null : selectedRequestId,
            loading: false,
          });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 发送请求
      sendRequest: async (id) => {
        set({ sending: true, error: null });
        try {
          const service = getService();
          const response = await service.sendHttpRequest(id);
          // 添加到响应历史
          const { responses } = get();
          const requestResponses = responses.get(id) || [];
          const updatedResponses = new Map(responses);
          updatedResponses.set(id, [response, ...requestResponses]);
          set({
            responses: updatedResponses,
            currentResponse: response,
            sending: false,
          });
        } catch (error: any) {
          set({ error: error.message, sending: false });
          throw error;
        }
      },

      // 获取响应历史
      getResponseHistory: async (requestId) => {
        try {
          const service = getService();
          const responseHistory = await service.getHttpResponseHistory(requestId);
          // 更新本地状态
          const { responses } = get();
          const updatedResponses = new Map(responses);
          updatedResponses.set(requestId, responseHistory);
          set({ responses: updatedResponses });
          return responseHistory;
        } catch (error: any) {
          set({ error: error.message });
          return [];
        }
      },

      // 导入请求
      importRequest: async (data, type) => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          await service.importHttpRequest({ data, type });
          // 重新获取列表
          const requests = await service.getAllHttpRequests();
          set({ requests, loading: false, showImportModal: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // UI Actions
      setSelectedRequest: (id) => {
        set({ selectedRequestId: id, currentResponse: null });
      },

      setCurrentResponse: (response) => {
        set({ currentResponse: response });
      },

      setShowRequestModal: (show) => {
        set({ showRequestModal: show });
      },

      setShowImportModal: (show) => {
        set({ showImportModal: show });
      },

      setLoading: (loading) => {
        set({ loading });
      },

      setSending: (sending) => {
        set({ sending });
      },

      setError: (error) => {
        set({ error });
      },
    }),
    { name: 'ReplayStore' }
  )
);
