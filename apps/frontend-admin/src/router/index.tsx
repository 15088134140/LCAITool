import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard, GuestGuard } from './AuthGuard';
import Layout from '@/components/Layout';

// 页面组件
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import UserManagement from '@/pages/UserManagement';
import RoleManagement from '@/pages/RoleManagement';
import AdminConfig from '@/pages/AdminConfig';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestGuard>
        <Login />
      </GuestGuard>
    ),
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'users',
        element: <UserManagement />,
      },
      {
        path: 'roles',
        element: <RoleManagement />,
      },
      {
        path: 'admin-config',
        element: <AdminConfig />,
      },
    ],
  },
  {
    path: '*',
    element: <div>404 - 页面不存在</div>,
  },
]);

export default router;
