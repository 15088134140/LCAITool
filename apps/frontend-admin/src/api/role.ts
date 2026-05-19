import request from '@/utils/request';

export interface Permission {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  children?: Permission[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
}

export const roleApi = {
  // 获取角色列表
  getList: () => {
    return request.get<Role[]>('/admin/roles');
  },

  // 获取权限树
  getPermissions: () => {
    return request.get<Permission[]>('/admin/permissions');
  },

  // 创建角色
  create: (data: { name: string; description: string; permissions: string[] }) => {
    return request.post<Role>('/admin/roles', data);
  },

  // 更新角色
  update: (data: { id: string; name?: string; description?: string; permissions?: string[] }) => {
    return request.put<Role>(`/admin/roles/${data.id}`, data);
  },

  // 删除角色
  delete: (id: string) => {
    return request.delete(`/admin/roles/${id}`);
  },
};
