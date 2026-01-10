/**
 * 目标管理页面
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { TargetCard, TargetWithVulns } from '../components/special/TargetCard';
import { Button, Input, Modal, Select, Badge, Tag } from '../components/ui';
import { ScanConfigModal } from '../components/special/ScanConfigModal';
import { useTargetStore, selectFilteredTargets, selectAllTags } from '../store/targetStore';
import { useScanStore } from '../store/scanStore';
import clsx from 'clsx';

interface TargetsPageProps {
  onNavigate?: (page: string) => void;
}

export const TargetsPage: React.FC<TargetsPageProps> = ({ onNavigate }) => {
  const {
    targets,
    selectedIds,
    filters,
    loading,
    error,
    fetchTargets,
    addTarget,
    updateTarget,
    deleteTarget,
    batchDeleteTargets,
    toggleSelect,
    selectAll,
    clearSelection,
    setFilters,
    clearFilters,
  } = useTargetStore();

  const { createScan } = useScanStore();

  const filteredTargets = selectFilteredTargets(useTargetStore());
  const allTags = selectAllTags(useTargetStore());

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<number | null>(null);
  const [scanningTargetId, setScanningTargetId] = useState<number | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    tags: [] as string[],
  });

  // 初始化
  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  // 添加目标
  const handleAddTarget = async () => {
    try {
      await addTarget({
        name: formData.name,
        url: formData.url,
        tags: formData.tags,
      });
      setShowAddModal(false);
      setFormData({ name: '', url: '', tags: [] });
    } catch (error) {
      console.error('Failed to add target:', error);
    }
  };

  // 删除单个目标
  const handleDeleteTarget = async (id: number) => {
    try {
      await deleteTarget(id);
    } catch (error) {
      console.error('Failed to delete target:', error);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    try {
      await batchDeleteTargets(selectedIds);
      setShowDeleteConfirm(false);
      clearSelection();
    } catch (error) {
      console.error('Failed to batch delete:', error);
    }
  };

  // 刷新
  const handleRefresh = () => {
    fetchTargets();
  };

  // 编辑目标
  const handleEditTarget = (id: number) => {
    const target = targets.find((t) => t.id === id);
    if (target) {
      setFormData({
        name: target.name,
        url: target.url,
        tags: target.tags || [],
      });
      setEditingTargetId(id);
      setShowEditModal(true);
    }
  };

  // 更新目标
  const handleUpdateTarget = async () => {
    if (!editingTargetId) return;
    try {
      await updateTarget(editingTargetId, formData);
      setShowEditModal(false);
      setEditingTargetId(null);
      setFormData({ name: '', url: '', tags: [] });
    } catch (error) {
      console.error('Failed to update target:', error);
    }
  };

  // 快速扫描
  const handleQuickScan = (targetId: number) => {
    const target = targets.find((t) => t.id === targetId);
    if (target) {
      setScanningTargetId(targetId);
      setShowScanModal(true);
    }
  };

  // 创建扫描任务
  const handleCreateScan = async (config: any) => {
    if (!scanningTargetId) return;

    const target = targets.find((t) => t.id === scanningTargetId);
    if (!target) return;

    try {
      const scanId = await createScan({
        target_id: scanningTargetId,
        config,
      });
      setShowScanModal(false);
      setScanningTargetId(null);
      // 跳转到扫描页面
      if (onNavigate) {
        onNavigate('scans');
      }
    } catch (error) {
      console.error('Failed to create scan:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">目标管理</h1>
            <p className="text-slate-400 text-sm mt-1">
              管理和配置安全扫描目标
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 刷新按钮 */}
            <Button
              type="ghost"
              size="md"
              icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
              onClick={handleRefresh}
              disabled={loading}
            >
              刷新
            </Button>

            {/* 批量删除按钮 */}
            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2"
                >
                  <Badge variant="info">{selectedIds.length} 已选择</Badge>
                  <Button
                    type="danger"
                    size="md"
                    icon={<Trash2 size={16} />}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    批量删除
                  </Button>
                  <Button
                    type="ghost"
                    size="md"
                    onClick={clearSelection}
                  >
                    取消选择
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 添加按钮 */}
            <Button
              type="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => setShowAddModal(true)}
            >
              添加目标
            </Button>
          </div>
        </div>

        {/* 搜索和过滤栏 */}
        <div className="flex items-center gap-3">
          {/* 搜索框 */}
          <div className="flex-1 max-w-md">
            <Input
              placeholder="搜索目标名称或 URL..."
              prefix={<Search size={16} />}
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>

          {/* 过滤器 */}
          <div className="relative">
            <Button
              type="secondary"
              size="md"
              icon={<Filter size={16} />}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              筛选
              <ChevronDown size={14} className={`ml-1 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
            </Button>

            {showFilterDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilterDropdown(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full right-0 mt-2 z-20 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4"
                >
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      状态
                    </label>
                    <Select
                      options={[
                        { value: 'all', label: '全部' },
                        { value: 'active', label: '活跃' },
                        { value: 'inactive', label: '离线' },
                        { value: 'error', label: '错误' },
                      ]}
                      value={filters.status || 'all'}
                      onChange={(value) =>
                        setFilters({ status: value as any })
                      }
                    />
                  </div>

                  {allTags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        标签
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {allTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => {
                              const currentTags = filters.tags || [];
                              if (currentTags.includes(tag)) {
                                setFilters({
                                  tags: currentTags.filter((t) => t !== tag),
                                });
                              } else {
                                setFilters({ tags: [...currentTags, tag] });
                              }
                            }}
                            className={clsx(
                              'px-2 py-1 text-xs rounded border transition-colors',
                              filters.tags?.includes(tag)
                                ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                                : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                            )}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <Button
                      type="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        clearFilters();
                        setShowFilterDropdown(false);
                      }}
                    >
                      清除筛选
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
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

      {/* 目标列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={32} className="text-sky-500 animate-spin" />
        </div>
      ) : filteredTargets.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-400 mb-2">
            {targets.length === 0 ? '还没有目标' : '没有找到匹配的目标'}
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {targets.length === 0
              ? '点击上方"添加目标"按钮创建第一个目标'
              : '尝试调整筛选条件或搜索关键词'}
          </p>
          {targets.length === 0 && (
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => setShowAddModal(true)}
            >
              添加第一个目标
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* 全选提示 */}
          {filteredTargets.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                全选
              </button>
              <span className="text-slate-600">|</span>
              <span className="text-sm text-slate-500">
                显示 {filteredTargets.length} / {targets.length} 个目标
              </span>
            </div>
          )}

          {/* 目标卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredTargets.map((target) => (
                <TargetCard
                  key={target.id}
                  target={target as TargetWithVulns}
                  selected={selectedIds.includes(target.id)}
                  onToggleSelect={toggleSelect}
                  onScan={handleQuickScan}
                  onEdit={handleEditTarget}
                  onDelete={handleDeleteTarget}
                  onUrlClick={(url) => window.open(url, '_blank')}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* 添加目标模态框 */}
      <Modal
        visible={showAddModal}
        title="添加新目标"
        onClose={() => setShowAddModal(false)}
        onConfirm={handleAddTarget}
      >
        <div className="space-y-4">
          <Input
            label="目标名称"
            placeholder="例如：Production Server"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="目标 URL"
            placeholder="https://example.com"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              标签（可选）
            </label>
            <Input
              placeholder="输入标签后按回车添加"
              value={formData.tags.join(', ')}
              onChange={(e) => {
                const tags = e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean);
                setFormData({ ...formData, tags });
              }}
            />
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Tag
                    key={tag}
                    color="sky"
                    onClose={() =>
                      setFormData({
                        ...formData,
                        tags: formData.tags.filter((t) => t !== tag),
                      })
                    }
                  >
                    {tag}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 编辑目标模态框 */}
      <Modal
        visible={showEditModal}
        title="编辑目标"
        onClose={() => {
          setShowEditModal(false);
          setEditingTargetId(null);
          setFormData({ name: '', url: '', tags: [] });
        }}
        onConfirm={handleUpdateTarget}
      >
        <div className="space-y-4">
          <Input
            label="目标名称"
            placeholder="例如：Production Server"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="目标 URL"
            placeholder="https://example.com"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              标签（可选）
            </label>
            <Input
              placeholder="输入标签后按回车添加"
              value={formData.tags.join(', ')}
              onChange={(e) => {
                const tags = e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean);
                setFormData({ ...formData, tags });
              }}
            />
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Tag
                    key={tag}
                    color="sky"
                    onClose={() =>
                      setFormData({
                        ...formData,
                        tags: formData.tags.filter((t) => t !== tag),
                      })
                    }
                  >
                    {tag}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 快速扫描配置模态框 */}
      {scanningTargetId && (
        <ScanConfigModal
          visible={showScanModal}
          targetName={targets.find((t) => t.id === scanningTargetId)?.name}
          onClose={() => {
            setShowScanModal(false);
            setScanningTargetId(null);
          }}
          onConfirm={handleCreateScan}
        />
      )}

      {/* 批量删除确认 */}
      <Modal
        visible={showDeleteConfirm}
        title="确认删除"
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBatchDelete}
        confirmText="删除"
        cancelText="取消"
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            确定要删除选中的 <span className="text-sky-400 font-medium">{selectedIds.length}</span> 个目标吗？
          </p>
          <p className="text-sm text-slate-500">
            此操作将同时删除相关的扫描任务和漏洞记录，且无法撤销。
          </p>
        </div>
      </Modal>
    </div>
  );
};
