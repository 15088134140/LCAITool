import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard, GuestGuard } from './AuthGuard';
import Layout from '@/components/Layout';

// 页面组件
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import UserManagement from '@/pages/UserManagement';
import RoleManagement from '@/pages/RoleManagement';
import AdminConfig from '@/pages/AdminConfig';

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

// 分类管理组件
import CategoryManagement from '@/pages/categories';

// 实名认证审核组件
import VerificationManagement from '@/pages/verifications';

// 评价管理组件
import ReviewsPage from '@/pages/reviews';

// 反馈管理组件
import FeedbackPage from '@/pages/feedback';

// 构思管理组件
import IdeasPage from '@/pages/ideas';

// 退款管理组件
import RefundsPage from '@/pages/refunds';

// 系统设置组件
import SettingsPage from '@/pages/settings';

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
        element: <CategoryManagement />,
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
        element: <VerificationManagement />,
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
        element: <RefundsPage />,
      },
      // 内容管理
      {
        path: 'ideas',
        element: <IdeasPage />,
      },
      {
        path: 'reviews',
        element: <ReviewsPage />,
      },
      {
        path: 'feedback',
        element: <FeedbackPage />,
      },
      // 系统设置
      {
        path: 'settings',
        element: <SettingsPage />,
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
