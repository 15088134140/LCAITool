import request from '@/utils/request';

export interface User {
  id: string;
  avatar?: string | null;
  nickname: string | null;
  phone: string | null;
  id_card_verified: boolean;
  balance: number;
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
    return request.post<User>(`/admin/users/${data.userId}/adjust-balance`, data);
  },

  // 获取用户详情
  getDetail: (id: string) => {
    return request.get<User>(`/admin/users/${id}`);
  },

  // 启用/禁用用户
  toggleStatus: (id: string, status: string) => {
    return request.put<User>(`/admin/users/${id}/status?status=${status}`);
  },
};
