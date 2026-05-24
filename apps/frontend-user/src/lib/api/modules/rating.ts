/**
 * 评价模块 API
 */

import { api } from '../client';
import type { ToolRating, PaginatedResponse } from '../types';

export interface RatingStats {
  avg_rating: number;
  total_count: number;
  distribution: Record<number, number>;
}

export interface CreateRatingParams {
  tool_id: string;
  task_id: string;
  rating: number;
  content?: string;
  images?: string;
}

export const ratingApi = {
  /**
   * 创建评价
   */
  createRating: async (toolId: string, data: Omit<CreateRatingParams, 'tool_id'>): Promise<ToolRating> => {
    return api.post<ToolRating>(`/tools/${toolId}/ratings`, {
      tool_id: toolId,
      ...data,
    });
  },

  /**
   * 获取工具评价列表
   */
  getToolRatings: async (toolId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<ToolRating>> => {
    return api.get<PaginatedResponse<ToolRating>>(`/tools/${toolId}/ratings`, {
      params: { page, page_size: pageSize },
    });
  },

  /**
   * 获取工具评分统计
   */
  getRatingStats: async (toolId: string): Promise<RatingStats> => {
    return api.get<RatingStats>(`/tools/${toolId}/ratings/stats`);
  },

  /**
   * 标记评价有用
   */
  markUseful: async (ratingId: string): Promise<{ is_useful_count: number; message: string }> => {
    return api.post<{ is_useful_count: number; message: string }>(`/tools/ratings/${ratingId}/useful`);
  },
};

export default ratingApi;
