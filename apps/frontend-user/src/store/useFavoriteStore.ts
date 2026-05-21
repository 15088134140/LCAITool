import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoriteState {
  favoriteToolIds: string[];
  toggleFavorite: (toolId: string) => void;
  isFavorite: (toolId: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favoriteToolIds: [],

      toggleFavorite: (toolId: string) => {
        const { favoriteToolIds } = get();
        const isCurrentlyFavorite = favoriteToolIds.includes(toolId);

        if (isCurrentlyFavorite) {
          set({
            favoriteToolIds: favoriteToolIds.filter(id => id !== toolId)
          });
        } else {
          set({
            favoriteToolIds: [...favoriteToolIds, toolId]
          });
        }
      },

      isFavorite: (toolId: string) => {
        return get().favoriteToolIds.includes(toolId);
      }
    }),
    {
      name: 'favorite-tools-storage'
    }
  )
);