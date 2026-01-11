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
} from 'lucide-react';
import { Button, Badge } from '../components/ui';
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
  const { targets } = useTargetStore();

  useEffect(() => {
    loadScans();

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

    // 注册事件监听器（Wails 或 Electron 环境）
    const service = getService();
    const isWails = typeof window !== 'undefined' && (window as any).go !== undefined;

    if (isWails) {
      // Wails 事件监听
      service.onScanProgress(handleScanProgress);
    } else if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.on('scan-started', handleScanStarted);
      window.electronAPI.on('scan-progress', handleScanProgress);
      window.electronAPI.on('scan-finding', handleScanFinding);
      window.electronAPI.on('scan-completed', handleScanCompleted);
      window.electronAPI.on('scan-error', handleScanError);
      window.electronAPI.on('scan-log', handleScanLog);
    }

    return () => {
      // 清理事件监听器
      if (isWails) {
        service.offScanProgress();
      }
      // TODO: 添加 Electron 的清理逻辑
    };
  }, []);

  const loadScans = async () => {
    try {
      const service = getService();
      const scansData = await service.getAllScans();

      // 转换数据格式
      const convertedScans: ScanTask[] = scansData.map((scan) => ({
        id: scan.id,
        target_id: scan.target_id,
        target_name: `Target ${scan.target_id}`, // 需要从 target 表获取
        status: scan.status as any,
        progress: scan.progress || 0,
        current_template: scan.current_template,
        total_templates: scan.total_templates,
        completed_templates: scan.executed_templates,
        started_at: scan.started_at,
        completed_at: scan.completed_at,
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

  const handleStartScan = async (config: ScanConfigOptions) => {
    if (!selectedTargetId) {
      return;
    }

    try {
      const target = targets.find((t) => t.id === selectedTargetId);
      if (!target) {
        throw new Error('Target not found');
      }

      const service = getService();
      const scan = await service.createScan({
        target_id: target.id,
        strategy: config.severity?.join(',') || 'default',
        templates: config.templates || [],
      });

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

        <Button
          type="primary"
          icon={<Play size={16} />}
          onClick={() => {
            if (targets.length > 0) {
              setSelectedTargetId(targets[0].id);
              setShowConfigModal(true);
            }
          }}
          disabled={targets.length === 0}
        >
          新建扫描
        </Button>
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
          {scans.map((scan) => (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-5"
            >
              {/* 头部 */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
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
    </div>
  );
};
