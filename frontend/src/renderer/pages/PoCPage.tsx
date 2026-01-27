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
  FileText,
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
  Shield,
  Copy,
} from 'lucide-react';
import { Button, Input, Badge } from '../components/ui';
import { YamlEditor } from '../components/special/YamlEditor';
import { motion } from 'framer-motion';
import {
  GetTemplatesPage,
  GetTemplatesPageByFilter,
  GetTemplateStats,
  GetTemplateByID,
  CreateCustomTemplate,
  UpdateCustomTemplate,
  DeleteCustomTemplate,
  ToggleCustomTemplate,
} from '@wailsjs/go/app/App';
import { models } from '@wailsjs/go/models';

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
  // PoC 列表
  const [displayPocs, setDisplayPocs] = useState<UnifiedPoC[]>([]);
  const [loading, setLoading] = useState(false);
  const [builtinTotal, setBuiltinTotal] = useState(0);
  const [customTotal, setCustomTotal] = useState(0);
  const [currentTotal, setCurrentTotal] = useState(0); // 当前筛选条件下的总数

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // 过滤条件
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'builtin' | 'custom'>('all');

  // 统计信息
  const [stats, setStats] = useState({
    builtin: 0,
    custom: 0,
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
  const [previewPoc, setPreviewPoc] = useState<UnifiedPoC | null>(null);

  // 标记是否为初始加载
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 初始加载
  useEffect(() => {
    loadStats();
    loadPocs();
    setIsInitialLoad(false);
  }, []);

  // 当过滤条件或分页变化时重新加载
  useEffect(() => {
    if (isInitialLoad) return;

    if (currentPage === 1) {
      loadPocs();
    } else {
      setCurrentPage(1);
    }
  }, [searchQuery, categoryFilter, severityFilter, sourceFilter]);

  // 页码变化时加载
  useEffect(() => {
    if (isInitialLoad) return;
    if (currentPage > 1) {
      loadPocs();
    }
  }, [currentPage]);

  const loadStats = async () => {
    // 检查 Wails 运行时是否可用
    const windowGo = (window as any).go;
    if (!windowGo || !windowGo.app || !windowGo.app.App) {
      console.warn('[PoCPage] Wails runtime not available (running in browser mode), skipping stats load');
      setStats({ builtin: 0, custom: 0 });
      return;
    }

    try {
      const stats = await GetTemplateStats();
      // stats 包含分类统计和严重程度统计
      // 通过 source 过滤来获取 builtin 和 custom 的数量
      const builtinFilter = models.TemplateFilterUnified.createFrom({
        page: 1,
        pageSize: 1,
        source: 'builtin',
        category: '',
        search: '',
        severity: '',
        author: '',
        enabled: true
      });

      const builtinResponse = await GetTemplatesPageByFilter(builtinFilter, 1, 1);
      if (!builtinResponse) {
        console.warn('[PoCPage] GetTemplatesPageByFilter did not return a valid response for builtin');
        setStats({ builtin: 0, custom: 0 });
        return;
      }

      const customFilter = models.TemplateFilterUnified.createFrom({
        page: 1,
        pageSize: 1,
        source: 'custom',
        category: '',
        search: '',
        severity: '',
        author: '',
        enabled: true
      });

      const customResponse = await GetTemplatesPageByFilter(customFilter, 1, 1);
      if (!customResponse) {
        console.warn('[PoCPage] GetTemplatesPageByFilter did not return a valid response for custom');
        setStats({ builtin: builtinResponse.total || 0, custom: 0 });
        return;
      }

      setStats({
        builtin: builtinResponse.total || 0,
        custom: customResponse.total || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats({ builtin: 0, custom: 0 });
    }
  };

  const loadPocs = async () => {
    console.log('[PoCPage] loadPocs called');

    // 检查 Wails 运行时是否可用
    const windowGo = (window as any).go;
    if (!windowGo || !windowGo.app || !windowGo.app.App) {
      console.warn('[PoCPage] Wails runtime not available (running in browser mode), returning empty result');
      setDisplayPocs([]);
      setCurrentTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // GetTemplatesPage 现在返回 TemplatePageResponse 对象
      console.log('[PoCPage] 测试 GetTemplatesPage');

      const response = await GetTemplatesPage(currentPage, pageSize);

      console.log('[PoCPage] GetTemplatesPage response:', response, 'Type:', typeof response);

      // 检查响应是否有效
      if (!response || !response.templates) {
        console.warn('[PoCPage] GetTemplatesPage did not return a valid response:', response);
        setDisplayPocs([]);
        setCurrentTotal(0);
        return;
      }

      const templates = response.templates;
      const totalCount = response.total || 0;

      console.log('[PoCPage] Received templates:', templates.length, 'Total:', totalCount);

      const unifiedPocs = (templates || []).map((poc) => ({
        ...poc,
        id: String(poc.id),
        source: (poc.source || 'builtin') as 'builtin' | 'custom',
        severity: (poc.severity || 'info') as UnifiedPoC['severity'],
        enabled: poc.enabled !== false,
      }));

      setDisplayPocs(unifiedPocs);
      setCurrentTotal(totalCount);

      // 更新统计（用于顶部显示）
      // 现在我们可以直接使用 totalCount
      if (sourceFilter === 'builtin') {
        setBuiltinTotal(totalCount);
      } else if (sourceFilter === 'custom') {
        setCustomTotal(totalCount);
      } else {
        // all 模式下，需要分别获取统计
        const builtinFilter = models.TemplateFilterUnified.createFrom({
          page: 1,
          pageSize: 1,
          source: 'builtin',
          category: '',
          search: '',
          severity: '',
          author: '',
          enabled: true
        });

        const builtinResponse = await GetTemplatesPageByFilter(builtinFilter, 1, 1);
        if (builtinResponse) {
          setBuiltinTotal(builtinResponse.total || 0);
        }

        const customFilter = models.TemplateFilterUnified.createFrom({
          page: 1,
          pageSize: 1,
          source: 'custom',
          category: '',
          search: '',
          severity: '',
          author: '',
          enabled: true
        });

        const customResponse = await GetTemplatesPageByFilter(customFilter, 1, 1);
        if (customResponse) {
          setCustomTotal(customResponse.total || 0);
        }
      }
    } catch (error) {
      console.error('Failed to load PoCs:', error);
      setDisplayPocs([]);
    } finally {
      setLoading(false);
    }
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
      // 使用统一 API 获取模板详情
      const templateId = parseInt(poc.id);
      const fullTemplate = await GetTemplateByID(templateId);
      setEditingPoc(poc);
      setPocName(fullTemplate.name || '');
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
      setPreviewPoc(poc);

      if (poc.source === 'custom' && poc.content) {
        setPreviewContent(poc.content);
      } else if (poc.source === 'custom') {
        // 使用统一 API 获取完整内容
        const templateId = parseInt(poc.id);
        const fullTemplate = await GetTemplateByID(templateId);
        setPreviewContent(fullTemplate.content || '');
      } else {
        // 内置 PoC 显示路径信息
        setPreviewContent(`# ${poc.name}

## 基本信息
- **ID**: ${poc.id}
- **模板 ID**: ${poc.template_id || 'N/A'}
- **分类**: ${poc.category || '未分类'}
- **严重程度**: ${poc.severity || '未知'}
- **作者**: ${poc.author || '未知'}

## 描述
${poc.description || '暂无描述'}

## 影响
${poc.impact || '暂无影响说明'}

## 修复建议
${poc.remediation || '暂无修复建议'}

## 路径
\`${poc.path || 'N/A'}\`

## 标签
${poc.tags && poc.tags.length > 0 ? poc.tags.map((tag: string) => `\`${tag}\``).join(', ') : '无'}

## 参考资料
${poc.reference && poc.reference.length > 0 ? poc.reference.map((ref: string) => `- ${ref}`).join('\n') : '无'}

## 元数据
${poc.metadata && Object.keys(poc.metadata).length > 0 ? Object.entries(poc.metadata).map(([k, v]) => `- **${k}**: ${v}`).join('\n') : '无'}

## Nuclei 版本
${poc.nuclei_version || '未知'}`);

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
      const templateId = parseInt(poc.id);
      await DeleteCustomTemplate(templateId);
      await loadPocs();
    } catch (error) {
      console.error('Failed to delete PoC:', error);
      alert('删除失败');
    }
  };

  // 切换启用状态
  const handleToggle = async (poc: UnifiedPoC) => {
    try {
      if (poc.source === 'custom') {
        const templateId = parseInt(poc.id);
        await ToggleCustomTemplate(templateId, !poc.enabled);
      }
      // 内置 PoC 的状态切换需要后端支持，这里暂时只处理自定义
      await loadPocs();
    } catch (error) {
      console.error('Failed to toggle PoC:', error);
    }
  };

  // 保存 PoC
  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingPoc) {
        // 更新现有模板
        const templateId = parseInt(editingPoc.id);
        const req = new models.CreateTemplateRequest();
        req.name = pocName;
        req.content = editorContent;
        await UpdateCustomTemplate(templateId, req);
      } else {
        // 创建新模板
        const req = new models.CreateTemplateRequest();
        req.name = pocName;
        req.content = editorContent;
        req.enabled = true;
        await CreateCustomTemplate(req);
      }

      await loadPocs();
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
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400">内置 PoC 总数</div>
          <div className="text-2xl font-bold text-sky-400 mt-1">{stats.builtin}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400">自定义 PoC 总数</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{stats.custom}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400">当前显示</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{displayPocs.length}</div>
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
          onClick={loadPocs}
        >
          刷新
        </Button>
      </div>

      {/* PoC 列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">加载中...</div>
        </div>
      ) : displayPocs.length === 0 ? (
        <div className="text-center py-12">
          <FileCode size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">未找到匹配的 PoC</p>
          <p className="text-slate-600 text-sm mt-2">尝试调整过滤条件或创建新的自定义 PoC</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {displayPocs.map((poc) => (
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
                    type="secondary"
                    size="sm"
                    icon={<Eye size={14} />}
                    onClick={() => handlePreview(poc)}
                  >
                    预览
                  </Button>
                  {poc.source === 'custom' && (
                    <>
                      <Button
                        type="secondary"
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

      {/* 分页控件 */}
      {currentTotal > pageSize && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-slate-400">
            显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, currentTotal)} / 共 {currentTotal} 条
            {sourceFilter === 'all' && (
              <span className="ml-2">
                (内置: {builtinTotal} | 自定义: {customTotal})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="secondary"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              首页
            </Button>
            <Button
              type="secondary"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            >
              上一页
            </Button>
            <span className="text-sm text-slate-400 px-4">
              第 {currentPage} / {Math.ceil(currentTotal / pageSize)} 页
            </span>
            <Button
              type="secondary"
              size="sm"
              disabled={currentPage >= Math.ceil(currentTotal / pageSize)}
              onClick={() => setCurrentPage(Math.min(Math.ceil(currentTotal / pageSize), currentPage + 1))}
            >
              下一页
            </Button>
            <Button
              type="secondary"
              size="sm"
              disabled={currentPage >= Math.ceil(currentTotal / pageSize)}
              onClick={() => setCurrentPage(Math.ceil(currentTotal / pageSize))}
            >
              末页
            </Button>
          </div>
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
                  type="secondary"
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
      {showPreview && previewPoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-xl w-[95vw] h-[90vh] flex flex-col shadow-2xl">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-center gap-3 flex-1">
                <FileCode size={24} className="text-sky-400" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-100">{previewPoc.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={previewPoc.source === 'builtin' ? 'info' : 'success'}
                      className="text-xs"
                    >
                      {previewPoc.source === 'builtin' ? '内置 PoC' : '自定义 PoC'}
                    </Badge>
                    {previewPoc.severity && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(
                          previewPoc.severity
                        )}`}
                      >
                        {getSeverityLabel(previewPoc.severity)}
                      </span>
                    )}
                    {previewPoc.category && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {previewPoc.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                type="secondary"
                icon={<X size={14} />}
                onClick={() => {
                  setShowPreview(false);
                  setPreviewPoc(null);
                  setPreviewContent('');
                }}
              >
                关闭
              </Button>
            </div>

            {/* 内容区域 - 两列布局 */}
            <div className="flex-1 flex overflow-hidden">
              {/* 左侧 - 元数据面板 */}
              <div className="w-80 border-r border-slate-700 bg-slate-900/30 overflow-y-auto p-4 space-y-4">
                {/* 基本信息 */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <AlertCircle size={14} />
                    基本信息
                  </h3>
                  <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ID:</span>
                      <span className="text-slate-200 font-mono">{previewPoc.id}</span>
                    </div>
                    {previewPoc.template_id && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">模板 ID:</span>
                        <span className="text-slate-200 font-mono text-xs">{previewPoc.template_id}</span>
                      </div>
                    )}
                    {previewPoc.author && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">作者:</span>
                        <span className="text-slate-200">{previewPoc.author}</span>
                      </div>
                    )}
                    {previewPoc.path && (
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400">路径:</span>
                        <span className="text-slate-200 font-mono text-xs break-all">{previewPoc.path}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 描述 */}
                {previewPoc.description && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                      <FileText size={14} />
                      描述
                    </h3>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-sm text-slate-300">
                      {previewPoc.description}
                    </div>
                  </div>
                )}

                {/* 影响和修复 */}
                {(previewPoc.impact || previewPoc.remediation) && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                      <Shield size={14} />
                      影响与修复
                    </h3>
                    <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 text-sm">
                      {previewPoc.impact && (
                        <div>
                          <span className="text-slate-400 block mb-1">影响:</span>
                          <span className="text-slate-300">{previewPoc.impact}</span>
                        </div>
                      )}
                      {previewPoc.remediation && (
                        <div>
                          <span className="text-slate-400 block mb-1">修复建议:</span>
                          <span className="text-slate-300">{previewPoc.remediation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 标签 */}
                {previewPoc.tags && previewPoc.tags.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                      <Tag size={14} />
                      标签
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {previewPoc.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-sky-500/20 text-sky-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 参考资料 */}
                {previewPoc.reference && previewPoc.reference.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                      <Code size={14} />
                      参考资料
                    </h3>
                    <div className="bg-slate-800/50 rounded-lg p-3 space-y-1 text-sm">
                      {previewPoc.reference.map((ref, idx) => (
                        <a
                          key={idx}
                          href={ref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sky-400 hover:text-sky-300 truncate"
                          title={ref}
                        >
                          {ref}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 元数据 */}
                {previewPoc.metadata && Object.keys(previewPoc.metadata).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                      元数据
                    </h3>
                    <div className="bg-slate-800/50 rounded-lg p-3 space-y-1 text-sm">
                      {Object.entries(previewPoc.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-slate-400">{key}:</span>
                          <span className="text-slate-200 font-mono text-xs">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 时间信息 */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                    时间信息
                  </h3>
                  <div className="bg-slate-800/50 rounded-lg p-3 space-y-1 text-sm">
                    {previewPoc.created_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">创建时间:</span>
                        <span className="text-slate-200 text-xs">{new Date(previewPoc.created_at).toLocaleString('zh-CN')}</span>
                      </div>
                    )}
                    {previewPoc.updated_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">更新时间:</span>
                        <span className="text-slate-200 text-xs">{new Date(previewPoc.updated_at).toLocaleString('zh-CN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 右侧 - 代码/内容区域 */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* 内容标题 */}
                <div className="px-4 py-2 border-b border-slate-700 bg-slate-900/30 flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    {previewPoc.source === 'custom' ? 'YAML 内容' : '详细信息'}
                  </span>
                  {previewPoc.nuclei_version && (
                    <span className="text-xs text-slate-500">Nuclei {previewPoc.nuclei_version}</span>
                  )}
                </div>
                {/* 内容显示区域 */}
                <div className="flex-1 overflow-auto p-4">
                  {previewPoc.source === 'custom' ? (
                    <YamlEditor
                      value={previewContent}
                      onChange={() => {}}
                      onValidate={() => {}}
                      readOnly={true}
                    />
                  ) : (
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {previewContent}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
