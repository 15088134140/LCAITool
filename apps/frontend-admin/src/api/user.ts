import request from '@/utils/request';

export interface User {
  id: string;
  avatar?: string | null;
  nickname: string | null;
  phone: string | null;
  idCardVerified: boolean;
  points: number;
  status: string; // 'active'=正常, 'disabled'=禁用
  createdAt: number;
  updatedAt: number;
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
    return request.get<UserListResponse>('/admin/users', { params });
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
