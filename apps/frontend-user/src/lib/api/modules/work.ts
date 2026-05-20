/**
 * 成果模块 API
 */

import { api } from '../client';
import type {
  Work,
  WorkFile,
  WorkShare,
  ListWorksParams,
  PaginatedResponse,
} from '../types';

export const workApi = {
  /**
   * 获取成果列表
   */
  getWorks: async (params?: ListWorksParams): Promise<PaginatedResponse<Work>> => {
    return api.get<PaginatedResponse<Work>>('/works', { params });
  },

  /**
   * 获取成果详情
   */
  getWork: async (id: string): Promise<Work> => {
    return api.get<Work>(`/works/${id}`);
  },

  /**
   * 获取成果文件
   */
  getWorkFiles: async (workId: string): Promise<WorkFile[]> => {
    return api.get<WorkFile[]>(`/works/${workId}/files`);
  },

  /**
   * 更新成果信息
   */
  updateWork: async (
    id: string,
    data: Partial<Pick<Work, 'title' | 'description' | 'cover_image' | 'status' | 'is_public'>>
  ): Promise<Work> => {
    return api.put<Work>(`/works/${id}`, data);
  },

  /**
   * 删除成果
   */
  deleteWork: async (id: string): Promise<void> => {
    return api.delete<void>(`/works/${id}`);
  },

  /**
   * 基于已有成果继续优化
   */
  iterateWork: async (id: string, inputParams: Record<string, any>): Promise<{ task_id: string }> => {
    return api.post<{ task_id: string }>(`/works/${id}/iterate`, { input_params: inputParams });
  },

  /**
   * 获取成果版本历史
   */
  getWorkVersions: async (id: string): Promise<Work[]> => {
    return api.get<Work[]>(`/works/${id}/versions`);
  },

  /**
   * 分享成果
   */
  shareWork: async (
    id: string,
    data: Pick<WorkShare, 'share_type' | 'password' | 'expire_at'>
  ): Promise<WorkShare> => {
    return api.post<WorkShare>(`/works/${id}/share`, data);
  },

  /**
   * 获取分享信息
   */
  getWorkShare: async (shareId: string): Promise<WorkShare> => {
    return api.get<WorkShare>(`/works/share/${shareId}`);
  },

  /**
   * 点赞成果
   */
  likeWork: async (id: string): Promise<void> => {
    return api.post<void>(`/works/${id}/like`);
  },

  /**
   * 取消点赞
   */
  unlikeWork: async (id: string): Promise<void> => {
    return api.delete<void>(`/works/${id}/like`);
  },

  /**
   * 增加浏览量（公开成果）
   */
  incrementView: async (id: string): Promise<void> => {
    return api.post<void>(`/works/${id}/view`);
  },
};

export default workApi;
