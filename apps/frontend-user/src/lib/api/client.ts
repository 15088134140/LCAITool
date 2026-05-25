/**
 * 灵创AI工具箱 - Axios API客户端
 * 包含拦截器、Token管理、请求/响应处理
 */

import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from './types';

// API配置
const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:8000/api/v1';
export { API_BASE_URL };
const TOKEN_KEY = 'lcaitool_access_token';
const REFRESH_TOKEN_KEY = 'lcaitool_refresh_token';

// Token存储接口
interface TokenStorage {
  getToken: () => string | null;
  setToken: (token: string) => void;
  removeToken: () => void;
  getRefreshToken: () => string | null;
  setRefreshToken: (token: string) => void;
  removeRefreshToken: () => void;
  clearAll: () => void;
}

// 实现Token存储（兼容客户端和服务端）
const createTokenStorage = (): TokenStorage => {
  const isClient = typeof window !== 'undefined';

  return {
    getToken: () => {
      if (!isClient) return null;
      return localStorage.getItem(TOKEN_KEY);
    },
    setToken: (token: string) => {
      if (!isClient) return;
      localStorage.setItem(TOKEN_KEY, token);
    },
    removeToken: () => {
      if (!isClient) return;
      localStorage.removeItem(TOKEN_KEY);
    },
    getRefreshToken: () => {
      if (!isClient) return null;
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    },
    setRefreshToken: (token: string) => {
      if (!isClient) return;
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    },
    removeRefreshToken: () => {
      if (!isClient) return;
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
    clearAll: () => {
      if (!isClient) return;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
  };
};

export const tokenStorage = createTokenStorage();

// 扩展Axios配置，支持跳过401处理
interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _skipAutoRefresh?: boolean;
  headers?: any;
}

// 创建Axios实例
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  let isRefreshing = false;
  let refreshSubscribers: ((token: string) => void)[] = [];

  // 订阅刷新Token的回调
  const subscribeTokenRefresh = (callback: (token: string) => void) => {
    refreshSubscribers.push(callback);
  };

  // 通知所有订阅者Token已刷新
  const onTokenRefreshed = (token: string) => {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
  };

  // 请求拦截器 - 添加认证Token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenStorage.getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器 - 处理响应和刷新Token
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as CustomAxiosRequestConfig;

      // 如果是401且不是刷新Token请求
      if (error.response?.status === 401 && !originalRequest._skipAutoRefresh) {
        // 没有Authorization header的请求返回401，是凭证错误而非token过期
        // 直接透传原始错误，不进入refresh逻辑
        if (!originalRequest.headers?.Authorization) {
          return Promise.reject(error);
        }
        if (isRefreshing) {
          // 如果正在刷新Token，等待刷新完成后重试
          return new Promise((resolve) => {
            subscribeTokenRefresh((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(client(originalRequest));
            });
          });
        }

        isRefreshing = true;
        originalRequest._skipAutoRefresh = true;

        try {
          const refreshToken = tokenStorage.getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // 调用刷新Token接口
          const response = await axios.post<ApiResponse<{ access_token: string; refresh_token: string }>>(
            `${API_BASE_URL}/auth/refresh`,
            { refresh_token: refreshToken }
          );

          // 兼容两种响应格式: { success, data: { access_token } } 或 { access_token }
          const tokenData = (response.data.data || response.data) as { access_token: string; refresh_token: string };
          const { access_token, refresh_token: newRefreshToken } = tokenData;

          // 更新存储的Token
          tokenStorage.setToken(access_token);
          tokenStorage.setRefreshToken(newRefreshToken);

          // 通知订阅者
          onTokenRefreshed(access_token);

          // 重试原始请求
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return client(originalRequest);
        } catch (refreshError) {
          // 刷新Token失败，清除所有Token并通知用户重新登录
          tokenStorage.clearAll();

          // 触发登出事件（供应用层处理）
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'));
          }

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // 处理其他错误
      return Promise.reject(error);
    }
  );

  return client;
};

export const apiClient = createApiClient();

// 通用请求方法
export const api = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<any>(url, config);
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data as T;
    }
    return body as T;
  },

  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.post<any>(url, data, config);
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data as T;
    }
    return body as T;
  },

  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.put<any>(url, data, config);
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data as T;
    }
    return body as T;
  },

  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.patch<any>(url, data, config);
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data as T;
    }
    return body as T;
  },

  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete<any>(url, config);
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data as T;
    }
    return body as T;
  },
};

export default apiClient;
