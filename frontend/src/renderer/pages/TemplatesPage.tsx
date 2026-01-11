/**
 * 模板管理页面
 * 管理 Nuclei 扫描模板
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  FileCode,
  Tag,
  Star,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button, Input, Select, Modal, Badge } from '../components/ui';
import clsx from 'clsx';

interface NucleiTemplate {
  id: string;
  name: string;
  author: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  tags: string[];
  description: string;
  path: string;
  isInstalled: boolean;
  isCustom: boolean;
  lastUpdated: string;
}

interface TemplateCategory {
  id: string;
  name: string;
  count: number;
  icon: React.ReactNode;
}

// 模板分类
const templateCategories: TemplateCategory[] = [
  { id: 'all', name: '全部模板', count: 6000, icon: <Layers size={16} /> },
  { id: 'cves', name: 'CVE 漏洞', count: 2500, icon: <AlertCircle size={16} /> },
  { id: 'vulnerabilities', name: '通用漏洞', count: 1800, icon: <AlertCircle size={16} /> },
  { id: 'exposures', name: '信息泄露', count: 1200, icon: <Eye size={16} /> },
  { id: 'technologies', name: '技术检测', count: 800, icon: <Tag size={16} /> },
  { id: 'misconfiguration', name: '配置错误', count: 500, icon: <AlertCircle size={16} /> },
  { id: 'custom', name: '自定义模板', count: 0, icon: <Edit size={16} /> },
];

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<NucleiTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<NucleiTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<NucleiTemplate | null>(null);

  // 过滤条件
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');

  // 操作状态
  const [updating, setUpdating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, severityFilter, authorFilter, selectedCategory]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      // TODO: 实现从后端加载模板列表
      // const data = await ipcService.getTemplates();

      // 临时模拟数据
      const mockTemplates: NucleiTemplate[] = [
        {
          id: 'cve-2021-44228',
          name: 'Apache Log4j RCE',
          author: 'pdteam',
          severity: 'critical',
          tags: ['cve', 'cve2021', 'rce', 'log4j', 'oast'],
          description: 'Apache Log4j 远程代码执行漏洞检测',
          path: '/nuclei-templates/cves/2021/CVE-2021-44228.yaml',
          isInstalled: true,
          isCustom: false,
          lastUpdated: '2024-01-15',
        },
        {
          id: 'spring4shell',
          name: 'Spring Framework RCE',
          author: 'pdteam',
          severity: 'critical',
          tags: ['cve', 'cve2022', 'rce', 'spring', 'spring4shell'],
          description: 'Spring Framework 远程代码执行漏洞检测',
          path: '/nuclei-templates/cves/2022/CVE-2022-22965.yaml',
          isInstalled: true,
          isCustom: false,
          lastUpdated: '2024-01-10',
        },
        {
          id: 'struts2-rce',
          name: 'Apache Struts2 RCE',
          author: 'daffainfo',
          severity: 'critical',
          tags: ['cve', 'rce', 'struts2', 's2-061'],
          description: 'Apache Struts2 远程代码执行漏洞',
          path: '/nuclei-templates/cves/2018/CVE-2018-11776.yaml',
          isInstalled: true,
          isCustom: false,
          lastUpdated: '2023-12-20',
        },
        {
          id: 'exposed-admin-panel',
          name: 'Admin Panel Exposed',
          author: 'geisler',
          severity: 'high',
          tags: ['panel', 'exposure', 'admin'],
          description: '检测暴露的管理面板',
          path: '/nuclei-templates/exposures/admin/admin-panel.yaml',
          isInstalled: true,
          isCustom: false,
          lastUpdated: '2024-01-05',
        },
        {
          id: 'nginx-version',
          name: 'Nginx Version Detection',
          author: 'pdteam',
          severity: 'info',
          tags: ['tech', 'nginx', 'version'],
          description: '检测 Nginx 版本信息',
          path: '/nuclei-templates/technologies/nginx-version.yaml',
          isInstalled: true,
          isCustom: false,
          lastUpdated: '2023-11-15',
        },
        {
          id: 'custom-xss',
          name: 'Custom XSS Detection',
          author: 'user',
          severity: 'medium',
          tags: ['xss', 'custom'],
          description: '自定义 XSS 检测模板',
          path: '/custom-templates/xss.yaml',
          isInstalled: true,
          isCustom: true,
          lastUpdated: '2024-01-20',
        },
      ];

      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // 分类过滤
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'custom') {
        filtered = filtered.filter((t) => t.isCustom);
      } else if (selectedCategory === 'cves') {
        filtered = filtered.filter((t) => t.tags.includes('cve'));
      } else {
        filtered = filtered.filter((t) => t.tags.some((tag) => tag.includes(selectedCategory)));
      }
    }

    // 搜索过滤
    if (searchQuery) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // 严重程度过滤
    if (severityFilter !== 'all') {
      filtered = filtered.filter((template) => template.severity === severityFilter);
    }

    // 作者过滤
    if (authorFilter !== 'all') {
      filtered = filtered.filter((template) => template.author === authorFilter);
    }

    setFilteredTemplates(filtered);
  };

  const handleUpdateTemplates = async () => {
    try {
      setUpdating(true);
      // TODO: 实现更新模板 API
      // await ipcService.updateTemplates();

      // 模拟更新过程
      await new Promise((resolve) => setTimeout(resolve, 2000));
      alert('模板更新成功！');
      loadTemplates();
    } catch (error: any) {
      alert('更新失败: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('确定要删除这个模板吗？')) {
      return;
    }

    try {
      // TODO: 实现删除模板 API
      // await ipcService.deleteTemplate(templateId);
      console.log('Deleting template:', templateId);
      loadTemplates();
    } catch (error: any) {
      alert('删除失败: ' + error.message);
    }
  };

  const getSeverityColor = (severity: NucleiTemplate['severity']) => {
    const colors = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      info: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return colors[severity];
  };

  const getSeverityLabel = (severity: NucleiTemplate['severity']) => {
    const labels = {
      critical: '严重',
      high: '高危',
      medium: '中危',
      low: '低危',
      info: '信息',
    };
    return labels[severity];
  };

  const getUniqueAuthors = () => {
    const authors = new Set(templates.map((t) => t.author));
    return Array.from(authors).sort();
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">模板管理</h1>
          <p className="text-slate-400 mt-1">管理 Nuclei 扫描模板库</p>
        </div>
        <div className="flex gap-3">
          <Button
            type="secondary"
            icon={<Upload size={16} />}
            onClick={() => setShowImportModal(true)}
          >
            导入模板
          </Button>
          <Button
            type="secondary"
            icon={<RefreshCw size={16} />}
            onClick={handleUpdateTemplates}
            loading={updating}
          >
            {updating ? '更新中...' : '更新模板'}
          </Button>
          <Button
            type="primary"
            icon={<FileCode size={16} />}
            onClick={() => setShowCreateModal(true)}
          >
            创建模板
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        {templateCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={clsx(
              'bg-slate-800/50 border rounded-xl p-4 text-left transition-all',
              'hover:border-sky-500/50 hover:bg-slate-800',
              selectedCategory === category.id
                ? 'border-sky-500 bg-sky-500/10'
                : 'border-slate-700'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                selectedCategory === category.id
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-700 text-slate-400'
              )}>
                {category.icon}
              </div>
              <span className={clsx(
                'text-2xl font-bold',
                selectedCategory === category.id ? 'text-sky-400' : 'text-slate-100'
              )}>
                {category.count}
              </span>
            </div>
            <p className={clsx(
              'text-sm font-medium',
              selectedCategory === category.id ? 'text-sky-400' : 'text-slate-300'
            )}>
              {category.name}
            </p>
          </button>
        ))}
      </div>

      {/* 过滤和搜索 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="搜索模板名称、ID、标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            placeholder="严重程度"
            options={[
              { value: 'all', label: '全部等级' },
              { value: 'critical', label: '严重' },
              { value: 'high', label: '高危' },
              { value: 'medium', label: '中危' },
              { value: 'low', label: '低危' },
              { value: 'info', label: '信息' },
            ]}
            value={severityFilter}
            onChange={setSeverityFilter}
            className="w-40"
          />

          <Select
            placeholder="作者"
            options={[
              { value: 'all', label: '全部作者' },
              ...getUniqueAuthors().map((author) => ({ value: author, label: author })),
            ]}
            value={authorFilter}
            onChange={setAuthorFilter}
            className="w-40"
          />
        </div>
      </div>

      {/* 模板列表 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">加载中...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-8 text-center">
            <FileCode size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 mb-4">
              {searchQuery || severityFilter !== 'all' || authorFilter !== 'all'
                ? '没有找到符合条件的模板'
                : '暂无模板'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    模板名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    作者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    严重程度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    标签
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    最后更新
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-slate-200">
                          {template.isCustom && <Star size={12} className="inline text-yellow-400 mr-1" />}
                          {template.name}
                        </div>
                        <div className="text-xs text-slate-500">{template.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{template.author}</td>
                    <td className="px-6 py-4">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                          getSeverityColor(template.severity)
                        )}
                      >
                        {getSeverityLabel(template.severity)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="text-xs text-slate-500">
                            +{template.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {template.isInstalled ? (
                        <div className="flex items-center text-green-400 text-sm">
                          <CheckCircle size={14} className="mr-1" />
                          已安装
                        </div>
                      ) : (
                        <div className="flex items-center text-slate-500 text-sm">
                          <XCircle size={14} className="mr-1" />
                          未安装
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{template.lastUpdated}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="ghost"
                          size="sm"
                          icon={<Eye size={14} />}
                          onClick={() => setSelectedTemplate(template)}
                        >
                          查看
                        </Button>
                        {template.isCustom && (
                          <Button
                            type="ghost"
                            size="sm"
                            icon={<Trash2 size={14} />}
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            删除
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 模板详情模态框 */}
      {selectedTemplate && (
        <Modal
          visible={!!selectedTemplate}
          title="模板详情"
          onClose={() => setSelectedTemplate(null)}
          onConfirm={() => setSelectedTemplate(null)}
          confirmText="关闭"
          width="xl"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                  {selectedTemplate.name}
                  {selectedTemplate.isCustom && (
                    <Star size={14} className="text-yellow-400" />
                  )}
                </h3>
                <p className="text-sm text-slate-500 mt-1">{selectedTemplate.id}</p>
              </div>
              <span
                className={clsx(
                  'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border',
                  getSeverityColor(selectedTemplate.severity)
                )}
              >
                {getSeverityLabel(selectedTemplate.severity)}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">描述</label>
              <p className="text-sm text-slate-200">{selectedTemplate.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">作者</label>
                <p className="text-sm text-slate-200">{selectedTemplate.author}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">最后更新</label>
                <p className="text-sm text-slate-200">{selectedTemplate.lastUpdated}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1">模板路径</label>
                <p className="text-sm text-slate-400 font-mono bg-slate-900 rounded p-2 break-all">
                  {selectedTemplate.path}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">标签</label>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-slate-700 text-slate-300"
                  >
                    <Tag size={12} className="mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 创建模板模态框 */}
      <Modal
        visible={showCreateModal}
        title="创建自定义模板"
        onClose={() => setShowCreateModal(false)}
        onConfirm={() => {
          // TODO: 实现创建模板逻辑
          setShowCreateModal(false);
        }}
        confirmText="创建"
        width="xl"
      >
        <div className="space-y-4">
          <Input label="模板名称" placeholder="例如: Custom XSS Detection" />
          <Input label="模板 ID" placeholder="例如: custom-xss" />
          <Select
            label="严重程度"
            options={[
              { value: 'critical', label: '严重' },
              { value: 'high', label: '高危' },
              { value: 'medium', label: '中危' },
              { value: 'low', label: '低危' },
              { value: 'info', label: '信息' },
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              标签（逗号分隔）
            </label>
            <Input placeholder="例如: xss, web, custom" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              模板内容 (YAML)
            </label>
            <textarea
              placeholder="id: custom-xss

info:
  name: Custom XSS Detection
  author: user
  severity: medium
  tags: xss,web

requests:
  - method: GET
    path:
      - '{{BaseURL}}'"
              className="w-full h-48 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* 导入模板模态框 */}
      <Modal
        visible={showImportModal}
        title="导入模板"
        onClose={() => setShowImportModal(false)}
        onConfirm={() => {
          // TODO: 实现导入模板逻辑
          setShowImportModal(false);
        }}
        confirmText="导入"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              从文件导入
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".yaml,.yml"
                className="flex-1 text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600"
              />
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              或从 URL 导入
            </label>
            <Input
              placeholder="https://raw.githubusercontent.com/..."
              type="url"
            />
          </div>

          <div className="border-t border-slate-700 pt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              或直接粘贴 YAML 内容
            </label>
            <textarea
              placeholder="粘贴模板 YAML 内容..."
              className="w-full h-32 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
