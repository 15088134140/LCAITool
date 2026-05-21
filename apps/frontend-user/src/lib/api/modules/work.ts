/**
 * 成果模块 API
 */

import { api } from '../client';
import type {
  Work,
  WorkShare,
  WorkFile,
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
   * 基于已有成果继续优化（迭代创作）
   */
  iterateWork: async (id: string, data: { title?: string; description?: string }): Promise<Work> => {
    return api.post<Work>(`/works/${id}/iterate`, data);
  },

  /**
   * 设置成果分享
   */
  setWorkShare: async (
    id: string,
    data: Pick<WorkShare, 'share_type' | 'password'> & { expire_days?: number }
  ): Promise<WorkShare> => {
    return api.put<WorkShare>(`/works/${id}/share`, data);
  },

  /**
   * 检查成果下载权限
   */
  checkDownloadPermission: async (id: string): Promise<{
    work_id: string;
    has_permission: boolean;
    message: string;
  }> => {
    return api.get<{
      work_id: string;
      has_permission: boolean;
      message: string;
    }>(`/works/${id}/download-permission`);
  },

  /**
   * 获取成果文件列表
   */
  getWorkFiles: async (id: string): Promise<WorkFile[]> => {
    return api.get<WorkFile[]>(`/works/${id}/files`);
  },

  /**
   * 获取成果版本历史
   */
  getWorkVersions: async (id: string): Promise<Work[]> => {
    return api.get<Work[]>(`/works/${id}/versions`);
  },
};

export default workApi;
