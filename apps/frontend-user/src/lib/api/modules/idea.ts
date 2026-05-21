/**
 * 创意模块 API
 */

import { api } from '../client';
import type {
  IdeaSubmission,
  IdeaVote,
  CreateIdeaRequest,
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
  getIdeas: async (params?: ListIdeasParams & { sort?: string }): Promise<PaginatedResponse<IdeaSubmission>> => {
    const mappedParams: Record<string, any> = {
      page: params?.page,
      page_size: params?.page_size,
      category: params?.category,
      sort: params?.sort || 'votes',
    };
    return api.get<PaginatedResponse<IdeaSubmission>>('/ideas', { params: mappedParams });
  },

  /**
   * 获取创意详情
   */
  getIdea: async (id: string): Promise<IdeaSubmission & { has_voted: boolean }> => {
    return api.get<IdeaSubmission & { has_voted: boolean }>(`/ideas/${id}`);
  },

  /**
   * 投票
   */
  voteIdea: async (ideaId: string, vote_type: 'up' | 'down' = 'up'): Promise<IdeaVote> => {
    return api.post<IdeaVote>(`/ideas/${ideaId}/vote`, undefined, { params: { vote_type } });
  },

  /**
   * 获取我投票过的创意
   */
  getMyVotes: async (params?: ListIdeasParams): Promise<PaginatedResponse<IdeaSubmission>> => {
    return api.get<PaginatedResponse<IdeaSubmission>>('/ideas/my-votes', { params });
  },

  /**
   * 取消投票
   */
  cancelVote: async (ideaId: string): Promise<{ message: string; idea_id: string }> => {
    return api.delete<{ message: string; idea_id: string }>(`/ideas/${ideaId}/vote`);
  },
};

export default ideaApi;
