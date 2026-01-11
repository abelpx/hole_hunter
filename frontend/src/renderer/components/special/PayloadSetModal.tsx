/**
 * 载荷集管理模态框
 */

import React, { useState } from 'react';
import { Modal, Input, Select, Button, Tag } from '../ui';
import { Plus, Trash2, Upload, FileText } from 'lucide-react';
import { useBruteStore } from '../../store/bruteStore';
import clsx from 'clsx';

interface PayloadSetModalProps {
  visible: boolean;
  payloadSets: any[];
  onClose: () => void;
  onRefresh: () => void;
}

export const PayloadSetModal: React.FC<PayloadSetModalProps> = ({
  visible,
  payloadSets,
  onClose,
  onRefresh,
}) => {
  const { createPayloadSet } = useBruteStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'dictionary' as 'dictionary' | 'number' | 'charset' | 'date',
    payloads: [] as string[],
  });

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'dictionary',
      payloads: [],
    });
  };

  // 创建载荷集
  const handleCreate = async () => {
    if (!formData.name) {
      alert('请输入载荷集名称');
      return;
    }

    try {
      await createPayloadSet({
        name: formData.name,
        type: formData.type,
        payloads: formData.type === 'dictionary' ? formData.payloads : undefined,
      });
      resetForm();
      setShowCreateModal(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to create payload set:', error);
    }
  };

  // 添加载荷
  const handleAddPayload = (value: string) => {
    if (value.trim()) {
      setFormData({
        ...formData,
        payloads: [...formData.payloads, value.trim()],
      });
    }
  };

  // 删除载荷
  const handleRemovePayload = (index: number) => {
    setFormData({
      ...formData,
      payloads: formData.payloads.filter((_, i) => i !== index),
    });
  };

  return (
    <>
      <Modal
        visible={visible && !showCreateModal}
        title="载荷集管理"
        onClose={onClose}
        onConfirm={onClose}
        confirmText="关闭"
        width="xl"
      >
        <div className="space-y-4">
          {/* 创建按钮 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              共 {payloadSets.length} 个载荷集
            </div>
            <Button
              type="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowCreateModal(true)}
            >
              创建载荷集
            </Button>
          </div>

          {/* 载荷集列表 */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {payloadSets.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                暂无载荷集
              </div>
            ) : (
              payloadSets.map((set) => (
                <div
                  key={set.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-200">{set.name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        类型: {set.type}
                      </div>
                    </div>
                    <Tag>{set.type}</Tag>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* 创建载荷集模态框 */}
      <Modal
        visible={showCreateModal}
        title="创建载荷集"
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        onConfirm={handleCreate}
        width="lg"
      >
        <div className="space-y-4">
          {/* 载荷集名称 */}
          <Input
            label="载荷集名称"
            placeholder="例如: 用户名字典、密码字典"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          {/* 载荷集类型 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              载荷集类型
            </label>
            <Select
              options={[
                { value: 'dictionary', label: '字典列表' },
                { value: 'number', label: '数字序列' },
                { value: 'charset', label: '字符组合' },
                { value: 'date', label: '日期序列' },
              ]}
              value={formData.type}
              onChange={(value) =>
                setFormData({ ...formData, type: value as any })
              }
            />
            <p className="text-xs text-slate-500 mt-1">
              {formData.type === 'dictionary' && '手动输入或导入字典列表'}
              {formData.type === 'number' && '生成数字序列（如：1-1000）'}
              {formData.type === 'charset' && '生成字符组合（如：a-z 的组合）'}
              {formData.type === 'date' && '生成日期序列（如：2020-01-01 到 2024-12-31）'}
            </p>
          </div>

          {/* 字典类型 - 载荷输入 */}
          {formData.type === 'dictionary' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                载荷列表
              </label>
              <div className="mb-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="输入载荷后按回车添加"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddPayload((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {formData.payloads.length > 0 && (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-800/50 rounded-lg">
                  {formData.payloads.map((payload, index) => (
                    <Tag
                      key={index}
                      closable
                      onClose={() => handleRemovePayload(index)}
                    >
                      {payload}
                    </Tag>
                  ))}
                </div>
              )}

              <div className="mt-3 p-3 bg-slate-800/30 rounded-lg border border-dashed border-slate-600">
                <div className="flex items-center justify-center text-sm text-slate-400">
                  <Upload size={16} className="mr-2" />
                  拖拽文件到此处或点击导入（暂未实现）
                </div>
              </div>
            </div>
          )}

          {/* 示例字典 */}
          {formData.type === 'dictionary' && formData.payloads.length === 0 && (
            <div>
              <Button
                type="secondary"
                size="sm"
                icon={<FileText size={14} />}
                onClick={() => {
                  setFormData({
                    ...formData,
                    payloads: [
                      'admin',
                      'administrator',
                      'root',
                      'test',
                      'user',
                      'guest',
                    ],
                  });
                }}
              >
                加载示例字典
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
