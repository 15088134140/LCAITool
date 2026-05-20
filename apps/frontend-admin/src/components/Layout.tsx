import { Outlet, Link } from 'react-router-dom';
import { useAppStore } from '@/store';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const { sidebarCollapsed, toggleSidebar, breadcrumbs } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* 顶部导航 */}
        <Header onToggleSidebar={toggleSidebar} />

        {/* 面包屑 */}
        <div className="px-6 py-4 bg-white border-b border-gray-100">
          <nav className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <span className="text-gray-400">/</span>}
                {item.path ? (
                  <Link to={item.path} className="text-gray-500 hover:text-[#1E3A5F]">
                    {item.label}
                  </Link>
                ) : (
                  <span className={index === breadcrumbs.length - 1 ? 'text-gray-800 font-medium' : 'text-gray-500'}>
                    {item.label}
                  </span>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* 页面内容 */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
