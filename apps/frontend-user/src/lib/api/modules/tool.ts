/**
 * 工具模块 API
 */

import { api } from '../client';
import type {
  Tool,
  ToolCategory,
  ToolDemo,
  ToolRating,
  ListToolsParams,
  PaginatedResponse,
} from '../types';

// 工具分类相关
export const categoryApi = {
  /**
   * 获取所有分类
   */
  getCategories: async (): Promise<PaginatedResponse<ToolCategory>> => {
    return api.get<PaginatedResponse<ToolCategory>>('/tools/categories/list');
  },
};

// 工具相关
export const toolApi = {
  /**
   * 获取工具列表
   */
  getTools: async (params?: ListToolsParams & { sort_by?: string }) => {
    const mappedParams: Record<string, any> = {
      page: params?.page,
      page_size: params?.page_size,
      category: params?.category_id,
      search: params?.search,
      sort_by: params?.sort_by,
    };
    if (params?.is_featured !== undefined) mappedParams['is_featured'] = params.is_featured;
    if (params?.is_hot !== undefined) mappedParams['is_hot'] = params.is_hot;
    if (params?.is_new !== undefined) mappedParams['is_new'] = params.is_new;
    return api.get<PaginatedResponse<Tool>>('/tools', { params: mappedParams });
  },

  /**
   * 获取工具详情
   */
  getTool: async (id: string): Promise<Tool> => {
    return api.get<Tool>(`/tools/${id}`);
  },

  /**
   * 获取工具演示案例
   */
  getToolDemos: async (toolId: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<ToolDemo>> => {
    return api.get<PaginatedResponse<ToolDemo>>(`/tools/${toolId}/demos`, {
      params: { page, page_size: pageSize },
    });
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
   * 获取工具评价（兼容旧名）
   */
  getToolReviews: async (toolId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<ToolRating>> => {
    return api.get<PaginatedResponse<ToolRating>>(`/tools/${toolId}/ratings`, {
      params: { page, page_size: pageSize },
    });
  },

  /**
   * 创建工具评价
   */
  createToolRating: async (toolId: string, data: {
    rating: number;
    content?: string;
    images?: string[];
  }): Promise<ToolRating> => {
    return api.post<ToolRating>(`/tools/${toolId}/ratings`, data);
  },

  /**
   * 收藏/取消收藏工具
   */
  toggleFavorite: async (toolId: string): Promise<{ is_favorited: boolean; message: string }> => {
    return api.post<{ is_favorited: boolean; message: string }>(`/tools/${toolId}/favorite`);
  },

  /**
   * 获取用户收藏的工具
   */
  getFavorites: async (page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Tool>> => {
    return api.get<PaginatedResponse<Tool>>('/tools/favorites/list', {
      params: { page, page_size: pageSize },
    });
  },
};

export default toolApi;
