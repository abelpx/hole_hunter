/**
 * RequestEditor 组件
 * HTTP 请求编辑器
 */

import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Input, Select, Button } from '../ui';
import { HttpRequest, HttpHeader, CreateHttpRequest } from '../../types';

interface RequestEditorProps {
  request?: HttpRequest;
  readonly?: boolean;
  onChange?: (data: CreateHttpRequest) => void;
}

const HTTP_METHODS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'OPTIONS', label: 'OPTIONS' },
];

export const RequestEditor: React.FC<RequestEditorProps> = ({
  request,
  readonly = false,
  onChange,
}) => {
  // 解析请求的 headers
  const parseHeaders = (headersStr: string): HttpHeader[] => {
    try {
      return JSON.parse(headersStr || '[]');
    } catch {
      return [];
    }
  };

  // 初始化表单数据
  const [formData, setFormData] = useState<CreateHttpRequest>({
    name: request?.name || '',
    method: request?.method || 'GET',
    url: request?.url || '',
    headers: request ? parseHeaders(request.headers) : [],
    body: request?.body || '',
    content_type: request?.content_type || 'application/json',
    tags: request?.tags || [],
  });

  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');

  useEffect(() => {
    if (request) {
      setFormData({
        name: request.name,
        method: request.method,
        url: request.url,
        headers: parseHeaders(request.headers),
        body: request.body,
        content_type: request.content_type,
        tags: request.tags,
      });
    }
  }, [request]);

  // 更新表单数据
  const updateField = (field: keyof CreateHttpRequest, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onChange?.(newData);
  };

  // 添加 header
  const addHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      const newHeaders = [
        ...formData.headers,
        { key: newHeaderKey, value: newHeaderValue },
      ];
      updateField('headers', newHeaders);
      setNewHeaderKey('');
      setNewHeaderValue('');
    }
  };

  // 删除 header
  const removeHeader = (index: number) => {
    const newHeaders = formData.headers?.filter((_, i) => i !== index) || [];
    updateField('headers', newHeaders);
  };

  // 更新 header
  const updateHeader = (index: number, key: string, value: string) => {
    const newHeaders = [...(formData.headers || [])];
    newHeaders[index] = { key, value };
    updateField('headers', newHeaders);
  };

  if (readonly) {
    // 只读模式：显示请求详情
    const headers = parseHeaders(request?.headers || '[]');

    return (
      <div className="h-full overflow-y-auto p-4 space-y-4">
        {/* 基本信息 */}
        <div className="flex items-center gap-4">
          <div className="px-3 py-1.5 bg-sky-500 rounded text-sm font-semibold text-white">
            {request?.method}
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-200 break-all">{request?.url}</p>
            {request?.name && (
              <p className="text-xs text-slate-500 mt-1">{request.name}</p>
            )}
          </div>
        </div>

        {/* Headers */}
        {headers.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Headers</h4>
            <div className="space-y-1">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <span className="text-sky-400 font-medium">{header.key}:</span>
                  <span className="text-slate-300 break-all">{header.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        {request?.body && (
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Body</h4>
            <pre className="bg-slate-900 rounded p-3 text-xs text-slate-300 overflow-x-auto">
              {request.body}
            </pre>
          </div>
        )}

        {/* Tags */}
        {request?.tags && request.tags.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {request.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 编辑模式
  return (
    <div className="space-y-4 p-4">
      {/* 名称 */}
      <Input
        label="请求名称"
        placeholder="例如：登录接口"
        value={formData.name}
        onChange={(e) => updateField('name', e.target.value)}
      />

      {/* 方法和URL */}
      <div className="flex gap-3">
        <div className="w-32">
          <Select
            label="方法"
            options={HTTP_METHODS}
            value={formData.method}
            onChange={(value) => updateField('method', value)}
          />
        </div>
        <div className="flex-1">
          <Input
            label="URL"
            placeholder="https://api.example.com/users"
            value={formData.url}
            onChange={(e) => updateField('url', e.target.value)}
            required
          />
        </div>
      </div>

      {/* Headers */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Headers
        </label>
        <div className="space-y-2">
          {formData.headers?.map((header, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Header name"
                value={header.key}
                onChange={(e) =>
                  updateHeader(index, e.target.value, header.value)
                }
                className="flex-1"
              />
              <Input
                placeholder="Header value"
                value={header.value}
                onChange={(e) =>
                  updateHeader(index, header.key, e.target.value)
                }
                className="flex-1"
              />
              <Button
                type="ghost"
                size="sm"
                icon={<X size={14} />}
                onClick={() => removeHeader(index)}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="New header name"
              value={newHeaderKey}
              onChange={(e) => setNewHeaderKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addHeader()}
              className="flex-1"
            />
            <Input
              placeholder="New header value"
              value={newHeaderValue}
              onChange={(e) => setNewHeaderValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addHeader()}
              className="flex-1"
            />
            <Button
              type="secondary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={addHeader}
            >
              添加
            </Button>
          </div>
        </div>
      </div>

      {/* Content Type */}
      <Select
        label="Content Type"
        options={[
          { value: 'application/json', label: 'application/json' },
          { value: 'application/x-www-form-urlencoded', label: 'application/x-www-form-urlencoded' },
          { value: 'multipart/form-data', label: 'multipart/form-data' },
          { value: 'text/plain', label: 'text/plain' },
          { value: 'text/html', label: 'text/html' },
          { value: 'application/xml', label: 'application/xml' },
        ]}
        value={formData.content_type}
        onChange={(value) => updateField('content_type', value)}
      />

      {/* Body */}
      {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Request Body
          </label>
          <textarea
            className="w-full h-32 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            placeholder='{"key": "value"}'
            value={formData.body}
            onChange={(e) => updateField('body', e.target.value)}
          />
        </div>
      )}

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Tags (逗号分隔)
        </label>
        <Input
          placeholder="api, auth, test"
          value={formData.tags?.join(', ') || ''}
          onChange={(e) => {
            const tags = e.target.value
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);
            updateField('tags', tags);
          }}
        />
      </div>
    </div>
  );
};
