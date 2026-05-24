import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toolApi } from '@/lib/api/modules/tool';

interface FavoriteState {
  favoriteToolIds: string[];
  loaded: boolean;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (toolId: string) => Promise<void>;
  isFavorite: (toolId: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favoriteToolIds: [],
      loaded: false,

      loadFavorites: async () => {
        if (get().loaded) return;
        try {
          const res = await toolApi.getFavorites(1, 100);
          const ids = (res.items || []).map((item: any) => item.id).filter(Boolean);
          set({ favoriteToolIds: ids, loaded: true });
        } catch {
          // 未登录或接口异常时静默失败
          set({ loaded: true });
        }
      },

      toggleFavorite: async (toolId: string) => {
        const { favoriteToolIds } = get();
        const isCurrentlyFavorite = favoriteToolIds.includes(toolId);

        // 先乐观更新 UI
        if (isCurrentlyFavorite) {
          set({ favoriteToolIds: favoriteToolIds.filter(id => id !== toolId) });
        } else {
          set({ favoriteToolIds: [...favoriteToolIds, toolId] });
        }

        // 再同步后端
        try {
          await toolApi.toggleFavorite(toolId);
        } catch {
          // 失败时回滚
          if (isCurrentlyFavorite) {
            set({ favoriteToolIds: [...favoriteToolIds, toolId] });
          } else {
            set({ favoriteToolIds: favoriteToolIds.filter(id => id !== toolId) });
          }
        }
      },

      isFavorite: (toolId: string) => {
        return get().favoriteToolIds.includes(toolId);
      }
    }),
    {
      name: 'favorite-tools-storage',
      // 只持久化 favoriteToolIds，loaded 每次页面加载都重置为 false
      partialize: (state) => ({
        favoriteToolIds: state.favoriteToolIds,
      }),
      // 重新水化后标记为未加载，触发下一次 mount 时重新拉取
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.loaded = false;
          }
        };
      },
    }
  )
);
