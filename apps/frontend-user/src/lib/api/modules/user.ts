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
    return api.get<User>('/user/me');
  },

  /**
   * 更新用户信息
   */
  updateUser: async (data: Partial<Pick<User, 'nickname' | 'avatar' | 'email' | 'phone'>>): Promise<User> => {
    return api.put<User>('/user/me', data);
  },

  /**
   * 提交实名认证
   */
  submitRealNameVerification: async (data: RealNameVerificationRequest): Promise<RealNameVerification> => {
    return api.post<RealNameVerification>('/user/real-name-verification', data);
  },

  /**
   * 获取实名认证状态
   */
  getRealNameVerification: async (): Promise<RealNameVerification | null> => {
    return api.get<RealNameVerification | null>('/user/real-name-verification');
  },

  /**
   * 获取积分交易记录
   */
  getTransactions: async (params?: ListTransactionsParams): Promise<PaginatedResponse<PointTransaction>> => {
    return api.get<PaginatedResponse<PointTransaction>>('/user/transactions', { params });
  },
};

export default userApi;
