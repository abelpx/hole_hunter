/**
 * PoC 管理页面
 * 统一管理内置 POC 和自定义 POC，支持场景管理统一选择
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  FileCode,
  Plus,
  Eye,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  X,
  Save,
  Layers,
  AlertCircle,
  Tag,
  Code,
} from 'lucide-react';
import { Button, Input, Badge } from '../components/ui';
import { YamlEditor } from '../components/special/YamlEditor';
import { motion } from 'framer-motion';
import {
  GetAllTemplates,
  GetTemplatesByCategory,
  GetTemplatesBySeverity,
} from '@wailsjs/go/app/App';
import { TemplateFilter } from '@wailsjs/go/app/models';
import { getService } from '../services/WailsService';

// 统一的 PoC 类型，包含来源标识
interface UnifiedPoC {
  id: string; // 统一使用字符串 ID
  name: string;
  author?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  tags?: string[];
  description?: string;
  path: string;
  category?: string;
  enabled: boolean;
  source: 'builtin' | 'custom'; // 来源标识
  impact?: string;
  remediation?: string;
  reference?: string[];
  metadata?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
  content?: string; // 自定义 PoC 的内容
}

interface TemplateCategory {
  id: string;
  name: string;
  count: number;
  icon: React.ReactNode;
}

const templateCategoryDefs: Omit<TemplateCategory, 'count'>[] = [
  { id: 'all', name: '全部', icon: <Layers size={16} /> },
  { id: 'cves', name: 'CVE 漏洞', icon: <AlertCircle size={16} /> },
  { id: 'vulnerabilities', name: '通用漏洞', icon: <AlertCircle size={16} /> },
  { id: 'exposures', name: '信息泄露', icon: <Eye size={16} /> },
  { id: 'technologies', name: '技术检测', icon: <Tag size={16} /> },
  { id: 'misconfiguration', name: '配置错误', icon: <AlertCircle size={16} /> },
  { id: 'custom', name: '自定义', icon: <Code size={16} /> },
];

export const PoCPage: React.FC = () => {
  // 统一的 PoC 列表
  const [allPocs, setAllPocs] = useState<UnifiedPoC[]>([]);
  const [filteredPocs, setFilteredPocs] = useState<UnifiedPoC[]>([]);
  const [loading, setLoading] = useState(false);

  // 过滤条件
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'builtin' | 'custom'>('all');

  // 统计信息
  const [stats, setStats] = useState({
    total: 0,
    builtin: 0,
    custom: 0,
    enabled: 0,
    disabled: 0,
  });

  // 编辑器状态
  const [showEditor, setShowEditor] = useState(false);
  const [editingPoc, setEditingPoc] = useState<UnifiedPoC | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [pocName, setPocName] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [saving, setSaving] = useState(false);

  // 预览状态
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  useEffect(() => {
    loadAllPocs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allPocs, searchQuery, categoryFilter, severityFilter, sourceFilter]);

  const loadAllPocs = async () => {
    setLoading(true);
    try {
      // 并行加载内置和自定义 PoC
      const [builtinData, customData] = await Promise.all([
        loadBuiltinPocs(),
        loadCustomPocs(),
      ]);

      // 合并为统一列表
      const unified: UnifiedPoC[] = [
        ...builtinData.map((poc) => ({ ...poc, source: 'builtin' as const })),
        ...customData.map((poc) => ({
          ...poc,
          source: 'custom' as const,
          id: `custom-${poc.id}`,
        })),
      ];

      setAllPocs(unified);
      updateStats(unified);
    } catch (error) {
      console.error('Failed to load PoCs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBuiltinPocs = async () => {
    try {
      let templates;
      if (categoryFilter === 'all' && sourceFilter !== 'custom') {
        templates = await GetAllTemplates();
      } else if (severityFilter !== 'all') {
        const filter = TemplateFilter({ severity: severityFilter });
        templates = await GetTemplatesBySeverity(filter);
      } else if (categoryFilter !== 'all' && categoryFilter !== 'custom') {
        const filter = TemplateFilter({ category: categoryFilter });
        templates = await GetTemplatesByCategory(filter);
      } else {
        templates = await GetAllTemplates();
      }
      return templates;
    } catch (error) {
      console.error('Failed to load builtin PoCs:', error);
      return [];
    }
  };

  const loadCustomPocs = async () => {
    try {
      const service = getService();
      return await service.getAllCustomTemplates();
    } catch (error) {
      console.error('Failed to load custom PoCs:', error);
      return [];
    }
  };

  const updateStats = (pocs: UnifiedPoC[]) => {
    setStats({
      total: pocs.length,
      builtin: pocs.filter((p) => p.source === 'builtin').length,
      custom: pocs.filter((p) => p.source === 'custom').length,
      enabled: pocs.filter((p) => p.enabled).length,
      disabled: pocs.filter((p) => !p.enabled).length,
    });
  };

  const applyFilters = () => {
    let filtered = [...allPocs];

    // 来源过滤
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((p) => p.source === sourceFilter);
    }

    // 分类过滤
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'custom') {
        filtered = filtered.filter((p) => p.source === 'custom');
      } else {
        filtered = filtered.filter(
          (p) => p.source === 'builtin' && p.category === categoryFilter
        );
      }
    }

    // 严重等级过滤
    if (severityFilter !== 'all') {
      filtered = filtered.filter((p) => p.severity === severityFilter);
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredPocs(filtered);
  };

  // 创建自定义 PoC
  const handleCreateCustom = () => {
    setEditingPoc(null);
    setPocName('');
    setEditorContent('');
    setIsValid(false);
    setShowEditor(true);
  };

  // 编辑 PoC（仅支持自定义）
  const handleEdit = async (poc: UnifiedPoC) => {
    if (poc.source !== 'custom') {
      alert('内置 PoC 不支持编辑，请创建自定义副本');
      return;
    }

    try {
      const service = getService();
      const originalId = parseInt(poc.id.replace('custom-', ''));
      const fullTemplate = await service.getCustomTemplateById(originalId);
      setEditingPoc(poc);
      setPocName(fullTemplate.name);
      setEditorContent(fullTemplate.content || '');
      setIsValid(false);
      setShowEditor(true);
    } catch (error) {
      console.error('Failed to load PoC:', error);
    }
  };

  // 预览 PoC
  const handlePreview = async (poc: UnifiedPoC) => {
    try {
      if (poc.source === 'custom' && poc.content) {
        setPreviewContent(poc.content);
      } else if (poc.source === 'custom') {
        const service = getService();
        const originalId = parseInt(poc.id.replace('custom-', ''));
        const fullTemplate = await service.getCustomTemplateById(originalId);
        setPreviewContent(fullTemplate.content || '');
      } else {
        // 内置 PoC 显示路径信息
        setPreviewContent(`ID: ${poc.id}\n路径: ${poc.path}\n分类: ${poc.category}\n作者: ${poc.author || '未知'}\n\n描述:\n${poc.description || '无'}`);
      }
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to preview PoC:', error);
    }
  };

  // 删除 PoC（仅支持自定义）
  const handleDelete = async (poc: UnifiedPoC) => {
    if (poc.source !== 'custom') {
      alert('内置 PoC 不支持删除');
      return;
    }

    if (!confirm('确定要删除这个 PoC 吗？')) return;

    try {
      const service = getService();
      const originalId = parseInt(poc.id.replace('custom-', ''));
      await service.deleteCustomTemplate(originalId);
      await loadAllPocs();
    } catch (error) {
      console.error('Failed to delete PoC:', error);
      alert('删除失败');
    }
  };

  // 切换启用状态
  const handleToggle = async (poc: UnifiedPoC) => {
    try {
      if (poc.source === 'custom') {
        const service = getService();
        const originalId = parseInt(poc.id.replace('custom-', ''));
        await service.toggleCustomTemplate(originalId, !poc.enabled);
      }
      // 内置 PoC 的状态切换需要后端支持，这里暂时只处理自定义
      await loadAllPocs();
    } catch (error) {
      console.error('Failed to toggle PoC:', error);
    }
  };

  // 保存 PoC
  const handleSave = async () => {
    setSaving(true);
    try {
      const service = getService();

      if (editingPoc) {
        const originalId = parseInt(editingPoc.id.replace('custom-', ''));
        await service.updateCustomTemplate(originalId, pocName, editorContent);
      } else {
        await service.createCustomTemplate(pocName, editorContent);
      }

      await loadAllPocs();
      setShowEditor(false);
      setEditingPoc(null);
    } catch (error) {
      console.error('Failed to save PoC:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const getSeverityColor = (severity?: string) => {
    if (!severity) return 'text-slate-400 bg-slate-400/10';
    const colors = {
      critical: 'text-red-400 bg-red-400/10',
      high: 'text-orange-400 bg-orange-400/10',
      medium: 'text-yellow-400 bg-yellow-400/10',
      low: 'text-blue-400 bg-blue-400/10',
      info: 'text-slate-400 bg-slate-400/10',
    };
    return colors[severity as keyof typeof colors] || colors.info;
  };

  const getSeverityLabel = (severity?: string) => {
    if (!severity) return '-';
    const labels = {
      critical: '严重',
      high: '高危',
      medium: '中危',
      low: '低危',
      info: '信息',
    };
    return labels[severity as keyof typeof labels] || '信息';
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">PoC 管理</h1>
          <p className="text-slate-400 mt-1">管理内置和自定义漏洞检测 PoC</p>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={handleCreateCustom}
        >
          新建 PoC
        </Button>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400">总计</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{stats.total}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400">内置</div>
          <div className="text-2xl font-bold text-sky-400 mt-1">{stats.builtin}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400">自定义</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{stats.custom}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400">已启用</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.enabled}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400">已禁用</div>
          <div className="text-2xl font-bold text-slate-400 mt-1">{stats.disabled}</div>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="搜索 PoC 名称、ID、标签或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<Search size={16} />}
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
        >
          <option value="all">全部来源</option>
          <option value="builtin">内置 PoC</option>
          <option value="custom">自定义 PoC</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
        >
          {templateCategoryDefs.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
        >
          <option value="all">全部等级</option>
          <option value="critical">严重</option>
          <option value="high">高危</option>
          <option value="medium">中危</option>
          <option value="low">低危</option>
          <option value="info">信息</option>
        </select>
        <Button
          type="secondary"
          icon={<RefreshCw size={16} />}
          onClick={loadAllPocs}
        >
          刷新
        </Button>
      </div>

      {/* PoC 列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">加载中...</div>
        </div>
      ) : filteredPocs.length === 0 ? (
        <div className="text-center py-12">
          <FileCode size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">未找到匹配的 PoC</p>
          <p className="text-slate-600 text-sm mt-2">尝试调整过滤条件或创建新的自定义 PoC</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredPocs.map((poc) => (
            <motion.div
              key={poc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* 启用/禁用开关 */}
                  <button
                    onClick={() => handleToggle(poc)}
                    className="text-slate-400 hover:text-slate-200 transition-colors mt-1"
                  >
                    {poc.enabled ? (
                      <ToggleRight size={24} className="text-emerald-400" />
                    ) : (
                      <ToggleLeft size={24} className="text-slate-500" />
                    )}
                  </button>

                  {/* PoC 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-slate-100 truncate">
                        {poc.name}
                      </h3>
                      {/* 来源标识 */}
                      <Badge
                        variant={poc.source === 'builtin' ? 'info' : 'success'}
                        className="text-xs"
                      >
                        {poc.source === 'builtin' ? '内置' : '自定义'}
                      </Badge>
                      {/* 严重等级 */}
                      {poc.severity && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(
                            poc.severity
                          )}`}
                        >
                          {getSeverityLabel(poc.severity)}
                        </span>
                      )}
                      {/* 启用状态 */}
                      {poc.enabled ? (
                        <Badge variant="success" className="text-xs">已启用</Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">已禁用</Badge>
                      )}
                    </div>

                    <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                      {poc.description || '暂无描述'}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span>ID: {poc.id}</span>
                      {poc.author && (
                        <>
                          <span className="text-slate-700">•</span>
                          <span>{poc.author}</span>
                        </>
                      )}
                      {poc.category && (
                        <>
                          <span className="text-slate-700">•</span>
                          <span>{poc.category}</span>
                        </>
                      )}
                      {poc.path && (
                        <>
                          <span className="text-slate-700">•</span>
                          <span className="truncate max-w-xs">{poc.path}</span>
                        </>
                      )}
                      {poc.created_at && (
                        <>
                          <span className="text-slate-700">•</span>
                          <span>创建于 {new Date(poc.created_at).toLocaleString('zh-CN')}</span>
                        </>
                      )}
                    </div>

                    {/* 标签 */}
                    {poc.tags && poc.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {poc.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {poc.tags.length > 5 && (
                          <span className="text-xs text-slate-500">
                            +{poc.tags.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                  <Button
                    type="default"
                    size="sm"
                    icon={<Eye size={14} />}
                    onClick={() => handlePreview(poc)}
                  >
                    预览
                  </Button>
                  {poc.source === 'custom' && (
                    <>
                      <Button
                        type="default"
                        size="sm"
                        icon={<Edit size={14} />}
                        onClick={() => handleEdit(poc)}
                      >
                        编辑
                      </Button>
                      <Button
                        type="danger"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => handleDelete(poc)}
                      >
                        删除
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 编辑器模态框 */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-xl w-[90vw] h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex-1">
                <input
                  type="text"
                  value={pocName}
                  onChange={(e) => setPocName(e.target.value)}
                  placeholder="PoC 名称"
                  className="w-full bg-transparent text-xl font-semibold text-slate-100 placeholder-slate-500 focus:outline-none"
                />
                <p className="text-sm text-slate-500 mt-1">
                  {editingPoc ? '编辑自定义 PoC' : '新建自定义 PoC'}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {isValid && (
                  <div className="flex items-center gap-1 text-emerald-400 text-sm">
                    <CheckCircle2 size={16} />
                    <span>已验证</span>
                  </div>
                )}
                <Button
                  type="primary"
                  icon={<Save size={14} />}
                  onClick={handleSave}
                  disabled={saving || !pocName || !editorContent}
                >
                  {saving ? '保存中...' : '保存'}
                </Button>
                <Button
                  type="default"
                  icon={<X size={14} />}
                  onClick={() => setShowEditor(false)}
                >
                  关闭
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <YamlEditor
                value={editorContent}
                onChange={setEditorContent}
                onValidate={(valid) => setIsValid(valid)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 预览模态框 */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-xl w-[90vw] h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-slate-100">PoC 预览</h2>
              <Button
                type="default"
                icon={<X size={14} />}
                onClick={() => setShowPreview(false)}
              >
                关闭
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                {previewContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
