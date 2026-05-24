import request from '@/utils/request';

export interface AdminFeedback {
  id: string;
  user_id: string;
  user_nickname: string;
  user_avatar?: string | null;
  type: string;
  title: string;
  description?: string | null;
  contact?: string | null;
  status: string;
  admin_reply?: string | null;
  reply_points?: number | null;
  replied_at?: number | null;
  rewarded_at?: number | null;
  created_at: number;
}

export interface FeedbackListResponse {
  items: AdminFeedback[];
  total: number;
  page: number;
  page_size: number;
}

export interface FeedbackListParams {
  page: number;
  page_size: number;
  status?: string;
  type?: string;
  keyword?: string;
}

const ADMIN_PREFIX = '/admin';

export const feedbackApi = {
  /**
   * 获取反馈列表
   */
  getList: async (params: FeedbackListParams): Promise<FeedbackListResponse> => {
    const filteredParams: Record<string, any> = {
      page: params.page,
      page_size: params.page_size,
    };
    if (params.status) filteredParams.status = params.status;
    if (params.type) filteredParams.type = params.type;
    if (params.keyword) filteredParams.keyword = params.keyword;
    return request.get<FeedbackListResponse>(`${ADMIN_PREFIX}/feedbacks`, { params: filteredParams });
  },

  /**
   * 管理员回复反馈
   */
  reply: (id: string, reply: string) => {
    return request.post(`${ADMIN_PREFIX}/feedbacks/${id}/reply`, { reply });
  },

  /**
   * 采纳反馈并奖励积分
   */
  reward: (id: string, points: number) => {
    return request.post(`${ADMIN_PREFIX}/feedbacks/${id}/reward`, { points });
  },
};

export default feedbackApi;
