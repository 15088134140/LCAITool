import { create } from 'zustand';
import type { Category } from '../types';
import type { ToolProvider } from '../providers';
import { MockToolProvider } from '../providers';

interface CategoryState {
  categories: Category[];
  selectedCategoryId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchCategories: () => Promise<void>;
  setSelectedCategory: (categoryId: string | null) => void;
}

const provider: ToolProvider = new MockToolProvider();

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  selectedCategoryId: null,
  loading: false,
  error: null,

  fetchCategories: async () => {
    try {
      set({ loading: true, error: null });
      const categories = await provider.getCategories();
      // 按 sortOrder 排序
      const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
      set({ categories: sorted, loading: false });
    } catch (err) {
      set({ error: '获取分类失败', loading: false });
    }
  },

  setSelectedCategory: (categoryId) => {
    set({ selectedCategoryId: categoryId });
  },
}));
