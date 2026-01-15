/**
 * 统一的 API 错误处理
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string | number) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', { resource, id });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

/**
 * 错误处理工具函数
 */
export const ErrorHandler = {
  /**
   * 处理 API 错误
   */
  handle(error: any): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    // 网络错误
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new NetworkError('Network connection failed', { originalError: error });
    }

    // 超时错误
    if (error.name === 'AbortError') {
      return new NetworkError('Request timeout', { originalError: error });
    }

    // 默认错误
    return new ApiError(
      error.message || 'An unexpected error occurred',
      'UNKNOWN_ERROR',
      { originalError: error }
    );
  },

  /**
   * 从错误中提取用户友好的消息
   */
  getUserMessage(error: ApiError): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return '网络连接失败，请检查网络设置';
      case 'VALIDATION_ERROR':
        return `输入验证失败: ${error.message}`;
      case 'NOT_FOUND':
        return error.message;
      case 'CONFLICT':
        return error.message;
      default:
        return '操作失败，请稍后重试';
    }
  },

  /**
   * 记录错误
   */
  log(error: ApiError, context?: string) {
    const logMessage = context ? `[${context}] ${error.message}` : error.message;
    console.error(logMessage, error.details);
  }
};

/**
 * 包装 API 调用，自动处理错误
 */
export async function withErrorHandling<T>(
  apiCall: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    const apiError = ErrorHandler.handle(error);
    ErrorHandler.log(apiError, context);
    throw apiError;
  }
}

/**
 * 安全执行 API 调用，不抛出错误
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    ErrorHandler.log(ErrorHandler.handle(error));
    return defaultValue;
  }
}
