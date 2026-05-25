import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userApi } from '@/lib/api/modules/user';

export interface User {
  id: string;
  phone: string | null;
  email: string | null;
  nickname: string | null;
  avatar: string | null;
  username?: string;
  avatar_url?: string;
  real_name?: string;
  id_card_number?: string;
  id_card_verified: boolean;
  balance: number;
  status: number; // 0=禁用, 1=启用
  created_at: number;
  updated_at: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// localStorage key 常量，与 lib/api/client.ts 保持一致
const TOKEN_KEY = 'lcaitool_access_token';
const REFRESH_TOKEN_KEY = 'lcaitool_refresh_token';

function syncTokensToStorage(tokens: AuthTokens | null) {
  if (typeof window === 'undefined') return;
  if (tokens?.access_token) {
    localStorage.setItem(TOKEN_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (tokens: AuthTokens, user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshBalance: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user }),
      setTokens: (tokens) => {
        syncTokensToStorage(tokens);
        return set({ tokens });
      },
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      login: (tokens, user) => {
        syncTokensToStorage(tokens);
        return set({
          tokens,
          user,
          isAuthenticated: true,
          error: null,
        });
      },

      logout: () => {
        syncTokensToStorage(null);
        return set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        });
      },

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

      refreshBalance: async () => {
        try {
          const { balance } = await userApi.getBalance();
          set((state) => ({
            user: state.user ? { ...state.user, balance } : null,
          }));
        } catch {
          // 静默处理，不影响页面渲染
        }
      },
    }),
    {
      name: 'lcaitool-auth-storage',
      partialize: (state) => ({
        tokens: state.tokens,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // 恢复持久化数据后同步到 tokenStorage
      onRehydrateStorage: () => (state) => {
        if (state?.tokens) {
          syncTokensToStorage(state.tokens);
        }
      },
    }
  )
);

export default useAuthStore;

// 监听 axios 拦截器发出的强制登出事件
// 当 token 过期且刷新失败时，axios 拦截器清除 localStorage 并派发 auth:logout
// 此监听确保 Zustand store 状态同步更新
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    const state = useAuthStore.getState();
    if (state.isAuthenticated) {
      state.logout();
    }
  });
}
