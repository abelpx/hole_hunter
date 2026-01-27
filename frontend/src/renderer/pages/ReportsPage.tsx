/**
 * 扫描报告页面
 * 显示扫描任务报告，支持生成和导出报告
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Plus,
  Filter,
  Search,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Eye,
} from 'lucide-react';
import { Button, Input, Select, Modal, Badge } from '../components/ui';
import { getService } from '../services/WailsService';

interface ScanReport {
  id: number;
  name: string;
  scan_id: number;
  target_name: string;
  target_url: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  format: 'pdf' | 'html' | 'json' | 'csv';
  file_path?: string;
  vulnerabilities_count: number;
  created_at: string;
  updated_at: string;
}

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ScanReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<ScanReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ScanReport | null>(null);

  // 过滤条件
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');

  // 创建报告表单
  const [createForm, setCreateForm] = useState({
    scan_id: 0,
    format: 'pdf' as 'pdf' | 'html' | 'json' | 'csv',
    name: '',
  });

  // 可用的扫描任务
  const [availableScans, setAvailableScans] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
    loadAvailableScans();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchQuery, statusFilter, formatFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const service = getService();
      const data = await service.getAllReports();

      // 转换数据格式
      const formattedReports: ScanReport[] = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        scan_id: r.scan_id,
        target_name: `Scan ${r.scan_id}`, // 可以从 scan 数据中获取真实名称
        target_url: '',
        status: r.status as ScanReport['status'],
        format: r.format as ScanReport['format'],
        file_path: r.file_path,
        vulnerabilities_count: 0, // 可以从配置中获取
        created_at: r.created_at,
        updated_at: r.generated_at || r.created_at,
      }));

      setReports(formattedReports);
    } catch (error) {
      console.error('Failed to load reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableScans = async () => {
    try {
      const service = getService();
      const scans = await service.getAllScans();
      // 只显示已完成的扫描
      setAvailableScans(scans.filter((s: any) => s.status === 'completed'));
    } catch (error) {
      console.error('Failed to load scans:', error);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    // 搜索过滤
    if (searchQuery) {
      filtered = filtered.filter(
        (report) =>
          report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.target_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.target_url.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter((report) => report.status === statusFilter);
    }

    // 格式过滤
    if (formatFilter !== 'all') {
      filtered = filtered.filter((report) => report.format === formatFilter);
    }

    setFilteredReports(filtered);
  };

  const handleCreateReport = async () => {
    if (!createForm.scan_id) {
      alert('请选择扫描任务');
      return;
    }

    if (!createForm.name) {
      alert('请输入报告名称');
      return;
    }

    try {
      // TODO: 实现创建报告 API
      // await ipcService.createReport(createForm);
      console.log('Creating report:', createForm);

      setShowCreateModal(false);
      setCreateForm({ scan_id: 0, format: 'pdf', name: '' });
      loadReports();
    } catch (error: any) {
      console.error('Failed to create report:', error);
      alert('创建报告失败: ' + error.message);
    }
  };

  const handleDownloadReport = (report: ScanReport) => {
    // TODO: 实现下载报告
    console.log('Downloading report:', report);
    alert(`下载报告: ${report.name}`);
  };

  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('确定要删除这个报告吗？')) {
      return;
    }

    try {
      // TODO: 实现删除报告 API
      // await ipcService.deleteReport(reportId);
      console.log('Deleting report:', reportId);
      loadReports();
    } catch (error: any) {
      console.error('Failed to delete report:', error);
      alert('删除报告失败: ' + error.message);
    }
  };

  const getStatusBadge = (status: ScanReport['status']) => {
    const variants: Record<ScanReport['status'], 'success' | 'warning' | 'danger' | 'default'> = {
      completed: 'success',
      generating: 'warning',
      pending: 'default',
      failed: 'danger',
    };

    const labels: Record<ScanReport['status'], string> = {
      completed: '已完成',
      generating: '生成中',
      pending: '待处理',
      failed: '失败',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getFormatIcon = (format: ScanReport['format']) => {
    const icons: Record<ScanReport['format'], string> = {
      pdf: '📄',
      html: '🌐',
      json: '📋',
      csv: '📊',
    };
    return icons[format];
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">扫描报告</h1>
          <p className="text-slate-400 mt-1">管理和导出扫描报告</p>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => setShowCreateModal(true)}
        >
          创建报告
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">总报告数</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">{reports.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">已完成</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {reports.filter((r) => r.status === 'completed').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} className="text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">生成中</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {reports.filter((r) => r.status === 'generating').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">失败</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {reports.filter((r) => r.status === 'failed').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 过滤和搜索 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="搜索报告名称、目标..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            placeholder="状态"
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'completed', label: '已完成' },
              { value: 'generating', label: '生成中' },
              { value: 'pending', label: '待处理' },
              { value: 'failed', label: '失败' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-40"
          />

          <Select
            placeholder="格式"
            options={[
              { value: 'all', label: '全部格式' },
              { value: 'pdf', label: 'PDF' },
              { value: 'html', label: 'HTML' },
              { value: 'json', label: 'JSON' },
              { value: 'csv', label: 'CSV' },
            ]}
            value={formatFilter}
            onChange={setFormatFilter}
            className="w-40"
          />
        </div>
      </div>

      {/* 报告列表 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">加载中...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 mb-4">
              {searchQuery || statusFilter !== 'all' || formatFilter !== 'all'
                ? '没有找到符合条件的报告'
                : '暂无扫描报告'}
            </p>
            {!searchQuery && statusFilter === 'all' && formatFilter === 'all' && (
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => setShowCreateModal(true)}
              >
                创建第一个报告
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  报告名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  目标
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  格式
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  漏洞数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getFormatIcon(report.format)}</span>
                      <div>
                        <div className="text-sm font-medium text-slate-200">{report.name}</div>
                        <div className="text-xs text-slate-500">ID: {report.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm text-slate-300">{report.target_name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">{report.target_url}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(report.status)}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                      {report.format.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-slate-300">
                      <Shield size={14} className="mr-1" />
                      <span className="text-sm">{report.vulnerabilities_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {new Date(report.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {report.status === 'completed' && (
                        <Button
                          type="ghost"
                          size="sm"
                          icon={<Download size={14} />}
                          onClick={() => handleDownloadReport(report)}
                        >
                          下载
                        </Button>
                      )}
                      <Button
                        type="ghost"
                        size="sm"
                        icon={<Eye size={14} />}
                        onClick={() => setSelectedReport(report)}
                      >
                        查看
                      </Button>
                      <Button
                        type="ghost"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 创建报告模态框 */}
      <Modal
        visible={showCreateModal}
        title="创建扫描报告"
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreateReport}
        width="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              选择扫描任务
            </label>
            <Select
              placeholder="请选择已完成的扫描任务"
              options={availableScans.map((scan) => ({
                value: scan.id,
                label: `${scan.name || scan.id} - ${scan.target_name || ''}`,
              }))}
              value={createForm.scan_id}
              onChange={(value) => setCreateForm({ ...createForm, scan_id: value })}
            />
            <p className="text-xs text-slate-500 mt-1">只能为已完成的扫描生成报告</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              报告格式
            </label>
            <Select
              options={[
                { value: 'pdf', label: 'PDF 文档' },
                { value: 'html', label: 'HTML 网页' },
                { value: 'json', label: 'JSON 数据' },
                { value: 'csv', label: 'CSV 表格' },
              ]}
              value={createForm.format}
              onChange={(value) => setCreateForm({ ...createForm, format: value as any })}
            />
          </div>

          <Input
            label="报告名称"
            placeholder="例如: 目标扫描报告 - example.com"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            required
          />
        </div>
      </Modal>

      {/* 查看报告详情模态框 */}
      {selectedReport && (
        <Modal
          visible={!!selectedReport}
          title="报告详情"
          onClose={() => setSelectedReport(null)}
          onConfirm={() => setSelectedReport(null)}
          confirmText="关闭"
          width="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">报告名称</label>
                <p className="text-slate-200">{selectedReport.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">报告 ID</label>
                <p className="text-slate-200">{selectedReport.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">目标名称</label>
                <p className="text-slate-200">{selectedReport.target_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">目标 URL</label>
                <p className="text-slate-200 break-all">{selectedReport.target_url}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">状态</label>
                {getStatusBadge(selectedReport.status)}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">格式</label>
                <p className="text-slate-200">{selectedReport.format.toUpperCase()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">漏洞数量</label>
                <p className="text-slate-200">{selectedReport.vulnerabilities_count}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">创建时间</label>
                <p className="text-slate-200">
                  {new Date(selectedReport.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>

            {selectedReport.file_path && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">文件路径</label>
                <p className="text-slate-200 text-sm font-mono bg-slate-900 rounded p-2">
                  {selectedReport.file_path}
                </p>
              </div>
            )}

            {selectedReport.status === 'completed' && (
              <div className="flex justify-end">
                <Button
                  type="primary"
                  icon={<Download size={16} />}
                  onClick={() => handleDownloadReport(selectedReport)}
                >
                  下载报告
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
