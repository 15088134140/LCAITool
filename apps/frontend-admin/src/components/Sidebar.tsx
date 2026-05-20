import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Wrench,
  Plus,
  FolderTree,
  Users,
  UserCheck,
  ShoppingCart,
  Undo2,
  Lightbulb,
  Star,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MenuItem {
  path?: string;
  label: string;
  icon: any;
  children?: MenuItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    'tools',
    'users',
    'orders',
    'content',
  ]);

  const menuGroups: { [key: string]: MenuItem } = {
    dashboard: {
      path: '/dashboard',
      label: '仪表盘',
      icon: Home,
    },
    tools: {
      label: '工具管理',
      icon: Wrench,
      children: [
        { path: '/tools', label: '工具列表', icon: Wrench },
        { path: '/tools/create', label: '创建工具', icon: Plus },
        { path: '/categories', label: '分类管理', icon: FolderTree },
      ],
    },
    users: {
      label: '用户管理',
      icon: Users,
      children: [
        { path: '/users', label: '用户列表', icon: Users },
        { path: '/verifications', label: '实名认证审核', icon: UserCheck },
      ],
    },
    orders: {
      label: '订单管理',
      icon: ShoppingCart,
      children: [
        { path: '/orders', label: '订单列表', icon: ShoppingCart },
        { path: '/refunds', label: '退款管理', icon: Undo2 },
      ],
    },
    content: {
      label: '内容管理',
      icon: Lightbulb,
      children: [
        { path: '/ideas', label: '构思审核', icon: Lightbulb },
        { path: '/reviews', label: '评价管理', icon: Star },
      ],
    },
    settings: {
      path: '/settings',
      label: '系统设置',
      icon: Settings,
    },
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const isParentActive = (children?: MenuItem[]) => {
    if (!children) return false;
    return children.some((child) => isActive(child.path));
  };

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-50 bg-[#1F2937] transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <span className="font-semibold text-white">灵创管理后台</span>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-400"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* 菜单 */}
      <nav className="p-3 space-y-1 overflow-y-auto" style={{ height: 'calc(100vh - 4rem)' }}>
        {Object.entries(menuGroups).map(([key, item]) => (
          <div key={key}>
            {item.path ? (
              /* 单个菜单项 */
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-[#059669] to-[#10B981] text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            ) : (
              /* 菜单分组 */
              <div>
                <button
                  onClick={() => toggleGroup(key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                    isParentActive(item.children)
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} />
                    {!collapsed && <span className="font-medium">{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <span>
                      {expandedGroups.includes(key) ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </span>
                  )}
                </button>

                {/* 子菜单 */}
                {!collapsed && expandedGroups.includes(key) && item.children && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path!}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${
                          isActive(child.path)
                            ? 'bg-gradient-to-r from-[#059669] to-[#10B981] text-white shadow-md'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        <child.icon size={16} />
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
