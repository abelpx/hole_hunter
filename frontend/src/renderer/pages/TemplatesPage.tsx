/**
 * 模板管理页面
 * 管理 Nuclei 扫描模板，支持分组管理和启用/禁用
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
  Power,
  PowerOff,
} from 'lucide-react';
import { Button, Input, Select, Modal, Badge } from '../components/ui';
import clsx from 'clsx';
import { GetAllNucleiTemplates, GetNucleiTemplateContent } from '@wailsjs/go/main/App';

interface NucleiTemplate {
  id: string;
  name: string;
  author: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  tags: string[];
  description: string;
  path: string;
  category: string;
  enabled: boolean;
}

interface TemplateCategory {
  id: string;
  name: string;
  count: number;
  icon: React.ReactNode;
}

// 模板分类定义
const templateCategoryDefs: Omit<TemplateCategory, 'count'>[] = [
  { id: 'all', name: '全部模板', icon: <Layers size={16} /> },
  { id: 'cves', name: 'CVE 漏洞', icon: <AlertCircle size={16} /> },
  { id: 'vulnerabilities', name: '通用漏洞', icon: <AlertCircle size={16} /> },
  { id: 'exposures', name: '信息泄露', icon: <Eye size={16} /> },
  { id: 'technologies', name: '技术检测', icon: <Tag size={16} /> },
  { id: 'misconfiguration', name: '配置错误', icon: <AlertCircle size={16} /> },
  { id: 'network', name: '网络', icon: <AlertCircle size={16} /> },
  { id: 'file', name: '文件', icon: <FileCode size={16} /> },
  { id: 'workflows', name: '工作流', icon: <Edit size={16} /> },
];

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<NucleiTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<NucleiTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<NucleiTemplate | null>(null);
  const [templateContent, setTemplateContent] = useState<string>('');

  // 过滤条件
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');

  // 分组管理状态
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTemplates();
    loadCategoryPreferences();
  }, []);

  // 加载分类偏好设置
  const loadCategoryPreferences = () => {
    try {
      const saved = localStorage.getItem('disabledTemplateCategories');
      if (saved) {
        setDisabledCategories(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Failed to load category preferences:', error);
    }
  };

  // 保存分类偏好设置
  const saveCategoryPreferences = (categories: Set<string>) => {
    try {
      localStorage.setItem('disabledTemplateCategories', JSON.stringify(Array.from(categories)));
    } catch (error) {
      console.error('Failed to save category preferences:', error);
    }
  };

  // 切换分类启用状态
  const toggleCategory = (categoryId: string) => {
    const newDisabled = new Set(disabledCategories);
    if (newDisabled.has(categoryId)) {
      newDisabled.delete(categoryId);
    } else {
      newDisabled.add(categoryId);
    }
    setDisabledCategories(newDisabled);
    saveCategoryPreferences(newDisabled);
  };

  // 启用所有分类
  const enableAllCategories = () => {
    setDisabledCategories(new Set());
    saveCategoryPreferences(new Set());
  };

  // 禁用所有分类
  const disableAllCategories = () => {
    const allCategories = new Set(getTemplateCategories().filter(c => c.id !== 'all').map(c => c.id));
    setDisabledCategories(allCategories);
    saveCategoryPreferences(allCategories);
  };

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, severityFilter, authorFilter, selectedCategory]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await GetAllNucleiTemplates();

      // 将后端数据转换为前端格式
      const transformedTemplates: NucleiTemplate[] = data.map(t => ({
        id: t.id,
        name: t.name || t.id,
        author: t.author || 'unknown',
        severity: (t.severity || 'info') as NucleiTemplate['severity'],
        tags: t.tags || [],
        description: '',
        path: t.path,
        category: t.category || 'other',
        enabled: t.enabled,
      }));

      setTemplates(transformedTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateContent = async (path: string) => {
    try {
      const content = await GetNucleiTemplateContent(path);
      setTemplateContent(content);
    } catch (error) {
      console.error('Failed to load template content:', error);
      setTemplateContent('// 无法加载模板内容');
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // 过滤掉禁用分类的模板
    if (disabledCategories.size > 0) {
      filtered = filtered.filter((t) => {
        const topCategory = t.category.split('/')[0];
        return !disabledCategories.has(topCategory);
      });
    }

    // 分类过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory || t.category.startsWith(selectedCategory + '/'));
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

  // 动态计算模板分类统计
  const getTemplateCategories = (): TemplateCategory[] => {
    const categoryMap = new Map<string, number>();

    // 统计每个分类的模板数量
    templates.forEach(t => {
      const topCategory = t.category.split('/')[0];
      categoryMap.set(topCategory, (categoryMap.get(topCategory) || 0) + 1);
    });

    return [
      { id: 'all', name: '全部模板', count: templates.length, icon: <Layers size={16} /> },
      ...templateCategoryDefs
        .filter(catDef => catDef.id !== 'all')
        .map(catDef => ({
          ...catDef,
          count: categoryMap.get(catDef.id) || 0,
        }))
        .filter(cat => cat.count > 0) // 只显示有模板的分类
    ];
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">POC 模板浏览</h1>
          <p className="text-slate-400 mt-1">浏览和管理 Nuclei 扫描模板库</p>
        </div>
        <div className="flex gap-3">
          <Button
            type="secondary"
            size="sm"
            icon={<Power size={14} />}
            onClick={enableAllCategories}
          >
            启用所有分组
          </Button>
          <Button
            type="secondary"
            size="sm"
            icon={<PowerOff size={14} />}
            onClick={disableAllCategories}
          >
            禁用所有分组
          </Button>
          <Button
            type="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={loadTemplates}
          >
            刷新
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        {getTemplateCategories().map((category) => {
          const isDisabled = category.id !== 'all' && disabledCategories.has(category.id);
          return (
            <div
              key={category.id}
              className={clsx(
                'bg-slate-800/50 border rounded-xl p-4 text-left transition-all relative',
                selectedCategory === category.id
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-700',
                isDisabled ? 'opacity-50' : 'hover:border-sky-500/50 hover:bg-slate-800'
              )}
            >
              <button
                onClick={() => setSelectedCategory(category.id)}
                className="w-full"
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
              {category.id !== 'all' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategory(category.id);
                  }}
                  className={clsx(
                    'absolute top-2 right-2 p-1.5 rounded-lg transition-all',
                    'hover:bg-slate-700',
                    isDisabled
                      ? 'text-slate-500 hover:text-slate-400'
                      : 'text-green-400 hover:text-green-300'
                  )}
                  title={isDisabled ? '启用此分组' : '禁用此分组'}
                >
                  {isDisabled ? <PowerOff size={14} /> : <Power size={14} />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 分组状态提示 */}
      {disabledCategories.size > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PowerOff size={20} className="text-yellow-400" />
            <div>
              <p className="text-sm font-medium text-yellow-200">
                已禁用 {disabledCategories.size} 个分组
              </p>
              <p className="text-xs text-yellow-400/70">
                这些分组的模板将不会出现在扫描结果中
              </p>
            </div>
          </div>
          <Button
            type="secondary"
            size="sm"
            icon={<Power size={14} />}
            onClick={enableAllCategories}
          >
            启用所有
          </Button>
        </div>
      )}

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
                    分类
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
                          {template.name}
                        </div>
                        <div className="text-xs text-slate-500">{template.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{template.category}</td>
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
                      {template.enabled ? (
                        <div className="flex items-center text-green-400 text-sm">
                          <CheckCircle size={14} className="mr-1" />
                          已启用
                        </div>
                      ) : (
                        <div className="flex items-center text-slate-500 text-sm">
                          <XCircle size={14} className="mr-1" />
                          未启用
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="ghost"
                          size="sm"
                          icon={<Eye size={14} />}
                          onClick={() => {
                            setSelectedTemplate(template);
                            loadTemplateContent(template.path);
                          }}
                        >
                          查看
                        </Button>
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
          onClose={() => {
            setSelectedTemplate(null);
            setTemplateContent('');
          }}
          onConfirm={() => {
            setSelectedTemplate(null);
            setTemplateContent('');
          }}
          confirmText="关闭"
          width="xl"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-200">
                  {selectedTemplate.name}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">作者</label>
                <p className="text-sm text-slate-200">{selectedTemplate.author}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">分类</label>
                <p className="text-sm text-slate-200">{selectedTemplate.category}</p>
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
                {selectedTemplate.tags.length > 0 ? selectedTemplate.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-slate-700 text-slate-300"
                  >
                    <Tag size={12} className="mr-1" />
                    {tag}
                  </span>
                )) : (
                  <span className="text-sm text-slate-500">无标签</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">模板内容 (YAML)</label>
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                  {templateContent || '加载中...'}
                </pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
