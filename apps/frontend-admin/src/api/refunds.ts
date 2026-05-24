import request from '@/utils/request';

export interface RefundOrder {
  id: string;
  order_no: string;
  user_id: string;
  user_nickname: string;
  pay_amount: number;
  base_points: number;
  bonus_points: number;
  total_points: number;
  payment_provider: string;
  status: string;
  remark: string | null;
  paid_at: number | null;
  created_at: number;
}

export interface RefundsListResult {
  items: RefundOrder[];
  total: number;
  page: number;
  page_size: number;
}

export const refundsApi = {
  getList: (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<RefundsListResult> => request.get('/admin/refunds', { params }),

  process: (id: string): Promise<{ message: string; order_id: string; refund_amount: number }> =>
    request.post(`/admin/refunds/${id}/process`),
};
