import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/store';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * 检查 localStorage 中是否有有效 token
 */
function hasTokenInStorage(): boolean {
  try {
    const stored = localStorage.getItem('user-storage');
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return !!(parsed?.state?.token);
  } catch {
    return false;
  }
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated } = useUserStore();
  const location = useLocation();

  // 双保险：store 状态和 localStorage 一致时才放行
  if (!isAuthenticated || !hasTokenInStorage()) {
    if (isAuthenticated && !hasTokenInStorage()) {
      // 状态不一致（如 token 被手动清除），重置 store
      useUserStore.getState().logout();
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const GuestGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated } = useUserStore();
  const location = useLocation();

  if (isAuthenticated) {
    // 已登录，跳转到首页
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
