/**
 * 暴力破解配置模态框
 */

import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from '../ui';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface BruteConfigModalProps {
  visible: boolean;
  requests: any[];
  payloadSets: any[];
  onClose: () => void;
  onConfirm: (config: any) => void;
}

export const BruteConfigModal: React.FC<BruteConfigModalProps> = ({
  visible,
  requests,
  payloadSets,
  onClose,
  onConfirm,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    request_id: 0,
    type: 'single' as 'single' | 'multi-pitchfork' | 'multi-cluster',
    parameters: [] as Array<{
      name: string;
      type: 'header' | 'query' | 'body' | 'path';
      payload_set_id: number;
    }>,
    concurrency: 10,
    timeout: 30,
    delay: 0,
    retry_count: 0,
  });

  const [showAddParam, setShowAddParam] = useState(false);

  // 重置表单
  useEffect(() => {
    if (visible) {
      setFormData({
        name: `暴力破解任务-${new Date().toLocaleString('zh-CN')}`,
        request_id: requests.length > 0 ? requests[0].id : 0,
        type: 'single',
        parameters: [],
        concurrency: 10,
        timeout: 30,
        delay: 0,
        retry_count: 0,
      });
    }
  }, [visible, requests]);

  // 添加参数
  const handleAddParameter = () => {
    setFormData({
      ...formData,
      parameters: [
        ...formData.parameters,
        {
          name: '',
          type: 'body' as const,
          payload_set_id: 0,
        },
      ],
    });
    setShowAddParam(false);
  };

  // 删除参数
  const handleRemoveParameter = (index: number) => {
    setFormData({
      ...formData,
      parameters: formData.parameters.filter((_, i) => i !== index),
    });
  };

  // 更新参数
  const handleUpdateParameter = (index: number, field: string, value: any) => {
    const newParameters = [...formData.parameters];
    newParameters[index] = { ...newParameters[index], [field]: value };
    setFormData({ ...formData, parameters: newParameters });
  };

  // 提交
  const handleSubmit = () => {
    if (!formData.name) {
      alert('请输入任务名称');
      return;
    }
    if (formData.request_id === 0) {
      alert('请选择 HTTP 请求');
      return;
    }
    if (formData.parameters.length === 0) {
      alert('请至少添加一个参数');
      return;
    }
    if (formData.parameters.some((p) => !p.name || p.payload_set_id === 0)) {
      alert('请完善所有参数配置');
      return;
    }

    onConfirm(formData);
  };

  const selectedRequest = requests.find((r) => r.id === formData.request_id);

  return (
    <Modal
      visible={visible}
      title="创建暴力破解任务"
      onClose={onClose}
      onConfirm={handleSubmit}
      width="xl"
    >
      <div className="space-y-4">
        {/* 任务名称 */}
        <Input
          label="任务名称"
          placeholder="请输入任务名称"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        {/* 选择请求 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            选择 HTTP 请求
          </label>
          <Select
            placeholder="请选择请求"
            options={requests.map((r) => ({
              value: r.id,
              label: `${r.method} - ${r.name || r.url}`,
            }))}
            value={formData.request_id}
            onChange={(value) => setFormData({ ...formData, request_id: value })}
          />
          {selectedRequest && (
            <div className="mt-2 text-xs text-slate-400 bg-slate-800/50 rounded p-2">
              <div><strong>URL:</strong> {selectedRequest.url}</div>
              <div className="mt-1"><strong>方法:</strong> {selectedRequest.method}</div>
            </div>
          )}
        </div>

        {/* 任务类型 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            任务类型
          </label>
          <Select
            options={[
              { value: 'single', label: '单参数' },
              { value: 'multi-pitchfork', label: '多参数（Pitchfork）' },
              { value: 'multi-cluster', label: '多参数（Cluster Bomb）' },
            ]}
            value={formData.type}
            onChange={(value) =>
              setFormData({
                ...formData,
                type: value as 'single' | 'multi-pitchfork' | 'multi-cluster',
              })
            }
          />
          <p className="text-xs text-slate-500 mt-1">
            {formData.type === 'single' && '使用单个载荷集对单个参数进行暴力破解'}
            {formData.type === 'multi-pitchfork' && '多个参数使用各自的载荷集同步破解'}
            {formData.type === 'multi-cluster' && '多个参数使用各自的载荷集进行笛卡尔积组合'}
          </p>
        </div>

        {/* 参数列表 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-300">
              参数配置
            </label>
            <Button
              type="secondary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={handleAddParameter}
            >
              添加参数
            </Button>
          </div>

          {formData.parameters.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-sm">
              暂无参数，点击「添加参数」按钮添加
            </div>
          ) : (
            <div className="space-y-3">
              {formData.parameters.map((param, index) => (
                <div
                  key={index}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-200">
                      参数 #{index + 1}
                    </span>
                    <Button
                      type="ghost"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      onClick={() => handleRemoveParameter(index)}
                    >
                      删除
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="参数名称"
                      placeholder="例如: username, password"
                      value={param.name}
                      onChange={(e) =>
                        handleUpdateParameter(index, 'name', e.target.value)
                      }
                      required
                    />

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        参数类型
                      </label>
                      <Select
                        options={[
                          { value: 'body', label: 'Body 参数' },
                          { value: 'query', label: 'Query 参数' },
                          { value: 'header', label: 'Header' },
                          { value: 'path', label: 'Path 参数' },
                        ]}
                        value={param.type}
                        onChange={(value) =>
                          handleUpdateParameter(index, 'type', value)
                        }
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        载荷集
                      </label>
                      <Select
                        placeholder="请选择载荷集"
                        options={payloadSets.map((set) => ({
                          value: set.id,
                          label: set.name,
                        }))}
                        value={param.payload_set_id}
                        onChange={(value) =>
                          handleUpdateParameter(index, 'payload_set_id', value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 高级设置 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            高级设置
          </label>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="并发数"
              type="number"
              value={formData.concurrency}
              onChange={(e) =>
                setFormData({ ...formData, concurrency: parseInt(e.target.value) })
              }
              min="1"
              max="100"
            />
            <Input
              label="超时时间（秒）"
              type="number"
              value={formData.timeout}
              onChange={(e) =>
                setFormData({ ...formData, timeout: parseInt(e.target.value) })
              }
              min="1"
              max="300"
            />
            <Input
              label="请求延迟（毫秒）"
              type="number"
              value={formData.delay}
              onChange={(e) =>
                setFormData({ ...formData, delay: parseInt(e.target.value) })
              }
              min="0"
              max="5000"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
