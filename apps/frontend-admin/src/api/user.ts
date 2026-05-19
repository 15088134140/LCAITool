// import request from '@/utils/request';

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

// 模拟数据
const mockUsers: User[] = Array.from({ length: 50 }, (_, i) => ({
  id: `${i + 1}`,
  avatar: '',
  nickname: `用户${i + 1}`,
  phone: `138${String(i).padStart(8, '0')}`,
  idCardVerified: i % 3 === 0,
  points: Math.floor(Math.random() * 1000),
  status: i % 5 === 0 ? 'disabled' : 'active',
  createdAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
  updatedAt: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
}));

export const userApi = {
  // 获取用户列表
  getList: (params: UserListParams) => {
    // 模拟API响应
    return new Promise<UserListResponse>((resolve) => {
      setTimeout(() => {
        let filtered = [...mockUsers];

        if (params.keyword) {
          filtered = filtered.filter(
            (u) =>
              (u.nickname && u.nickname.includes(params.keyword!)) ||
              (u.phone && u.phone.includes(params.keyword!))
          );
        }

        if (params.status !== undefined && params.status !== '') {
          filtered = filtered.filter((u) => u.status === params.status);
        }

        if (params.idCardVerified !== undefined) {
          filtered = filtered.filter((u) => u.idCardVerified === params.idCardVerified);
        }

        const start = (params.page - 1) * params.pageSize;
        const list = filtered.slice(start, start + params.pageSize);

        resolve({
          list,
          total: filtered.length,
          page: params.page,
          pageSize: params.pageSize,
        });
      }, 300);
    });
    // return request.get<UserListResponse>('/admin/users', { params });
  },

  // 创建用户
  create: (data: any) => {
    // return request.post<User>('/admin/users', data);
    return Promise.resolve({
      id: String(Date.now()),
      phone: null,
      email: data.email || null,
      nickname: data.nickname || null,
      avatar: null,
      idCardVerified: false,
      points: 0,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },

  // 更新用户
  update: (data: { id: string; nickname?: string; phone?: string }) => {
    // return request.put<User>(`/admin/users/${data.id}`, data);
    const user = mockUsers.find((u) => u.id === data.id) || mockUsers[0];
    return Promise.resolve({ ...user, ...data, updatedAt: Date.now() });
  },

  // 删除用户
  delete: (_id: string) => {
    // return request.delete(`/admin/users/${id}`);
    return Promise.resolve();
  },

  // 调整积分
  adjustPoints: (data: { userId: string; points: number; reason: string }) => {
    // return request.post<User>(`/admin/users/${data.userId}/adjust-balance`, data);
    const user = mockUsers.find((u) => u.id === data.userId) || mockUsers[0];
    return Promise.resolve({
      ...user,
      points: user.points + data.points,
      updatedAt: Date.now(),
    });
  },

  // 获取用户详情
  getDetail: (id: string) => {
    // return request.get<User>(`/admin/users/${id}`);
    return Promise.resolve(mockUsers.find((u) => u.id === id) || mockUsers[0]);
  },

  // 启用/禁用用户
  toggleStatus: (id: string, status: string) => {
    // return request.put<User>(`/admin/users/${id}/status?status=${status}`);
    const user = mockUsers.find((u) => u.id === id) || mockUsers[0];
    return Promise.resolve({ ...user, status, updatedAt: Date.now() });
  },
};
