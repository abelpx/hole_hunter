/**
 * 模板管理页面
 * 管理 Nuclei 扫描模板，支持分组管理和启用/禁用
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui';
import {
  TemplateList,
  TemplateFilters,
  TemplatePagination,
  TemplateDetailModal,
  ScenarioGroupModal,
} from './templates';

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

interface ScenarioGroup {
  id: string;
  name: string;
  description: string;
  templateIds: string[];
}

// 模板分类定义
const templateCategoryDefs = [
  { id: 'all', name: '全部模板', icon: <Layers size={16} /> },
  { id: 'cves', name: 'CVE 漏洞', icon: <Layers size={16} /> },
  { id: 'vulnerabilities', name: '通用漏洞', icon: <Layers size={16} /> },
  { id: 'exposures', name: '信息泄露', icon: <Layers size={16} /> },
  { id: 'technologies', name: '技术检测', icon: <Layers size={16} /> },
  { id: 'misconfiguration', name: '配置错误', icon: <Layers size={16} /> },
];

export const TemplatesPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'templates' | 'scenarios'>('templates');

  // 模板数据
  const [templates, setTemplates] = useState<NucleiTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<NucleiTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<NucleiTemplate | null>(null);
  const [showTemplateDetail, setShowTemplateDetail] = useState(false);
  const [templateContent, setTemplateContent] = useState('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(false);

  // 过滤条件
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryStats, setCategoryStats] = useState<Map<string, number>>(new Map());

  // 场景分组状态
  const [scenarioGroups, setScenarioGroups] = useState<ScenarioGroup[]>([]);
  const [showCreateScenarioModal, setShowCreateScenarioModal] = useState(false);
  const [editingScenarioGroup, setEditingScenarioGroup] = useState<ScenarioGroup | null>(null);

  // 加载数据
  useEffect(() => {
    loadTemplates();
    loadScenarioGroups();
  }, [selectedCategory, severityFilter, searchQuery]);

  // 过滤模板
  useEffect(() => {
    applyFilters();
  }, [templates, selectedCategory, severityFilter, searchQuery]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // TODO: 实现后端 API 调用
      setLoading(false);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...templates];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(t => t.severity === severityFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query)) ||
        t.author.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const loadScenarioGroups = async () => {
    try {
      // TODO: 实现后端 API 调用
    } catch (error) {
      console.error('Failed to load scenario groups:', error);
    }
  };

  const handleTemplateClick = async (template: NucleiTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateDetail(true);
    setLoadingTemplate(true);

    try {
      // TODO: 加载模板内容
      setTemplateContent('');
    } catch (error) {
      console.error('Failed to load template content:', error);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleToggleEnabled = (templateId: string) => {
    setTemplates(prev =>
      prev.map(t =>
        t.id === templateId ? { ...t, enabled: !t.enabled } : t
      )
    );
  };

  const handleToggleSelectedEnabled = () => {
    if (selectedTemplate) {
      handleToggleEnabled(selectedTemplate.id);
      setSelectedTemplate(prev =>
        prev ? { ...prev, enabled: !prev.enabled } : null
      );
    }
  };

  const handleCreateScenarioGroup = async (name: string, description: string) => {
    try {
      // TODO: 实现后端 API 调用
      setShowCreateScenarioModal(false);
    } catch (error) {
      console.error('Failed to create scenario group:', error);
      throw error;
    }
  };

  const handleUpdateScenarioGroup = async (id: string, name: string, description: string) => {
    try {
      // TODO: 实现后端 API 调用
      setEditingScenarioGroup(null);
    } catch (error) {
      console.error('Failed to update scenario group:', error);
      throw error;
    }
  };

  const handleDeleteScenarioGroup = async (id: string) => {
    if (!confirm('确定要删除这个场景分组吗？')) return;

    try {
      // TODO: 实现后端 API 调用
    } catch (error) {
      console.error('Failed to delete scenario group:', error);
    }
  };

  // 分页数据
  const paginatedTemplates = filteredTemplates.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-xl font-semibold text-slate-200">
          {viewMode === 'templates' ? '模板管理' : '场景分组'}
        </h1>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadTemplates()}
            disabled={loading}
          >
            <RefreshCw size={16} className={clsx(loading && 'animate-spin')} />
          </Button>

          {viewMode === 'scenarios' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateScenarioModal(true)}
            >
              <Plus size={16} className="mr-1" />
              创建分组
            </Button>
          )}
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧边栏 */}
        <div className="w-64 border-r border-slate-800 p-4 overflow-y-auto">
          <TemplateFilters
            searchQuery={searchQuery}
            severityFilter={severityFilter}
            selectedCategory={selectedCategory}
            categoryStats={categoryStats}
            categories={templateCategoryDefs}
            onSearchChange={setSearchQuery}
            onSeverityChange={setSeverityFilter}
            onCategoryChange={setSelectedCategory}
          />
        </div>

        {/* 右侧内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto">
            {viewMode === 'templates' ? (
              <TemplateList
                templates={paginatedTemplates}
                selectedTemplate={selectedTemplate}
                disabledCategories={new Set()}
                onTemplateClick={handleTemplateClick}
                onToggleEnabled={handleToggleEnabled}
              />
            ) : (
              <div className="space-y-2">
                {scenarioGroups.map(group => (
                  <div
                    key={group.id}
                    className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-slate-200">{group.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">{group.description}</p>
                        <p className="text-xs text-slate-500 mt-1">{group.templateIds.length} 个模板</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingScenarioGroup(group)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteScenarioGroup(group.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 分页 */}
          {viewMode === 'templates' && (
            <div className="p-4 border-t border-slate-800">
              <TemplatePagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredTemplates.length}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* 模板详情模态框 */}
      <TemplateDetailModal
        visible={showTemplateDetail}
        template={selectedTemplate}
        templateContent={templateContent}
        loading={loadingTemplate}
        onClose={() => {
          setShowTemplateDetail(false);
          setSelectedTemplate(null);
        }}
        onToggleEnabled={handleToggleSelectedEnabled}
      />

      {/* 创建场景分组模态框 */}
      <ScenarioGroupModal
        visible={showCreateScenarioModal}
        mode="create"
        onClose={() => setShowCreateScenarioModal(false)}
        onConfirm={handleCreateScenarioGroup}
      />

      {/* 编辑场景分组模态框 */}
      <ScenarioGroupModal
        visible={!!editingScenarioGroup}
        mode="edit"
        scenarioGroup={editingScenarioGroup || undefined}
        onClose={() => setEditingScenarioGroup(null)}
        onConfirm={(name, desc) =>
          editingScenarioGroup &&
          handleUpdateScenarioGroup(editingScenarioGroup.id, name, desc)
        }
      />
    </div>
  );
};
