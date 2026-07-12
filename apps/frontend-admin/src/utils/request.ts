import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useUserStore } from '@/store';

// 响应数据类型
interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

class Request {
  private instance: AxiosInstance;
  private baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

  constructor() {
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 请求拦截器：携带Token
    this.instance.interceptors.request.use(
      (config) => {
        const token = useUserStore.getState().token;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器：统一处理错误
    this.instance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const responseData = response.data;

        // 处理两种响应格式：
        // 1. 统一响应格式: { code, message, data }
        // 2. 直接数据格式: 如 { access_token, refresh_token, token_type }
        if ('code' in responseData) {
          // 统一响应格式
          const { code, message, data } = responseData;
          if (code === 0 || code === 200) {
            return data;
          }
          // 业务错误
          this.handleBusinessError(code, message);
          return Promise.reject(new Error(message));
        } else {
          // 直接数据格式（如登录响应）
          return responseData;
        }
      },
      (error: AxiosError) => {
        this.handleHttpError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleBusinessError(code: number, message: string) {
    switch (code) {
      case 401:
        // 如果已经在登录页，不重复跳转（否则会清除登录页的 error state）
        if (window.location.pathname === '/login') return;
        useUserStore.getState().logout();
        window.location.href = '/login';
        break;
      case 403:
        console.error('权限不足:', message);
        break;
      case 404:
        console.error('资源不存在:', message);
        break;
      default:
        console.error('业务错误:', message);
    }
  }

  private handleHttpError(error: AxiosError) {
    if (error.response) {
      const { status } = error.response;
      switch (status) {
        case 401:
          // 登录接口返回 401 时不跳转（让 Login 组件显示错误信息）
          if (error.config?.url?.includes('/auth/login') || window.location.pathname === '/login') return;
          useUserStore.getState().logout();
          window.location.href = '/login';
          break;
        case 403:
          console.error('权限不足');
          break;
        case 404:
          console.error('请求的资源不存在');
          break;
        case 500:
          console.error('服务器内部错误');
          break;
        default:
          console.error('请求失败:', error.message);
      }
    } else if (error.request) {
      console.error('网络错误，请检查网络连接');
    } else {
      console.error('请求配置错误:', error.message);
    }
  }

  // 通用请求方法
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get(url, config);
  }

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post(url, data, config);
  }

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.put(url, data, config);
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete(url, config);
  }

  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.patch(url, data, config);
  }
}

export const request = new Request();
export default request;
