/**
 * 自定义 POC 模板管理页面
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  FileCode,
  Trash2,
  Edit,
  Eye,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
} from 'lucide-react';
import { Button, Badge } from '../components/ui';
import { YamlEditor } from '../components/special/YamlEditor';
import { getService } from '../services/WailsService';
import type { CustomTemplate } from '../types';

export const CustomTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [stats, setStats] = useState({ total: 0, enabled: 0, disabled: 0 });
  const [loading, setLoading] = useState(true);

  // 编辑状态
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [saving, setSaving] = useState(false);

  // 预览状态
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  useEffect(() => {
    loadTemplates();
    loadStats();
  }, []);

  const loadTemplates = async () => {
    try {
      const service = getService();
      const data = await service.getAllCustomTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const service = getService();
      const data = await service.getCustomTemplatesStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setEditorContent('');
    setIsValid(false);
    setShowEditor(true);
  };

  const handleEdit = async (template: CustomTemplate) => {
    try {
      const service = getService();
      const fullTemplate = await service.getCustomTemplateById(template.id);
      setEditingTemplate(fullTemplate);
      setTemplateName(fullTemplate.name);
      setEditorContent(fullTemplate.content || '');
      setIsValid(false);
      setShowEditor(true);
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const handlePreview = async (template: CustomTemplate) => {
    try {
      const service = getService();
      const fullTemplate = await service.getCustomTemplateById(template.id);
      setPreviewContent(fullTemplate.content || '');
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const service = getService();
      await service.deleteCustomTemplate(id);
      await loadTemplates();
      await loadStats();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('删除失败');
    }
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      const service = getService();
      await service.toggleCustomTemplate(id, enabled);
      await loadTemplates();
      await loadStats();
    } catch (error) {
      console.error('Failed to toggle template:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const service = getService();

      if (editingTemplate) {
        await service.updateCustomTemplate(editingTemplate.id, templateName, editorContent);
      } else {
        await service.createCustomTemplate(templateName, editorContent);
      }

      await loadTemplates();
      await loadStats();
      setShowEditor(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleEditorClose = () => {
    if (!isValid && editorContent) {
      if (!confirm('模板未验证，确定要关闭吗？')) {
        return;
      }
    }
    setShowEditor(false);
    setEditingTemplate(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">自定义 POC 模板</h1>
          <p className="text-slate-400 mt-1">管理和创建自定义漏洞检测模板</p>
        </div>

        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={handleCreate}
        >
          新建模板
        </Button>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400">总模板数</div>
          <div className="text-3xl font-bold text-slate-100 mt-1">{stats.total}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400">已启用</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1">{stats.enabled}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-sm text-slate-400">已禁用</div>
          <div className="text-3xl font-bold text-slate-400 mt-1">{stats.disabled}</div>
        </div>
      </div>

      {/* 模板列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-400">加载中...</div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <FileCode size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">暂无自定义模板</p>
          <p className="text-slate-600 text-sm mt-2">点击"新建模板"创建第一个 POC</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* 启用/禁用开关 */}
                  <button
                    onClick={() => handleToggle(template.id, !template.enabled)}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {template.enabled ? (
                      <ToggleRight size={24} className="text-emerald-400" />
                    ) : (
                      <ToggleLeft size={24} className="text-slate-500" />
                    )}
                  </button>

                  {/* 模板信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-100">
                        {template.name}
                      </h3>
                      {template.enabled ? (
                        <Badge variant="success" className="text-xs">已启用</Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">已禁用</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {template.path}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      创建于 {new Date(template.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                  <Button
                    type="secondary"
                    size="sm"
                    icon={<Eye size={14} />}
                    onClick={() => handlePreview(template)}
                  >
                    预览
                  </Button>
                  <Button
                    type="secondary"
                    size="sm"
                    icon={<Edit size={14} />}
                    onClick={() => handleEdit(template)}
                  >
                    编辑
                  </Button>
                  <Button
                    type="danger"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={() => handleDelete(template.id)}
                  >
                    删除
                  </Button>
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
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex-1">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="模板名称"
                  className="w-full bg-transparent text-xl font-semibold text-slate-100 placeholder-slate-500 focus:outline-none"
                />
                <p className="text-sm text-slate-500 mt-1">
                  {editingTemplate ? '编辑模板' : '新建模板'}
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
                  disabled={saving || !templateName || !editorContent}
                >
                  {saving ? '保存中...' : '保存'}
                </Button>
                <Button
                  type="secondary"
                  icon={<X size={14} />}
                  onClick={handleEditorClose}
                >
                  关闭
                </Button>
              </div>
            </div>

            {/* 编辑器 */}
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
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-slate-100">模板预览</h2>
              <Button
                type="secondary"
                icon={<X size={14} />}
                onClick={() => setShowPreview(false)}
              >
                关闭
              </Button>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-auto p-6">
              <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
                {previewContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
