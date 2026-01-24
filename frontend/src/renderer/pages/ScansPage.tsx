/**
 * ScansPage 组件
 * 扫描任务管理页面
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  X,
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Trash2,
} from 'lucide-react';
import { Button, Badge, Modal } from '../components/ui';
import { ScanProgressBar } from '../components/special/ScanProgressBar';
import { ScanLogViewer, LogEntry } from '../components/special/ScanLogViewer';
import { ScanConfigModal, ScanConfigOptions } from '../components/special/ScanConfigModal';
import { useTargetStore } from '../store/targetStore';
import { getService } from '../services/WailsService';

// 扫描任务详情（简化版）
interface ScanTask {
  id: number;
  target_id: number;
  target_name: string;
  target_url?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_template?: string;
  total_templates?: number;
  completed_templates?: number;
  findings_count?: number;
  started_at?: string;
  completed_at?: string;
  duration?: number;
}

export const ScansPage: React.FC = () => {
  const [scans, setScans] = useState<ScanTask[]>([]);
  const [logs, setLogs] = useState<Map<number, LogEntry[]>>(new Map());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [selectedScanIds, setSelectedScanIds] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { targets } = useTargetStore();

  useEffect(() => {
    loadScans();

    // 加载目标数据
    const loadTargets = async () => {
      const { targets } = useTargetStore.getState();
      if (targets.length === 0) {
        await useTargetStore.getState().fetchTargets();
      }
    };
    loadTargets();

    // 监听扫描事件
    const handleScanStarted = ({ scanId }: { scanId: number }) => {
      console.log('Scan started:', scanId);
      loadScans();
    };

    const handleScanProgress = (data: any) => {
      console.log('Scan progress:', data);
      setScans((prev) =>
        prev.map((scan) =>
          scan.id === data.scanId
            ? {
                ...scan,
                progress: data.progress,
                current_template: data.currentTemplate,
                completed_templates: data.completedTemplates,
                total_templates: data.totalTemplates,
                findings_count: data.findings,
              }
            : scan
        )
      );
    };

    const handleScanFinding = ({ scanId, finding }: { scanId: number; finding: any }) => {
      console.log('Finding found:', finding);
      addLog(scanId, 'info', `Found: ${finding.info.name} (${finding.info.severity})`);
    };

    const handleScanCompleted = ({ scanId, status, findings }: { scanId: number; status: string; findings: number }) => {
      console.log('Scan completed:', scanId, status, findings);
      loadScans();
      addLog(scanId, 'info', `Scan completed with ${findings} findings`);
    };

    const handleScanError = ({ scanId, error }: { scanId: number; error: string }) => {
      console.error('Scan error:', scanId, error);
      addLog(scanId, 'error', `Scan failed: ${error}`);
      loadScans();
    };

    const handleScanLog = ({ scanId, timestamp, level, message }: { scanId: number; timestamp: string; level: string; message: string }) => {
      addLog(scanId, level as any, message, timestamp);
    };

    // 注册事件监听器（Wails 环境）
    const service = getService();

    // Wails 事件监听
    service.onScanProgress(handleScanProgress);
    service.onScanLog(handleScanLog);

    return () => {
      // 清理事件监听器
      service.offScanProgress();
      service.offScanLog?.();
    };
  }, []);

  const loadScans = async () => {
    try {
      const service = getService();
      const scansData = await service.getAllScans();

      // 转换数据格式 - 优先使用任务名称，回退到目标名称
      const convertedScans: ScanTask[] = scansData.map((scan) => ({
        id: scan.id,
        name: scan.name,
        target_id: scan.target_id,
        target_name: scan.name || `Target ${scan.target_id}`, // 优先显示任务名称
        status: scan.status as any,
        strategy: scan.strategy,
        templates_used: scan.templates_used,
        progress: scan.progress || 0,
        total_templates: scan.total_templates,
        executed_templates: scan.executed_templates,
        current_template: scan.current_template,
        started_at: scan.started_at,
        completed_at: scan.completed_at,
        error: scan.error,
        created_at: scan.created_at,
      }));

      setScans(convertedScans);
    } catch (error) {
      console.error('Failed to load scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (scanId: number, level: 'info' | 'warning' | 'error' | 'debug', message: string, timestamp?: string) => {
    setLogs((prev) => {
      const newLogs = new Map(prev);
      const scanLogs = newLogs.get(scanId) || [];
      scanLogs.push({
        timestamp: timestamp || new Date().toISOString(),
        level,
        message,
      });
      newLogs.set(scanId, scanLogs.slice(-200)); // 保留最近 200 条
      return newLogs;
    });
  };

  const handleStartScan = async (config: ScanConfigOptions & { taskName?: string }) => {
    console.log('[ScansPage] handleStartScan called with config:', config);
    console.log('[ScansPage] selectedTargetId:', selectedTargetId);
    console.log('[ScansPage] available targets:', targets);

    if (!selectedTargetId) {
      console.error('[ScansPage] No target selected');
      alert('请先选择目标');
      return;
    }

    try {
      const target = targets.find((t) => t.id === selectedTargetId);
      if (!target) {
        console.error('[ScansPage] Target not found for id:', selectedTargetId);
        throw new Error('Target not found');
      }

      console.log('[ScansPage] Found target:', target);
      const service = getService();
      console.log('[ScansPage] Got service:', service);

      const scan = await service.createScan({
        name: config.taskName,
        target_id: target.id,
        strategy: config.scenarioGroupId ? `scenario:${config.scenarioGroupId}` : (config.severity?.join(',') || 'default'),
        templates: config.templates || [],
        scenarioGroupId: config.scenarioGroupId,
      });

      console.log('[ScansPage] Scan created successfully:', scan);
      setShowConfigModal(false);
      addLog(scan.id, 'info', `Scan created for target: ${target.name}`);
      loadScans();
    } catch (error: any) {
      console.error('Failed to start scan:', error);
      alert(`启动扫描失败: ${error.message}`);
    }
  };

  const handleCancelScan = async (scanId: number) => {
    try {
      const service = getService();
      await service.cancelScan(scanId);
      addLog(scanId, 'warning', 'Scan cancelled by user');
      loadScans();
    } catch (error) {
      console.error('Failed to cancel scan:', error);
    }
  };

  const handleDeleteScan = async (scanId: number) => {
    if (!confirm('确定要删除这个扫描任务吗？此操作不可撤销。')) {
      return;
    }
    try {
      const service = getService();
      await service.deleteScan(scanId);
      addLog(scanId, 'info', 'Scan deleted');
      loadScans();
    } catch (error) {
      console.error('Failed to delete scan:', error);
      alert('删除扫描任务失败');
    }
  };

  const handleToggleSelect = (scanId: number) => {
    setSelectedScanIds((prev) =>
      prev.includes(scanId) ? prev.filter((id) => id !== scanId) : [...prev, scanId]
    );
  };

  const handleSelectAll = () => {
    setSelectedScanIds(scans.map((s) => s.id));
  };

  const handleClearSelection = () => {
    setSelectedScanIds([]);
  };

  const handleBatchDelete = async () => {
    try {
      const service = getService();
      await Promise.allSettled(selectedScanIds.map((id) => service.deleteScan(id)));
      setShowDeleteConfirm(false);
      setSelectedScanIds([]);
      loadScans();
    } catch (error) {
      console.error('Failed to batch delete scans:', error);
      alert('批量删除失败');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 size={20} className="animate-spin text-sky-400" />;
      case 'completed':
        return <CheckCircle2 size={20} className="text-emerald-400" />;
      case 'failed':
        return <AlertCircle size={20} className="text-red-400" />;
      case 'cancelled':
        return <X size={20} className="text-amber-400" />;
      default:
        return <Clock size={20} className="text-slate-400" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">扫描任务</h1>
          <p className="text-slate-400 mt-1">管理和监控安全扫描任务</p>
        </div>

        <div className="flex items-center gap-3">
          {/* 批量操作按钮 */}
          {selectedScanIds.length > 0 && (
            <>
              <Badge variant="info">{selectedScanIds.length} 已选择</Badge>
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
                onClick={handleClearSelection}
              >
                取消选择
              </Button>
            </>
          )}

          <Button
            type="primary"
            icon={<Play size={16} />}
            onClick={() => {
              console.log('[ScansPage] New Scan button clicked');
              console.log('[ScansPage] targets.length:', targets.length);
              console.log('[ScansPage] targets:', targets);
              if (targets.length > 0) {
                setSelectedTargetId(targets[0].id);
                setShowConfigModal(true);
                console.log('[ScansPage] Opening config modal for target:', targets[0].id);
              } else {
                console.log('[ScansPage] No targets available');
              }
            }}
            disabled={targets.length === 0}
          >
            新建扫描
          </Button>
        </div>
      </div>

      {/* 目标选择 */}
      {targets.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">选择目标</label>
          <select
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200"
            value={selectedTargetId || ''}
            onChange={(e) => setSelectedTargetId(Number(e.target.value) || null)}
          >
            <option value="">请选择目标</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name} ({target.url})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 扫描列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-slate-500" />
        </div>
      ) : scans.length === 0 ? (
        <div className="text-center py-12">
          <Target size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">暂无扫描任务</p>
          <p className="text-slate-600 text-sm mt-2">点击"新建扫描"开始第一次扫描</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 全选按钮 */}
          {scans.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <button
                onClick={handleSelectAll}
                className="hover:text-slate-300 transition-colors"
              >
                全选
              </button>
              <span>|</span>
              <span>共 {scans.length} 个扫描任务</span>
            </div>
          )}

          {scans.map((scan) => (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-slate-800/50 border rounded-xl p-5 transition-all ${
                selectedScanIds.includes(scan.id) ? 'border-sky-500/50 bg-sky-500/5' : 'border-slate-700'
              }`}
            >
              {/* 头部 */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* 选择复选框 */}
                  <input
                    type="checkbox"
                    checked={selectedScanIds.includes(scan.id)}
                    onChange={() => handleToggleSelect(scan.id)}
                    className="w-4 h-4 rounded border-slate-600 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-800"
                  />
                  {getStatusIcon(scan.status)}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">{scan.target_name}</h3>
                    {scan.target_url && (
                      <p className="text-sm text-slate-500">{scan.target_url}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      scan.status === 'completed'
                        ? 'success'
                        : scan.status === 'failed'
                        ? 'danger'
                        : scan.status === 'running'
                        ? 'info'
                        : 'default'
                    }
                  >
                    {scan.status}
                  </Badge>

                  <div className="flex items-center gap-2">
                    {scan.status === 'running' && (
                      <Button
                        type="danger"
                        size="sm"
                        icon={<X size={14} />}
                        onClick={() => handleCancelScan(scan.id)}
                      >
                        取消
                      </Button>
                    )}
                    {scan.status !== 'running' && (
                      <Button
                        type="secondary"
                        size="sm"
                        icon={<X size={14} />}
                        onClick={() => handleDeleteScan(scan.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        删除
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* 进度条 */}
              {scan.status === 'running' && (
                <ScanProgressBar
                  progress={{
                    status: scan.status,
                    progress: scan.progress,
                    currentTemplate: scan.current_template,
                    totalTemplates: scan.total_templates || 0,
                    completedTemplates: scan.completed_templates || 0,
                    findings: scan.findings_count || 0,
                  }}
                  showDetails
                />
              )}

              {/* 统计信息 */}
              <div className="flex items-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" />
                  <span className="text-slate-400">漏洞:</span>
                  <span className="text-amber-400 font-medium">{scan.findings_count || 0}</span>
                </div>

                {scan.duration !== undefined && (
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-500" />
                    <span className="text-slate-400">耗时:</span>
                    <span className="text-slate-300">{formatDuration(scan.duration)}</span>
                  </div>
                )}

                {scan.started_at && (
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-500" />
                    <span className="text-slate-400">开始时间:</span>
                    <span className="text-slate-300">
                      {new Date(scan.started_at).toLocaleString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>

              {/* 日志查看器 */}
              {logs.has(scan.id) && logs.get(scan.id)!.length > 0 && (
                <div className="mt-4">
                  <ScanLogViewer logs={logs.get(scan.id)!} maxLogs={50} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* 扫描配置模态框 */}
      <ScanConfigModal
        visible={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfirm={handleStartScan}
        targetName={targets.find((t) => t.id === selectedTargetId)?.name}
      />

      {/* 批量删除确认模态框 */}
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
            确定要删除选中的 <span className="text-sky-400 font-medium">{selectedScanIds.length}</span> 个扫描任务吗？
          </p>
          <p className="text-sm text-slate-500">
            此操作将同时删除相关的扫描日志和结果，且无法撤销。
          </p>
        </div>
      </Modal>
    </div>
  );
};
