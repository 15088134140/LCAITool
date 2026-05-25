/**
 * 灵创AI工具箱 - 用户状态管理
 * 使用 Zustand 管理用户登录状态、用户信息、积分等
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User as ApiUser, LoginResponse } from '../lib/api/types';
import { tokenStorage } from '../lib/api/client';
import { userApi } from '../lib/api/modules/user';

// 重新导出类型，兼容已有的导入
export type User = ApiUser;

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface UserStoreState {
  // 状态
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // 基础操作
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // 认证操作
  login: (loginResponse: LoginResponse) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;

  // API操作
  fetchCurrentUser: () => Promise<void>;
  refreshUserBalance: () => Promise<void>;
  submitRealNameVerification: (data: {
    real_name: string;
    id_card_number: string;
    front_image?: string;
    back_image?: string;
    hold_image?: string;
  }) => Promise<void>;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set) => ({
      // 初始状态
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      isRefreshing: false,
      error: null,

      // 基础操作
      setUser: (user) => set({ user }),
      setTokens: (tokens) => set({ tokens }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // 登录
      login: (loginResponse) => {
        const { access_token, refresh_token, token_type, user } = loginResponse;

        // 同时更新 localStorage（与 tokenStorage 保持同步）
        tokenStorage.setToken(access_token);

        set({
          tokens: { access_token, refresh_token, token_type },
          user,
          isAuthenticated: true,
          error: null,
        });
      },

      // 登出
      logout: () => {
        // 清除 localStorage
        tokenStorage.clearAll();

        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // 更新用户信息
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

      // 获取当前用户信息
      fetchCurrentUser: async () => {
        set({ isLoading: true, error: null });
        try {
          const user = await userApi.getCurrentUser();
          set({ user, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取用户信息失败',
            isLoading: false,
          });
          throw error;
        }
      },

      // 刷新用户积分
      refreshUserBalance: async () => {
        try {
          const user = await userApi.getCurrentUser();
          set((state) => ({
            user: state.user ? { ...state.user, balance: user.balance, frozen_balance: user.frozen_balance } : user,
          }));
        } catch (error) {
          console.error('刷新用户积分失败:', error);
        }
      },

      // 提交实名认证
      submitRealNameVerification: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const verification = await userApi.submitRealNameVerification({
            real_name: data.real_name,
            id_card_number: data.id_card_number,
            front_image: data.front_image,
            back_image: data.back_image,
            hold_image: data.hold_image,
          });
          // 更新用户的认证状态
          set((state) => ({
            user: state.user ? { ...state.user, id_card_verified: verification.verification_status === 'approved' } : null,
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '实名认证提交失败',
            isLoading: false,
          });
          throw error;
        }
      },
    }),
    {
      name: 'lcaitool-user-storage',
      // 只持久化需要持久化的字段
      partialize: (state) => ({
        tokens: state.tokens,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // 恢复数据后同步到 tokenStorage
      onRehydrateStorage: () => (state) => {
        if (state?.tokens) {
          tokenStorage.setToken(state.tokens.access_token);
        }
      },
    }
  )
);

// 便捷的 Hooks
export const useUser = () => useUserStore((state) => state.user);
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);
export const useUserBalance = () => useUserStore((state) => state.user?.balance ?? 0);
export const useIsIdCardVerified = () => useUserStore((state) => state.user?.id_card_verified ?? false);

export default useUserStore;
