import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  phone: string | null;
  email: string | null;
  nickname: string | null;
  avatar: string | null;
  username?: string;
  avatar_url?: string;
  id_card?: string;
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
    }),
    {
      name: 'lcaitool-auth-storage',
      partialize: (state) => ({
        tokens: state.tokens,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
