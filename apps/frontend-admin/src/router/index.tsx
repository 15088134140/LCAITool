import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard, GuestGuard } from './AuthGuard';
import Layout from '@/components/Layout';

// 页面组件
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import UserManagement from '@/pages/UserManagement';
import RoleManagement from '@/pages/RoleManagement';
import AdminConfig from '@/pages/AdminConfig';
import PlaceholderPage from '@/pages/PlaceholderPage';

// 用户管理组件
import UserDetail from '@/pages/users/Detail';

// 订单管理组件
import OrderList from '@/pages/orders/List';
import OrderDetail from '@/pages/orders/Detail';

// 工具管理组件
import ToolManagement from '@/pages/tools';
import CreateTool from '@/pages/tools/create';
import EditTool from '@/pages/tools/[id]/edit';
import DemoCaseManager from '@/pages/tools/DemoCaseManager';

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
        element: <ToolManagement />,
      },
      {
        path: 'tools/create',
        element: <CreateTool />,
      },
      {
        path: 'tools/:id/edit',
        element: <EditTool />,
      },
      {
        path: 'tools/:id/demos',
        element: <DemoCaseManager />,
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
        path: 'users/:id',
        element: <UserDetail />,
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
        element: <OrderList />,
      },
      {
        path: 'orders/:id',
        element: <OrderDetail />,
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
