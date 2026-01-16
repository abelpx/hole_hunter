/**
 * 模板管理页面
 * 管理扫描模板，支持分组管理和启用/禁用
 * 优化版本：使用 React.memo、预计算样式、骨架屏
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Layers,
  Search,
  RefreshCw,
  FileCode,
  Tag,
  Eye,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { Button, Input, Select, Modal } from '../components/ui';
import clsx from 'clsx';
import {
  GetAllTemplates,
  GetTemplatesByCategory,
  GetTemplatesBySeverity,
  GetTemplateByID,
  GetAllScenarioGroups,
  CreateScenarioGroup,
  UpdateScenarioGroup,
  DeleteScenarioGroup,
  AddTemplatesToScenarioGroup,
  RemoveTemplatesFromScenarioGroup,
  GetTemplatesPageByFilter,
  GetTemplateStats,
} from '@wailsjs/go/app/App';
import { models } from '@wailsjs/go/models';
import {
  transformTemplates,
  NucleiTemplate,
} from './templates/templateUtils';
import { TemplateRow, TemplateTableSkeleton } from './templates';

interface TemplateCategory {
  id: string;
  name: string;
  count: number;
  icon: React.ReactNode;
}

interface ScenarioGroup {
  id: string;
  name: string;
  description: string;
  templateIds: string[];
  createdAt: number;
  updatedAt: number;
}

// 模板分类定义
const templateCategoryDefs: Omit<TemplateCategory, 'count'>[] = [
  { id: 'all', name: '全部模板', icon: <Layers size={16} /> },
  { id: 'cves', name: 'CVE 漏洞', icon: <Eye size={16} /> },
  { id: 'vulnerabilities', name: '通用漏洞', icon: <Eye size={16} /> },
  { id: 'exposures', name: '信息泄露', icon: <Eye size={16} /> },
  { id: 'technologies', name: '技术检测', icon: <Tag size={16} /> },
  { id: 'misconfiguration', name: '配置错误', icon: <Eye size={16} /> },
  { id: 'network', name: '网络', icon: <Eye size={16} /> },
  { id: 'file', name: '文件', icon: <FileCode size={16} /> },
  { id: 'workflows', name: '工作流', icon: <Eye size={16} /> },
];

export const TemplatesPage: React.FC = () => {
  // 视图模式：'templates' | 'scenarios'
  const [viewMode, setViewMode] = useState<'templates' | 'scenarios'>('templates');

  // 分页状态
  const [templates, setTemplates] = useState<NucleiTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<NucleiTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [categoryStats, setCategoryStats] = useState<Map<string, number>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<NucleiTemplate | null>(null);
  const [templateContent, setTemplateContent] = useState<string>('');

  // 过滤条件 - 使用 useRef 避免触发重渲染
  const searchQueryRef = useRef('');
  const severityFilterRef = useRef('all');
  const authorFilterRef = useRef('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');

  // 分组管理状态
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set());

  // 场景分组状态
  const [scenarioGroups, setScenarioGroups] = useState<ScenarioGroup[]>([]);
  const [editingScenarioGroup, setEditingScenarioGroup] = useState<ScenarioGroup | null>(null);
  const [showCreateScenarioModal, setShowCreateScenarioModal] = useState(false);
  const [selectedScenarioGroupId, setSelectedScenarioGroupId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
    loadCategoryPreferences();
    loadScenarioGroups();
  }, []);

  // 当分页或过滤条件变化时重新加载
  useEffect(() => {
    if (!initialLoading) {
      loadTemplates();
    }
  }, [currentPage, selectedCategory]);

  // 当搜索或严重程度过滤变化时重新加载
  const debouncedSearch = useMemo(() => {
    let timer: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        searchQueryRef.current = query;
        setCurrentPage(1);
        if (!initialLoading) {
          loadTemplates();
        }
      }, 300);
    };
  }, [initialLoading]);

  // 使用防抖处理搜索
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // 只在前端过滤禁用分类
  useEffect(() => {
    filterTemplates();
  }, [templates, disabledCategories]);

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
    const allCategories = new Set(templateCategories.filter(c => c.id !== 'all').map(c => c.id));
    setDisabledCategories(allCategories);
    saveCategoryPreferences(allCategories);
  };

  // ============ 场景分组管理 ============

  const loadScenarioGroups = async () => {
    try {
      const groups = await GetAllScenarioGroups();
      setScenarioGroups(groups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description || '',
        templateIds: g.template_ids || [],
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      })));
    } catch (error) {
      console.error('Failed to load scenario groups:', error);
    }
  };

  const handleCreateScenarioGroup = async (name: string, description: string) => {
    try {
      const id = `scenario_${Date.now()}`;
      await CreateScenarioGroup(id, name, description, []);
      await loadScenarioGroups();
      setShowCreateScenarioModal(false);
    } catch (error) {
      console.error('Failed to create scenario group:', error);
      throw error;
    }
  };

  const handleUpdateScenarioGroup = async (id: string, name: string, description: string, templateIds: string[]) => {
    try {
      await UpdateScenarioGroup(id, name, description ? description : null, templateIds);
      await loadScenarioGroups();
    } catch (error) {
      console.error('Failed to update scenario group:', error);
      throw error;
    }
  };

  const handleDeleteScenarioGroup = async (id: string) => {
    try {
      await DeleteScenarioGroup(id);
      await loadScenarioGroups();
    } catch (error) {
      console.error('Failed to delete scenario group:', error);
      throw error;
    }
  };

  // ============ 模板数据加载 ============

  // 监听严重度过滤变化
  useEffect(() => {
    severityFilterRef.current = severityFilter;
    setCurrentPage(1);
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severityFilter]);

  // 监听作者过滤变化
  useEffect(() => {
    authorFilterRef.current = authorFilter;
    setCurrentPage(1);
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorFilter]);

  const loadTemplates = useCallback(async () => {
    try {
      if (initialLoading) {
        setInitialLoading(true);
      } else {
        setLoading(true);
      }

      const currentSearch = searchQueryRef.current;
      const currentSeverity = severityFilterRef.current;

      const filter = new models.TemplateFilter();
      filter.category = selectedCategory;
      filter.search = currentSearch;
      filter.severity = currentSeverity;
      filter.author = authorFilterRef.current;

      const [result, totalCount] = await GetTemplatesPageByFilter(filter, currentPage, pageSize);
      const paginatedTemplates = transformTemplates(result);

      setTemplates(paginatedTemplates);
      setTotal(totalCount);
      setFilteredTotal(totalCount);

      if (initialLoading) {
        loadStats();
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [currentPage, pageSize, selectedCategory, initialLoading]);

  const loadStats = useCallback(async () => {
    try {
      const categoryCounts = await GetTemplateStats();
      setCategoryStats(new Map(Object.entries(categoryCounts)));
    } catch (error) {
      console.error('Failed to load template stats:', error);
    }
  }, []);

  const filterTemplates = () => {
    let filtered = [...templates];

    if (disabledCategories.size > 0) {
      filtered = filtered.filter((t) => {
        const topCategory = t.category.split('/')[0];
        return !disabledCategories.has(topCategory);
      });
    }

    setFilteredTemplates(filtered);
  };

  const loadTemplateContent = async (path: string) => {
    setTemplateContent('// 模板内容查看功能暂未实现');
  };

  // 缓存作者列表
  const uniqueAuthors = useMemo(() => {
    const authors = new Set(templates.map((t) => t.author));
    return Array.from(authors).sort();
  }, [templates]);

  // 缓存模板分类
  const templateCategories = useMemo((): TemplateCategory[] => {
    return [
      { id: 'all', name: '全部模板', count: total, icon: <Layers size={16} /> },
      ...templateCategoryDefs
        .filter(catDef => catDef.id !== 'all')
        .map(catDef => ({
          ...catDef,
          count: categoryStats.get(catDef.id) || 0,
        }))
        .filter(cat => cat.count > 0)
    ];
  }, [total, categoryStats]);

  // 处理查看模板详情
  const handleViewTemplate = useCallback((template: NucleiTemplate) => {
    setSelectedTemplate(template);
    loadTemplateContent(template.path);
  }, []);

  return (
    <div className="space-y-6">
      {/* 页面标题和视图切换 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">POC 模板浏览</h1>
          <p className="text-slate-400 mt-1">浏览和管理扫描模板库</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('templates')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              viewMode === 'templates'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:bg-slate-700'
            )}
          >
            <Layers size={16} />
            模板浏览
          </button>
          <button
            onClick={() => setViewMode('scenarios')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              viewMode === 'scenarios'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:bg-slate-700'
            )}
          >
            <FolderOpen size={16} />
            场景分组
          </button>
        </div>
      </div>

      {/* 场景分组视图 */}
      {viewMode === 'scenarios' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-200">我的场景分组</h2>
              <p className="text-sm text-slate-400 mt-1">创建自定义 POC 分组，按场景管理扫描模板</p>
            </div>
            <Button
              type="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowCreateScenarioModal(true)}
            >
              创建分组
            </Button>
          </div>

          {scenarioGroups.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <FolderOpen size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 mb-2">还没有创建场景分组</p>
              <p className="text-sm text-slate-500 mb-4">
                场景分组可以帮助你按具体用途组织 POC，如"登录接口检测"、"支付接口检测"等
              </p>
              <Button
                type="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => setShowCreateScenarioModal(true)}
              >
                创建第一个分组
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarioGroups.map((group) => (
                <div
                  key={group.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-sky-500/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-200 mb-1">{group.name}</h3>
                      <p className="text-sm text-slate-400 line-clamp-2">{group.description || '暂无描述'}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="ghost"
                        size="sm"
                        icon={<Eye size={14} />}
                        onClick={() => setSelectedScenarioGroupId(group.id)}
                        title="查看 POC"
                      />
                      <Button
                        type="ghost"
                        size="sm"
                        icon={<FolderOpen size={14} />}
                        onClick={() => setEditingScenarioGroup(group)}
                        title="编辑分组"
                      />
                      <Button
                        type="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`确定要删除场景分组"${group.name}"吗？`)) {
                            handleDeleteScenarioGroup(group.id);
                          }
                        }}
                        title="删除分组"
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Tag size={14} className="text-slate-400" />
                      <span className="text-slate-400">POC 数量：</span>
                      <span className="font-medium text-slate-200">{group.templateIds.length}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 模板浏览视图 */}
      {viewMode === 'templates' && (
        <>
          {/* 禁用分组提示栏 */}
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

          {/* 操作栏 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-200">模板分类</h2>
              <p className="text-sm text-slate-400 mt-1">按分类浏览和管理 POC 模板</p>
            </div>
            <div className="flex gap-3">
              <Button
                type="secondary"
                size="sm"
                icon={<Power size={14} />}
                onClick={enableAllCategories}
              >
                启用所有
              </Button>
              <Button
                type="secondary"
                size="sm"
                icon={<PowerOff size={14} />}
                onClick={disableAllCategories}
              >
                禁用所有
              </Button>
              <Button
                type="secondary"
                size="sm"
                icon={<RefreshCw size={14} />}
                onClick={() => {
                  setCurrentPage(1);
                  loadTemplates();
                }}
                disabled={loading}
              >
                刷新
              </Button>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {templateCategories.map((category) => {
              const isDisabled = category.id !== 'all' && disabledCategories.has(category.id);
              return (
                <div
                  key={category.id}
                  className={clsx(
                    'bg-slate-800/50 border rounded-xl p-4 text-left transition-all relative min-w-[160px]',
                    selectedCategory === category.id
                      ? 'border-sky-500 bg-sky-500/10'
                      : 'border-slate-700',
                    isDisabled ? 'opacity-50' : 'hover:border-sky-500/50 hover:bg-slate-800'
                  )}
                >
                  <button
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setCurrentPage(1);
                    }}
                    className="w-full pr-8"
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

          {/* 过滤和搜索 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-2.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-[200px] relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="搜索模板名称、ID、标签..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm h-9"
                />
              </div>

              <Select
                placeholder="等级"
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'critical', label: '严重' },
                  { value: 'high', label: '高危' },
                  { value: 'medium', label: '中危' },
                  { value: 'low', label: '低危' },
                  { value: 'info', label: '信息' },
                ]}
                value={severityFilter}
                onChange={setSeverityFilter}
                size="sm"
                className="w-24 flex-shrink-0"
              />

              <Select
                placeholder="作者"
                options={[
                  { value: 'all', label: '全部作者' },
                  ...uniqueAuthors.map((author) => ({ value: author, label: author })),
                ]}
                value={authorFilter}
                onChange={setAuthorFilter}
                size="sm"
                className="w-32 flex-shrink-0"
              />
            </div>
          </div>

          {/* 模板列表 */}
          {initialLoading ? (
            <TemplateTableSkeleton />
          ) : filteredTemplates.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
              <FileCode size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 mb-4">
                {searchQuery || severityFilter !== 'all' || authorFilter !== 'all'
                  ? '没有找到符合条件的模板'
                  : '暂无模板'}
              </p>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              {loading && <TemplateTableSkeleton />}
              {!loading && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '9%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '12%' }} />
                      </colgroup>
                      <thead className="bg-slate-900/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            模板名称
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            分类
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            作者
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            严重程度
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            漏洞描述
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            标签
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            状态
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {filteredTemplates.map((template) => (
                          <TemplateRow
                            key={template.id}
                            template={template}
                            onView={handleViewTemplate}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 分页控件 */}
                  {filteredTotal > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-900/30 border-t border-slate-700">
                      <div className="text-sm text-slate-400">
                        显示第 {Math.min((currentPage - 1) * pageSize + 1, filteredTotal)} - {Math.min(currentPage * pageSize, filteredTotal)} 条，共 {filteredTotal} 条
                        {filteredTotal !== total && <span className="ml-2 text-slate-500">（总计 {total} 条）</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="ghost"
                          size="sm"
                          icon={<ChevronLeft size={16} />}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1 || loading}
                        >
                          上一页
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, Math.ceil(filteredTotal / pageSize)) }, (_, i) => {
                            let pageNum;
                            const totalPages = Math.ceil(filteredTotal / pageSize);
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={clsx(
                                  'min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors',
                                  currentPage === pageNum
                                    ? 'bg-sky-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-700'
                                )}
                                disabled={loading}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <Button
                          type="ghost"
                          size="sm"
                          icon={<ChevronRight size={16} />}
                          onClick={() => setCurrentPage(p => p + 1)}
                          disabled={currentPage * pageSize >= filteredTotal || loading}
                        >
                          下一页
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

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

            {selectedTemplate.description && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">描述</label>
                <p className="text-sm text-slate-300">{selectedTemplate.description}</p>
              </div>
            )}

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

      {/* 创建场景分组模态框 */}
      {showCreateScenarioModal && (
        <Modal
          visible={showCreateScenarioModal}
          title="创建场景分组"
          onClose={() => setShowCreateScenarioModal(false)}
          onConfirm={async () => {
            const nameInput = document.getElementById('scenario-name') as HTMLInputElement;
            const descInput = document.getElementById('scenario-description') as HTMLInputElement;
            if (nameInput?.value) {
              await handleCreateScenarioGroup(nameInput.value, descInput?.value || '');
            }
          }}
          confirmText="创建"
          width="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                分组名称 <span className="text-red-400">*</span>
              </label>
              <Input
                id="scenario-name"
                placeholder="例如：登录接口检测、支付接口检测"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                描述
              </label>
              <Input
                id="scenario-description"
                placeholder="描述该场景分组的用途"
                className="w-full"
              />
            </div>
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-3">
              <p className="text-sm text-sky-300">
                <FolderOpen size={14} className="inline mr-1" />
                创建后可以在分组中添加 POC 模板
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* 编辑场景分组模态框 */}
      {editingScenarioGroup && (
        <Modal
          visible={!!editingScenarioGroup}
          title="编辑场景分组"
          onClose={() => setEditingScenarioGroup(null)}
          onConfirm={async () => {
            const nameInput = document.getElementById('edit-scenario-name') as HTMLInputElement;
            const descInput = document.getElementById('edit-scenario-description') as HTMLInputElement;
            if (nameInput?.value && editingScenarioGroup) {
              await handleUpdateScenarioGroup(
                editingScenarioGroup.id,
                nameInput.value,
                descInput?.value || '',
                editingScenarioGroup.templateIds
              );
              setEditingScenarioGroup(null);
            }
          }}
          confirmText="保存"
          width="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                分组名称 <span className="text-red-400">*</span>
              </label>
              <Input
                id="edit-scenario-name"
                defaultValue={editingScenarioGroup.name}
                placeholder="例如：登录接口检测、支付接口检测"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                描述
              </label>
              <Input
                id="edit-scenario-description"
                defaultValue={editingScenarioGroup.description}
                placeholder="描述该场景分组的用途"
                className="w-full"
              />
            </div>
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
              <p className="text-sm text-slate-300">
                <Tag size={14} className="inline mr-1" />
                当前包含 {editingScenarioGroup.templateIds.length} 个 POC 模板
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
