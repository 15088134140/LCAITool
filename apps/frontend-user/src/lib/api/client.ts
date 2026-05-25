/**
 * 灵创AI工具箱 - Axios API客户端
 * 包含拦截器、Token管理、请求/响应处理
 */

import axios, { AxiosError } from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// API配置
const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:8000/api/v1';
export { API_BASE_URL };
const TOKEN_KEY = 'lcaitool_access_token';

// Token存储
interface TokenStorage {
  getToken: () => string | null;
  setToken: (token: string) => void;
  removeToken: () => void;
  clearAll: () => void;
}

const createTokenStorage = (): TokenStorage => {
  const isClient = typeof window !== 'undefined';
  return {
    getToken: () => isClient ? localStorage.getItem(TOKEN_KEY) : null,
    setToken: (token) => { if (isClient) localStorage.setItem(TOKEN_KEY, token); },
    removeToken: () => { if (isClient) localStorage.removeItem(TOKEN_KEY); },
    clearAll: () => { if (isClient) localStorage.removeItem(TOKEN_KEY); },
  };
};

export const tokenStorage = createTokenStorage();

// 创建Axios实例
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 请求拦截器 - 添加认证Token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenStorage.getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => Promise.reject(error)
  );

  // 响应拦截器 - 401 时清除登录状态
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401 && error.config?.headers?.Authorization) {
        tokenStorage.clearAll();

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
      }
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
