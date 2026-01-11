/**
 * HTTP 重放服务
 * 使用 SQLite 直接存储
 */

import { DatabaseManager } from '../database/DatabaseManager';

export interface HttpRequest {
  id: number;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  content_type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface HttpResponse {
  id: number;
  request_id: number;
  status_code: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  body_size: number;
  header_size: number;
  duration: number;
  timestamp: string;
  created_at: string;
}

export class ReplayService {
  private static instance: ReplayService;
  private db: DatabaseManager;

  private constructor() {
    this.db = DatabaseManager.getInstance();
  }

  static getInstance(): ReplayService {
    if (!ReplayService.instance) {
      ReplayService.instance = new ReplayService();
    }
    return ReplayService.instance;
  }

  async getAllHttpRequests(): Promise<HttpRequest[]> {
    return await this.db.getAllHttpRequests();
  }

  async getHttpRequestById(id: number): Promise<HttpRequest | null> {
    return await this.db.getHttpRequestById(id);
  }

  async createHttpRequest(data: {
    name: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    content_type?: string;
    tags?: string[];
  }): Promise<number> {
    return await this.db.createHttpRequest(data);
  }

  async updateHttpRequest(id: number, data: {
    name?: string;
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string;
    content_type?: string;
    tags?: string[];
  }): Promise<void> {
    await this.db.updateHttpRequest(id, data);
  }

  async deleteHttpRequest(id: number): Promise<void> {
    await this.db.deleteHttpRequest(id);
  }

  async sendHttpRequest(id: number): Promise<HttpResponse> {
    // 获取请求
    const request = await this.db.getHttpRequestById(id);
    if (!request) {
      throw new Error('HTTP request not found');
    }

    const startTime = Date.now();

    try {
      // 发送真实 HTTP 请求
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? request.body : undefined,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 获取响应数据
      const statusText = response.statusText;
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const body = await response.text();
      const bodySize = body.length;
      const headerSize = JSON.stringify(headers).length;

      // 保存响应历史
      const httpResponse = await this.db.createHttpResponse({
        request_id: id,
        status_code: response.status,
        status_text: statusText,
        headers: headers,
        body: body,
        body_size: bodySize,
        header_size: headerSize,
        duration: duration,
      });

      return {
        id: httpResponse,
        request_id: id,
        status_code: response.status,
        status_text: statusText,
        headers: headers,
        body: body,
        body_size: bodySize,
        header_size: headerSize,
        duration: duration,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
    } catch (error: any) {
      // 保存错误响应
      const httpResponse = await this.db.createHttpResponse({
        request_id: id,
        status_code: 0,
        status_text: 'Error',
        headers: {},
        body: error.message,
        body_size: error.message.length,
        header_size: 0,
        duration: Date.now() - startTime,
      });

      throw error;
    }
  }

  async getHttpResponseHistory(requestId: number): Promise<HttpResponse[]> {
    return await this.db.getHttpResponseHistory(requestId);
  }

  async importHttpRequest(data: { data: string; type: 'curl' | 'http' }): Promise<number> {
    let parsed: {
      method: string;
      url: string;
      headers: Record<string, string>;
      body?: string;
    };

    if (data.type === 'curl') {
      parsed = this.parseCurlCommand(data.data);
    } else {
      parsed = this.parseHttpRequest(data.data);
    }

    return await this.db.createHttpRequest({
      name: `Imported ${parsed.method} ${parsed.url}`,
      method: parsed.method,
      url: parsed.url,
      headers: parsed.headers,
      body: parsed.body,
      content_type: parsed.headers['Content-Type'] || 'application/json',
      tags: [],
    });
  }

  private parseCurlCommand(curlCommand: string): {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  } {
    // 简单的 curl 解析
    const headers: Record<string, string> = {};
    let method = 'GET';
    let url = '';
    let body: string | undefined;

    // 提取 URL
    const urlMatch = curlCommand.match(/curl\s+(?:-X\s+(\w+)\s+)?['"]?([^'"\s]+)['"]?/);
    if (urlMatch) {
      if (urlMatch[1]) method = urlMatch[1].toUpperCase();
      url = urlMatch[2];
    }

    // 提取 headers
    const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = headerRegex.exec(curlCommand)) !== null) {
      const [key, value] = match[1].split(/:\s*/);
      if (key && value) {
        headers[key] = value;
      }
    }

    // 提取 body
    const dataMatch = curlCommand.match(/--data-raw\s+['"]([^'"]+)['"]|-d\s+['"]([^'"]+)['"]/);
    if (dataMatch) {
      body = dataMatch[1] || dataMatch[2];
    }

    return { method, url, headers, body };
  }

  private parseHttpRequest(httpRequest: string): {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  } {
    const lines = httpRequest.split('\n');
    const headers: Record<string, string> = {};

    // 解析请求行
    const requestLine = lines[0].split(' ');
    const method = requestLine[0] || 'GET';
    const url = requestLine[1] || '';

    // 解析 headers
    let i = 1;
    for (; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) break;
      const [key, value] = line.split(/:\s*/);
      if (key && value) {
        headers[key] = value;
      }
    }

    // 解析 body
    const body = i < lines.length - 1 ? lines.slice(i + 1).join('\n') : undefined;

    return { method, url, headers, body };
  }
}
