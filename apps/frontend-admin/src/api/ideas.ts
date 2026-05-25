import request from '@/utils/request';

export interface AdminIdea {
  id: string;
  user_id: string;
  user_nickname: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  vote_count: number;
  view_count: number;
  status: string;
  admin_remark: string | null;
  admin_id: string | null;
  reviewed_at: number | null;
  created_at: number;
}

export interface IdeasListResult {
  items: AdminIdea[];
  total: number;
  page: number;
  page_size: number;
}

export const ideasApi = {
  getList: (params?: {
    status?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
  }): Promise<IdeasListResult> => request.get('/admin/ideas', { params }),

  approve: (id: string, remark?: string): Promise<{ message: string; id: string; status: string }> =>
    request.put(`/admin/ideas/${id}/approve`, { remark }),

  reject: (id: string, remark: string): Promise<{ message: string; id: string; status: string }> =>
    request.put(`/admin/ideas/${id}/reject`, { remark }),

  implement: (id: string): Promise<{ message: string; id: string; status: string }> =>
    request.put(`/admin/ideas/${id}/implement`),

  unapprove: (id: string, remark?: string): Promise<{ message: string; id: string; status: string }> =>
    request.put(`/admin/ideas/${id}/unapprove`, { remark }),
};
