import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard, GuestGuard } from './AuthGuard';
import Layout from '@/components/Layout';

// 页面组件
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import UserManagement from '@/pages/UserManagement';
import RoleManagement from '@/pages/RoleManagement';
import AdminConfig from '@/pages/AdminConfig';
import ToolsPage from '@/pages/ToolsPage';
import PlaceholderPage from '@/pages/PlaceholderPage';

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
      // 工具管理
      {
        path: 'tools',
        element: <ToolsPage />,
      },
      {
        path: 'tools/create',
        element: (
          <PlaceholderPage
            title="创建工具"
            breadcrumbs={[
              { label: '首页', path: '/dashboard' },
              { label: '工具管理' },
              { label: '创建工具' },
            ]}
          />
        ),
      },
      {
        path: 'categories',
        element: (
          <PlaceholderPage
            title="分类管理"
            breadcrumbs={[
              { label: '首页', path: '/dashboard' },
              { label: '工具管理' },
              { label: '分类管理' },
            ]}
          />
        ),
      },
      // 用户管理
      {
        path: 'users',
        element: <UserManagement />,
      },
      {
        path: 'verifications',
        element: (
          <PlaceholderPage
            title="实名认证审核"
            breadcrumbs={[
              { label: '首页', path: '/dashboard' },
              { label: '用户管理' },
              { label: '实名认证审核' },
            ]}
          />
        ),
      },
      // 订单管理
      {
        path: 'orders',
        element: (
          <PlaceholderPage
            title="订单列表"
            breadcrumbs={[
              { label: '首页', path: '/dashboard' },
              { label: '订单管理' },
              { label: '订单列表' },
            ]}
          />
        ),
      },
      {
        path: 'refunds',
        element: (
          <PlaceholderPage
            title="退款管理"
            breadcrumbs={[
              { label: '首页', path: '/dashboard' },
              { label: '订单管理' },
              { label: '退款管理' },
            ]}
          />
        ),
      },
      // 内容管理
      {
        path: 'ideas',
        element: (
          <PlaceholderPage
            title="构思审核"
            breadcrumbs={[
              { label: '首页', path: '/dashboard' },
              { label: '内容管理' },
              { label: '构思审核' },
            ]}
          />
        ),
      },
      {
        path: 'reviews',
        element: (
          <PlaceholderPage
            title="评价管理"
            breadcrumbs={[
              { label: '首页', path: '/dashboard' },
              { label: '内容管理' },
              { label: '评价管理' },
            ]}
          />
        ),
      },
      // 系统设置
      {
        path: 'settings',
        element: (
          <PlaceholderPage
            title="系统设置"
            breadcrumbs={[
              { label: '首页', path: '/dashboard' },
              { label: '系统设置' },
            ]}
          />
        ),
      },
      // 其他原有页面
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
