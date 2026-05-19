import { create } from 'zustand';
import type { Tool, Review, GetToolsParams } from '../types';
import type { ToolProvider } from '../providers';
import { ApiToolProvider } from '../providers';

interface ToolState {
  // 列表状态
  tools: Tool[];
  totalTools: number;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  categoryFilter: string | null;

  // 详情状态
  currentTool: Tool | null;
  currentToolReviews: Review[];
  totalReviews: number;
  detailLoading: boolean;

  // Actions
  fetchTools: (params?: { categoryId?: string | null; search?: string; isFeatured?: boolean }) => Promise<void>;
  fetchToolDetail: (id: string) => Promise<void>;
  fetchToolReviews: (toolId: string, page?: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (categoryId: string | null) => void;
  clearCurrentTool: () => void;
}

const provider: ToolProvider = new ApiToolProvider();

export const useToolStore = create<ToolState>((set, get) => ({
  // 列表状态
  tools: [],
  totalTools: 0,
  loading: false,
  error: null,
  searchQuery: '',
  categoryFilter: null,

  // 详情状态
  currentTool: null,
  currentToolReviews: [],
  totalReviews: 0,
  detailLoading: false,

  fetchTools: async (params) => {
    try {
      set({ loading: true, error: null });
      const queryParams: GetToolsParams = {};
      const categoryId = params?.categoryId ?? get().categoryFilter;
      const search = params?.search || get().searchQuery;
      if (categoryId) queryParams['categoryId'] = categoryId;
      if (search) queryParams['search'] = search;
      if (params?.isFeatured) queryParams['isFeatured'] = true;
      const result = await provider.getTools(queryParams);
      set({ tools: result.items, totalTools: result.total, loading: false });
    } catch (err) {
      set({ error: '获取工具列表失败', loading: false });
    }
  },

  fetchToolDetail: async (id: string) => {
    try {
      set({ detailLoading: true, error: null });
      const tool = await provider.getToolById(id);
      set({ currentTool: tool, detailLoading: false });
    } catch (err) {
      set({ error: '获取工具详情失败', detailLoading: false });
    }
  },

  fetchToolReviews: async (toolId: string, page: number = 1) => {
    try {
      const result = await provider.getToolReviews(toolId, page, 10);
      set({
        currentToolReviews: result.items,
        totalReviews: result.total
      });
    } catch (err) {
      set({ error: '获取评价失败' });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setCategoryFilter: (categoryId: string | null) => {
    set({ categoryFilter: categoryId });
  },

  clearCurrentTool: () => {
    set({ currentTool: null, currentToolReviews: [], totalReviews: 0 });
  },
}));
