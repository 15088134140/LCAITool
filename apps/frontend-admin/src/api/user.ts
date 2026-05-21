import request from '@/utils/request';

export interface User {
  id: string;
  avatar?: string | null;
  nickname: string | null;
  phone: string | null;
  email?: string | null;
  id_card_verified: boolean;
  id_card_name?: string | null;
  balance: number;
  frozen_balance?: number;
  status: number; // 1=正常, 0=禁用
  created_at: number;
  updated_at: number;
}

export interface UserListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
  idCardVerified?: boolean;
}

export interface UserListResponse {
  list: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateUserParams {
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
  email?: string;
}

export interface UpdateUserParams {
  id: string;
  nickname?: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

export interface AdjustBalanceParams {
  amount: number;
  reason: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  reason?: string;
  related_id?: string;
  related_type?: string;
  balance_before: number;
  balance_after: number;
  operator?: string;
  remark?: string;
  created_at: number;
}

export interface PointHistoryResponse {
  items: PointTransaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface Verification {
  user_id: string;
  nickname: string;
  real_name?: string;
  id_card_verified: boolean;
  phone?: string;
}

export interface VerificationListResponse {
  items: Verification[];
  total: number;
  page: number;
  page_size: number;
}

export interface Order {
  id: string;
  order_no: string;
  user_id: string;
  user_nickname?: string;
  user_phone?: string;
  user?: {
    id: string;
    nickname: string;
    phone?: string;
    avatar?: string;
  };
  pay_amount: number;
  base_points: number;
  bonus_points: number;
  total_points: number;
  payment_provider: string;
  status: string;
  third_party_order_no?: string;
  paid_at?: number;
  expired_at?: number;
  client_ip?: string;
  device_info?: string;
  reconciliation_status?: string;
  reconciled_at?: number;
  remark?: string;
  created_at: number;
  updated_at?: number;
}

export interface OrderListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
  startDate?: number;
  endDate?: number;
}

export interface OrderListResponse {
  list: Order[];
  total: number;
  page: number;
  page_size: number;
}

export const userApi = {
  // 获取用户列表
  getList: (params: UserListParams) => {
    // 过滤空值参数，转换为后端期望的格式
    const filteredParams: Record<string, any> = {
      page: params.page,
      page_size: params.pageSize,
    };
    if (params.keyword && params.keyword.trim()) {
      filteredParams.search = params.keyword.trim();
    }
    if (params.status && params.status.trim()) {
      // 前端字符串 'active'/'disabled' -> 后端整数 1/0
      filteredParams.status = params.status === 'active' ? 1 : 0;
    }
    if (params.idCardVerified !== undefined && params.idCardVerified !== null) {
      filteredParams.idCardVerified = params.idCardVerified;
    }
    return request.get<UserListResponse>('/admin/users', { params: filteredParams });
  },

  // 创建用户
  create: (data: CreateUserParams) => {
    return request.post<User>('/admin/users', data);
  },

  // 更新用户
  update: (data: UpdateUserParams) => {
    return request.put<User>(`/admin/users/${data.id}`, data);
  },

  // 删除用户
  delete: (id: string) => {
    return request.delete(`/admin/users/${id}`);
  },

  // 调整积分
  adjustPoints: (data: { userId: string; points: number; reason: string }) => {
    return request.post<User>(`/admin/users/${data.userId}/adjust-balance`, {
      amount: data.points,
      reason: data.reason,
    });
  },

  // 获取用户详情
  getDetail: (id: string) => {
    return request.get<User>(`/admin/users/${id}`);
  },

  // 启用/禁用用户
  toggleStatus: (id: string, status: string) => {
    // 前端 status: 'active'/'disabled' -> 后端: 1/0
    const statusValue = status === 'active' ? 1 : 0;
    return request.put<User>(`/admin/users/${id}/status?status=${statusValue}`);
  },

  // 获取用户积分历史
  getPointHistory: (userId: string, page: number = 1, pageSize: number = 20) => {
    return request.get<PointHistoryResponse>(`/admin/users/${userId}/points/history`, {
      params: { page, page_size: pageSize },
    });
  },

  // 获取实名认证列表
  getVerifications: (page: number = 1, pageSize: number = 20, status?: boolean) => {
    const params: Record<string, any> = { page, page_size: pageSize };
    if (status !== undefined) {
      params.status = status;
    }
    return request.get<VerificationListResponse>('/admin/verifications', { params });
  },

  // 审核通过实名认证
  approveVerification: (userId: string) => {
    return request.put(`/admin/verifications/${userId}/approve`);
  },

  // 驳回实名认证
  rejectVerification: (userId: string, reason: string) => {
    return request.put(`/admin/verifications/${userId}/reject`, { reject_reason: reason });
  },
};

export const orderApi = {
  // 获取订单列表
  getList: (params: OrderListParams) => {
    const filteredParams: Record<string, any> = {
      page: params.page,
      page_size: params.pageSize,
    };
    if (params.keyword && params.keyword.trim()) {
      filteredParams.search = params.keyword.trim();
    }
    if (params.status) {
      filteredParams.status = params.status;
    }
    if (params.startDate) {
      filteredParams.start_date = params.startDate;
    }
    if (params.endDate) {
      filteredParams.end_date = params.endDate;
    }
    return request.get<OrderListResponse>('/admin/orders', { params: filteredParams });
  },

  // 获取订单详情
  getDetail: (id: string) => {
    return request.get<Order>(`/admin/orders/${id}`);
  },

  // 订单退款
  refund: (id: string, reason: string) => {
    return request.post(`/admin/orders/${id}/refund`, { refund_reason: reason });
  },

  // 更新订单状态
  updateStatus: (id: string, status: string, remark?: string) => {
    const data: Record<string, any> = { status };
    if (remark) {
      data.remark = remark;
    }
    return request.put(`/admin/orders/${id}/status`, data);
  },
};
