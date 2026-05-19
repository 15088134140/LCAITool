import { useUserStore } from '@/store';

export const usePermission = () => {
  const { user, isAuthenticated } = useUserStore();

  // 检查是否有某个权限
  const hasPermission = (permission: string | string[]): boolean => {
    if (!isAuthenticated || !user) return false;

    // 超级管理员拥有所有权限
    if (user.role === 'admin' || user.role === '超级管理员') return true;

    const permissions = user.permissions || [];

    if (Array.isArray(permission)) {
      return permission.some((p) => permissions.includes(p));
    }

    return permissions.includes(permission);
  };

  // 检查是否有所有权限
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    if (user.role === 'admin' || user.role === '超级管理员') return true;

    return permissions.every((p) => user.permissions?.includes(p));
  };

  return {
    hasPermission,
    hasAllPermissions,
    permissions: user?.permissions || [],
  };
};
