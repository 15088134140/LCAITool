import { useEffect } from 'react';
import { useAppStore } from '@/store';

const ToolsPage = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  useEffect(() => {
    setCurrentPageTitle('工具列表');
    setBreadcrumbs([{ label: '首页' }, { label: '工具管理' }, { label: '工具列表' }]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">工具管理</h2>
      <p className="text-gray-500">工具列表页面开发中...</p>
    </div>
  );
};

export default ToolsPage;