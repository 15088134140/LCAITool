/**
 * 用户模块 API
 */

import { api, apiClient } from '../client';
import type {
  User,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RealNameVerificationRequest,
  RealNameVerification,
  PointTransaction,
  ListTransactionsParams,
  PaginatedResponse,
  RegisterRequest,
  RegisterResponse,
  UserStats,
  ApiKey,
  ApiKeyCreated,
  ApiKeyReveal,
} from '../types';

// API基础URL
const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] || '/api/v1';

// 用户认证相关
export const authApi = {
  /**
   * 微信登录
   */
  wechatLogin: async (data: LoginRequest): Promise<LoginResponse> => {
    return api.post<LoginResponse>('/auth/wechat-login', data);
  },

  /**
   * 账号密码登录（form-urlencoded，兼容 OAuth2PasswordRequestForm）
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const response = await apiClient.post<LoginResponse>('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },

  /**
   * 用户注册
   */
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    return api.post<RegisterResponse>('/auth/register', data);
  },

  /**
   * 刷新Token
   */
  refreshToken: async (data: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
    return api.post<RefreshTokenResponse>('/auth/refresh', data);
  },

  /**
   * 获取当前用户信息（支持可选显式token）
   */
  getCurrentUser: async (accessToken?: string): Promise<User> => {
    if (accessToken) {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err.detail || '获取用户信息失败');
      }
      return response.json();
    }
    return api.get<User>('/users/me');
  },

  /**
   * 登出
   */
  logout: async (): Promise<void> => {
    return api.post<void>('/auth/logout');
  },
};

// 用户信息相关
export const userApi = {
  /**
   * 获取当前用户信息
   */
  getCurrentUser: async (): Promise<User> => {
    return api.get<User>('/users/me');
  },

  /**
   * 更新用户信息
   */
  updateUser: async (data: Partial<Pick<User, 'nickname' | 'avatar' | 'email' | 'phone'>>): Promise<User> => {
    return api.put<User>('/users/me', data);
  },

  /**
   * 提交实名认证
   */
  submitRealNameVerification: async (data: RealNameVerificationRequest): Promise<RealNameVerification> => {
    return api.post<RealNameVerification>('/users/verify-id', data);
  },

  /**
   * 获取实名认证状态
   */
  getRealNameVerification: async (): Promise<RealNameVerification | null> => {
    return api.get<RealNameVerification | null>('/users/verify-id');
  },

  /**
   * 获取用户积分余额
   */
  getBalance: async (): Promise<{ balance: number }> => {
    return api.get<{ balance: number }>('/users/balance');
  },

  /**
   * 获取积分交易记录
   */
  getTransactions: async (params?: ListTransactionsParams): Promise<PaginatedResponse<PointTransaction>> => {
    return api.get<PaginatedResponse<PointTransaction>>('/users/transactions', { params });
  },

  /**
   * 修改密码
   */
  changePassword: async (old_password: string, new_password: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/users/change-password', { old_password, new_password });
  },

  /**
   * 发送手机验证码
   */
  sendVerificationCode: async (phone: string): Promise<{ message: string; expire_minutes: number }> => {
    return api.post<{ message: string; expire_minutes: number }>('/users/send-code', { phone });
  },

  /**
   * 更换手机号
   */
  changePhone: async (phone: string, code: string): Promise<{ message: string; phone: string }> => {
    return api.post<{ message: string; phone: string }>('/users/change-phone', { phone, code });
  },

  /**
   * 获取用户统计数据
   */
  getStats: async (): Promise<UserStats> => {
    return api.get<UserStats>('/users/stats');
  },

  /**
   * 获取签到状态
   */
  getCheckinStatus: () =>
    api.get<{ today_checked: boolean; streak: number; can_checkin: boolean }>('/users/checkin/status'),

  /**
   * 执行签到
   */
  doCheckin: () =>
    api.post<{ streak: number; points_earned: number; total_points: number }>('/users/checkin'),

  /**
   * 获取邀请信息
   */
  getInviteInfo: () =>
    api.get<{ invite_code: string; invite_url: string; invited_count: number; total_rewards: number }>('/users/invite/info'),

  /**
   * 获取邀请记录列表
   */
  getInviteList: () =>
    api.get<Array<{ invited_user: string; registered_at: number; recharge_status: string; reward: number }>>('/users/invite/list'),

  // ============== API Key 管理 ==============

  /**
   * 获取当前用户的 API Key 列表
   */
  getApiKeys: () =>
    api.get<ApiKey[]>('/users/api-keys'),

  /**
   * 创建 API Key
   */
  createApiKey: (data: { name: string }) =>
    api.post<ApiKeyCreated>('/users/api-keys', data),

  /**
   * 查看 API Key 明文（30秒后自动过期）
   */
  revealApiKey: (id: string) =>
    api.get<ApiKeyReveal>(`/users/api-keys/${id}/reveal`),

  /**
   * 更新 API Key 状态（active / disabled）
   */
  updateApiKeyStatus: (id: string, data: { status: string }) =>
    api.put<ApiKey>(`/users/api-keys/${id}/status`, data),

  /**
   * 删除 API Key
   */
  deleteApiKey: (id: string) =>
    api.delete<{ message: string }>(`/users/api-keys/${id}`),
};

export default userApi;
