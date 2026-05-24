import request from '@/utils/request';

export interface AdminRating {
  id: string;
  user_id: string;
  user_nickname: string;
  user_avatar?: string | null;
  tool_id: string;
  tool_name: string;
  task_id: string;
  rating: number;
  content?: string | null;
  images?: string | null;
  is_useful_count: number;
  status: number;
  admin_reply?: string | null;
  replied_at?: number | null;
  created_at: number;
}

export interface RatingListResponse {
  items: AdminRating[];
  total: number;
  page: number;
  page_size: number;
}

export interface RatingListParams {
  page: number;
  pageSize: number;
  tool_id?: string;
  rating_value?: number;
  status?: number;
  keyword?: string;
}

const ADMIN_PREFIX = '/admin';

export const ratingApi = {
  /**
   * 获取评价列表
   */
  getList: async (params: RatingListParams): Promise<RatingListResponse> => {
    const filteredParams: Record<string, any> = {
      page: params.page,
      page_size: params.pageSize,
    };
    if (params.tool_id) filteredParams.tool_id = params.tool_id;
    if (params.rating_value !== undefined) filteredParams.rating_value = params.rating_value;
    if (params.status !== undefined) filteredParams.status = params.status;
    if (params.keyword) filteredParams.keyword = params.keyword;
    return request.get<RatingListResponse>(`${ADMIN_PREFIX}/ratings`, { params: filteredParams });
  },

  /**
   * 切换评价显示状态
   */
  toggleStatus: (ratingId: string, status: number) => {
    return request.put(`${ADMIN_PREFIX}/ratings/${ratingId}/status`, { status });
  },

  /**
   * 管理员回复评价
   */
  reply: (ratingId: string, content: string) => {
    return request.post(`${ADMIN_PREFIX}/ratings/${ratingId}/reply`, { content });
  },
};

export default ratingApi;
