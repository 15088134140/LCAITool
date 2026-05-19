import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated } = useUserStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // 未登录，跳转到登录页，并记录当前路径
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
