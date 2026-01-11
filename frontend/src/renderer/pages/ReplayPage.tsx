/**
 * ReplayPage 组件
 * HTTP 请求重放页面
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Play,
  Trash2,
  Upload,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button, Badge, Modal } from '../components/ui';
import { useReplayStore } from '../store/replayStore';
import { HttpRequestCard } from '../components/special/HttpRequestCard';
import { RequestEditor } from '../components/special/RequestEditor';
import { ResponseViewer } from '../components/special/ResponseViewer';
import { ImportModal } from '../components/special/ImportModal';
import { HttpRequest, HttpHeader } from '../types';

export const ReplayPage: React.FC = () => {
  const {
    requests,
    selectedRequestId,
    currentResponse,
    loading,
    sending,
    error,
    showRequestModal,
    showImportModal,
    fetchRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    sendRequest,
    getResponseHistory,
    importRequest,
    setSelectedRequest,
    setShowRequestModal,
    setShowImportModal,
  } = useReplayStore();

  const [editingRequest, setEditingRequest] = useState<HttpRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // 处理选择请求
  const handleSelectRequest = async (id: number) => {
    setSelectedRequest(id);
    await getResponseHistory(id);
  };

  // 处理创建请求
  const handleCreateRequest = async (data: any) => {
    await createRequest(data);
    setEditingRequest(null);
  };

  // 处理更新请求
  const handleUpdateRequest = async (data: any) => {
    if (!editingRequest) return;
    await updateRequest(editingRequest.id, data);
    setEditingRequest(null);
  };

  // 处理发送请求
  const handleSendRequest = async (id: number) => {
    await sendRequest(id);
  };

  // 处理删除请求
  const handleDeleteRequest = async (id: number) => {
    if (confirm('确定要删除这个请求吗？')) {
      await deleteRequest(id);
    }
  };

  // 处理编辑请求
  const handleEditRequest = (request: HttpRequest) => {
    setEditingRequest(request);
    setShowRequestModal(true);
  };

  // 处理导入
  const handleImport = async (data: string, type: 'curl' | 'http') => {
    await importRequest(data, type);
  };

  // 获取选中的请求
  const selectedRequest = requests.find((r) => r.id === selectedRequestId);

  return (
    <div className="flex h-full">
      {/* 左侧：请求列表 */}
      <div className="w-96 border-r border-slate-700 flex flex-col bg-slate-900/50">
        {/* 工具栏 */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100">HTTP 请求</h2>
            <div className="flex items-center gap-2">
              <Button
                type="ghost"
                size="sm"
                icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
                onClick={fetchRequests}
                disabled={loading}
              />
              <Button
                type="ghost"
                size="sm"
                icon={<Upload size={14} />}
                onClick={() => setShowImportModal(true)}
                title="导入请求"
              />
              <Button
                type="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => {
                  setEditingRequest(null);
                  setShowRequestModal(true);
                }}
              >
                新建
              </Button>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 mx-4 mt-2 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 请求列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="text-sky-500 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">暂无请求</p>
              <p className="text-slate-500 text-xs mt-1">点击"新建"创建第一个请求</p>
            </div>
          ) : (
            <AnimatePresence>
              {requests.map((request) => (
                <HttpRequestCard
                  key={request.id}
                  request={request}
                  selected={selectedRequestId === request.id}
                  onClick={handleSelectRequest}
                  onSend={handleSendRequest}
                  onEdit={handleEditRequest}
                  onDelete={handleDeleteRequest}
                  sending={sending}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* 右侧：请求/响应详情 */}
      <div className="flex-1 flex flex-col">
        {selectedRequest ? (
          <>
            {/* 请求详情 */}
            <div className="h-1/2 border-b border-slate-700">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <span className="text-sm font-medium text-slate-300">请求</span>
                <Button
                  type="primary"
                  size="sm"
                  icon={<Play size={14} />}
                  onClick={() => handleSendRequest(selectedRequest.id)}
                  loading={sending}
                  disabled={sending}
                >
                  发送
                </Button>
              </div>
              <RequestEditor request={selectedRequest} readonly />
            </div>

            {/* 响应详情 */}
            <div className="h-1/2">
              <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
                <span className="text-sm font-medium text-slate-300">响应</span>
              </div>
              <ResponseViewer response={currentResponse} loading={sending} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText size={48} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">选择一个请求查看详情</p>
            </div>
          </div>
        )}
      </div>

      {/* 创建/编辑请求模态框 */}
      <Modal
        visible={showRequestModal}
        title={editingRequest ? '编辑请求' : '新建请求'}
        onClose={() => {
          setShowRequestModal(false);
          setEditingRequest(null);
        }}
        onConfirm={editingRequest ? handleUpdateRequest : handleCreateRequest}
        width={800}
      >
        <RequestEditor
          request={editingRequest || undefined}
          onChange={(data) => {
            // 这里可以处理表单数据变化
          }}
        />
      </Modal>

      {/* 导入模态框 */}
      <ImportModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onConfirm={handleImport}
      />
    </div>
  );
};
