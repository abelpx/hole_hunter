/**
 * 暴力破解页面
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Zap,
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button, Input, Modal, Badge, Tag } from '../components/ui';
import { useBruteStore } from '../store/bruteStore';
import { useReplayStore } from '../store/replayStore';
import { BruteTaskCard } from '../components/special/BruteTaskCard';
import { BruteConfigModal } from '../components/special/BruteConfigModal';
import { PayloadSetModal } from '../components/special/PayloadSetModal';
import clsx from 'clsx';

export const BrutePage: React.FC = () => {
  const {
    tasks,
    payloadSets,
    selectedTask,
    results,
    loading,
    creatingTask,
    error,
    showConfigModal,
    showPayloadSetModal,
    fetchTasks,
    fetchPayloadSets,
    createTask,
    startTask,
    cancelTask,
    deleteTask,
    getTaskResults,
    setSelectedTask,
    setShowConfigModal,
    setShowPayloadSetModal,
  } = useBruteStore();

  const { requests, fetchRequests } = useReplayStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showResults, setShowResults] = useState(false);

  // 初始化
  useEffect(() => {
    fetchTasks();
    fetchPayloadSets();
    fetchRequests();
  }, [fetchTasks, fetchPayloadSets, fetchRequests]);

  // 过滤任务
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 创建任务
  const handleCreateTask = async (config: any) => {
    try {
      await createTask(config);
      setShowConfigModal(false);
    } catch (error) {
      console.error('Failed to create brute task:', error);
    }
  };

  // 启动任务
  const handleStartTask = async (id: number) => {
    try {
      await startTask(id);
    } catch (error) {
      console.error('Failed to start brute task:', error);
    }
  };

  // 取消任务
  const handleCancelTask = async (id: number) => {
    try {
      await cancelTask(id);
    } catch (error) {
      console.error('Failed to cancel brute task:', error);
    }
  };

  // 删除任务
  const handleDeleteTask = async (id: number) => {
    try {
      await deleteTask(id);
    } catch (error) {
      console.error('Failed to delete brute task:', error);
    }
  };

  // 查看结果
  const handleViewResults = async (task: BruteTask) => {
    setSelectedTask(task);
    await getTaskResults(task.id);
    setShowResults(true);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'completed':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'failed':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'cancelled':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'cancelled':
        return '已取消';
      case 'pending':
        return '等待中';
      case 'paused':
        return '已暂停';
      default:
        return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">暴力破解</h1>
            <p className="text-slate-400 text-sm mt-1">
              对 HTTP 请求进行参数暴力破解
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 刷新按钮 */}
            <Button
              type="ghost"
              size="md"
              icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
              onClick={() => {
                fetchTasks();
                fetchPayloadSets();
              }}
              disabled={loading}
            >
              刷新
            </Button>

            {/* 载荷集管理按钮 */}
            <Button
              type="secondary"
              size="md"
              icon={<Database size={16} />}
              onClick={() => setShowPayloadSetModal(true)}
            >
              载荷集管理
            </Button>

            {/* 创建任务按钮 */}
            <Button
              type="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => setShowConfigModal(true)}
              disabled={requests.length === 0}
            >
              创建任务
            </Button>
          </div>
        </div>

        {/* 搜索和过滤栏 */}
        <div className="flex items-center gap-3">
          {/* 搜索框 */}
          <div className="flex-1 max-w-md">
            <Input
              placeholder="搜索任务名称..."
              prefix={<Search size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 状态过滤器 */}
          <div className="flex items-center gap-2">
            {['all', 'running', 'completed', 'failed', 'pending'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  statusFilter === status
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                )}
              >
                {status === 'all' ? '全部' : getStatusText(status)}
              </button>
            ))}
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
            className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
          >
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 没有请求的提示 */}
      {requests.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <p className="text-sm text-amber-400 flex items-center gap-2">
            <AlertCircle size={16} />
            暂无 HTTP 请求，请先在「HTTP 重放」页面创建请求
          </p>
        </div>
      )}

      {/* 任务列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={32} className="text-sky-500 animate-spin" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap size={24} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-400 mb-2">
            {tasks.length === 0 ? '还没有暴力破解任务' : '没有找到匹配的任务'}
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {tasks.length === 0
              ? requests.length === 0
                ? '请先在「HTTP 重放」页面创建请求'
                : '点击上方「创建任务」按钮创建第一个任务'
              : '尝试调整筛选条件或搜索关键词'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredTasks.map((task) => (
              <BruteTaskCard
                key={task.id}
                task={task}
                onStart={handleStartTask}
                onCancel={handleCancelTask}
                onDelete={handleDeleteTask}
                onViewResults={handleViewResults}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 创建任务模态框 */}
      {showConfigModal && (
        <BruteConfigModal
          visible={showConfigModal}
          requests={requests}
          payloadSets={payloadSets}
          onClose={() => setShowConfigModal(false)}
          onConfirm={handleCreateTask}
        />
      )}

      {/* 载荷集管理模态框 */}
      {showPayloadSetModal && (
        <PayloadSetModal
          visible={showPayloadSetModal}
          payloadSets={payloadSets}
          onClose={() => setShowPayloadSetModal(false)}
          onRefresh={fetchPayloadSets}
        />
      )}

      {/* 结果查看器 */}
      {showResults && selectedTask && (
        <Modal
          visible={showResults}
          title={`任务结果 - ${selectedTask.name}`}
          onClose={() => {
            setShowResults(false);
            setSelectedTask(null);
          }}
          onConfirm={() => {
            setShowResults(false);
            setSelectedTask(null);
          }}
          width="xl"
        >
          <div className="space-y-4">
            {/* 任务统计 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-sm text-slate-400 mb-1">总请求数</div>
                <div className="text-lg font-semibold text-slate-100">{selectedTask.total_payloads}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-sm text-slate-400 mb-1">已发送</div>
                <div className="text-lg font-semibold text-sky-400">{selectedTask.sent_payloads}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-sm text-slate-400 mb-1">成功</div>
                <div className="text-lg font-semibold text-emerald-400">{selectedTask.success_count}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-sm text-slate-400 mb-1">失败</div>
                <div className="text-lg font-semibold text-red-400">{selectedTask.failure_count}</div>
              </div>
            </div>

            {/* 结果列表 */}
            <div className="max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  暂无结果
                </div>
              ) : (
                <div className="space-y-2">
                  {results.slice(0, 100).map((result) => (
                    <div
                      key={result.id}
                      className={clsx(
                        'bg-slate-800/50 rounded-lg p-3 border',
                        result.status === 'success'
                          ? 'border-emerald-500/20'
                          : 'border-red-500/20'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {result.status === 'success' ? (
                            <CheckCircle2 size={16} className="text-emerald-400" />
                          ) : (
                            <XCircle size={16} className="text-red-400" />
                          )}
                          <span className="text-sm font-medium text-slate-200">
                            {result.param_name}: {result.payload}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          {result.status_code && (
                            <span>状态码: {result.status_code}</span>
                          )}
                          {result.response_length && (
                            <span>长度: {result.response_length}</span>
                          )}
                          <span>{result.response_time}ms</span>
                        </div>
                      </div>
                      {result.error && (
                        <div className="text-xs text-red-400 mt-1">{result.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
