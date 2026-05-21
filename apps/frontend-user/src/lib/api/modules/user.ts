/**
 * 用户模块 API
 */

import { api } from '../client';
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
} from '../types';

// 用户认证相关
export const authApi = {
  /**
   * 微信登录
   */
  wechatLogin: async (data: LoginRequest): Promise<LoginResponse> => {
    return api.post<LoginResponse>('/auth/wechat-login', data);
  },

  /**
   * 刷新Token
   */
  refreshToken: async (data: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
    return api.post<RefreshTokenResponse>('/auth/refresh', data);
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
};

export default userApi;
