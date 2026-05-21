/**
 * 创意模块 API
 */

import { api } from '../client';
import type {
  IdeaSubmission,
  IdeaVote,
  CreateIdeaRequest,
  VoteIdeaRequest,
  ListIdeasParams,
  PaginatedResponse,
} from '../types';

export const ideaApi = {
  /**
   * 提交创意
   */
  submitIdea: async (data: CreateIdeaRequest): Promise<IdeaSubmission> => {
    return api.post<IdeaSubmission>('/ideas', data);
  },

  /**
   * 获取创意列表
   */
  getIdeas: async (params?: ListIdeasParams): Promise<PaginatedResponse<IdeaSubmission>> => {
    return api.get<PaginatedResponse<IdeaSubmission>>('/ideas', { params });
  },

  /**
   * 获取创意详情
   */
  getIdea: async (id: string): Promise<IdeaSubmission> => {
    return api.get<IdeaSubmission>(`/ideas/${id}`);
  },

  /**
   * 投票
   */
  voteIdea: async (data: VoteIdeaRequest): Promise<IdeaVote> => {
    return api.post<IdeaVote>('/ideas/vote', data);
  },

  /**
   * 取消投票
   */
  cancelVote: async (ideaId: string): Promise<void> => {
    return api.delete<void>(`/ideas/${ideaId}/vote`);
  },

  /**
   * 获取热门创意
   */
  getHotIdeas: async (limit: number = 10): Promise<IdeaSubmission[]> => {
    return api.get<IdeaSubmission[]>('/ideas/hot', { params: { limit } });
  },

  /**
   * 获取用户提交的创意
   */
  getMyIdeas: async (page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<IdeaSubmission>> => {
    return api.get<PaginatedResponse<IdeaSubmission>>('/ideas/my', {
      params: { page, page_size: pageSize },
    });
  },

  /**
   * 增加创意浏览量
   */
  incrementIdeaView: async (id: string): Promise<void> => {
    return api.post<void>(`/ideas/${id}/view`);
  },
};

export default ideaApi;
