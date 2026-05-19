import request from '@/utils/request';

export interface AdminUser {
  id: string;
  username: string;
  nickname: string;
  role: string;
  status: 'active' | 'disabled';
  lastLoginAt?: string;
  createdAt: string;
}

export const adminApi = {
  // 获取管理员列表
  getList: () => {
    return request.get<AdminUser[]>('/admin/admins');
  },

  // 重置密码
  resetPassword: (id: string, newPassword: string) => {
    return request.post(`/admin/admins/${id}/reset-password`, { newPassword });
  },

  // 创建管理员
  create: (data: { username: string; nickname: string; password: string; role: string }) => {
    return request.post<AdminUser>('/admin/admins', data);
  },
};
