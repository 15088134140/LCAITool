import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  User,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useUserStore, useAppStore } from '@/store';
import { authApi } from '@/api';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const Header = ({ onToggleSidebar }: HeaderProps) => {
  const navigate = useNavigate();
  const { user, logout } = useUserStore();
  const { currentPageTitle } = useAppStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      navigate('/login');
    } catch (err) {
      console.error('登出失败:', err);
      logout();
      navigate('/login');
    }
  };

  const notifications = [
    { id: 1, title: '新用户注册', message: '用户 张三 刚刚完成注册', time: '5分钟前', read: false },
    { id: 2, title: '任务完成', message: '有声绘本生成任务 #1234 已完成', time: '15分钟前', read: false },
    { id: 3, title: '退款申请', message: '有一笔新的退款申请等待处理', time: '1小时前', read: true },
    { id: 4, title: '系统通知', message: '系统将于今晚23:00进行维护', time: '2小时前', read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">{currentPageTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* 通知图标 */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
          >
            <Bell size={20} className="text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          {/* 通知下拉面板 */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">通知</h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {unreadCount} 条未读
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <span className="text-xs text-gray-400">{notification.time}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-100">
                <button className="w-full text-sm text-[#1E3A5F] hover:underline">
                  查看全部通知
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 用户信息 */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-800">{user?.nickname}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {/* 用户菜单 */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.nickname}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} />
                <span>退出登录</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 点击外部关闭下拉菜单 */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;
