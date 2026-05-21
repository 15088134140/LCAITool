/**
 * 工具模块 API
 */

import { api } from '../client';
import type {
  Tool,
  ToolCategory,
  ToolDemo,
  ToolRating,
  ToolFavorite,
  ListToolsParams,
  PaginatedResponse,
} from '../types';

// 工具分类相关
export const categoryApi = {
  /**
   * 获取所有分类
   */
  getCategories: async (): Promise<ToolCategory[]> => {
    return api.get<ToolCategory[]>('/categories');
  },

  /**
   * 获取单个分类详情
   */
  getCategory: async (id: string): Promise<ToolCategory> => {
    return api.get<ToolCategory>(`/categories/${id}`);
  },
};

// 工具相关
export const toolApi = {
  /**
   * 获取工具列表
   */
  getTools: async (params?: ListToolsParams): Promise<PaginatedResponse<Tool>> => {
    return api.get<PaginatedResponse<Tool>>('/tools', { params });
  },

  /**
   * 获取工具详情
   */
  getTool: async (id: string): Promise<Tool> => {
    return api.get<Tool>(`/tools/${id}`);
  },

  /**
   * 根据slug获取工具详情
   */
  getToolBySlug: async (slug: string): Promise<Tool> => {
    return api.get<Tool>(`/tools/slug/${slug}`);
  },

  /**
   * 获取热门工具
   */
  getHotTools: async (limit: number = 10): Promise<Tool[]> => {
    return api.get<Tool[]>('/tools/hot', { params: { limit } });
  },

  /**
   * 获取新品工具
   */
  getNewTools: async (limit: number = 10): Promise<Tool[]> => {
    return api.get<Tool[]>('/tools/new', { params: { limit } });
  },

  /**
   * 获取推荐工具
   */
  getFeaturedTools: async (limit: number = 10): Promise<Tool[]> => {
    return api.get<Tool[]>('/tools/featured', { params: { limit } });
  },

  /**
   * 获取工具演示案例
   */
  getToolDemos: async (toolId: string): Promise<ToolDemo[]> => {
    return api.get<ToolDemo[]>(`/tools/${toolId}/demos`);
  },

  /**
   * 获取工具评价
   */
  getToolRatings: async (toolId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<ToolRating>> => {
    return api.get<PaginatedResponse<ToolRating>>(`/tools/${toolId}/ratings`, {
      params: { page, page_size: pageSize },
    });
  },

  /**
   * 收藏工具
   */
  favoriteTool: async (toolId: string): Promise<ToolFavorite> => {
    return api.post<ToolFavorite>(`/tools/${toolId}/favorite`);
  },

  /**
   * 取消收藏工具
   */
  unfavoriteTool: async (toolId: string): Promise<void> => {
    return api.delete<void>(`/tools/${toolId}/favorite`);
  },

  /**
   * 获取用户收藏的工具
   */
  getFavorites: async (page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Tool>> => {
    return api.get<PaginatedResponse<Tool>>('/tools/favorites', {
      params: { page, page_size: pageSize },
    });
  },
};

export default toolApi;
