import { useEffect } from 'react';
import { useAppStore } from '@/store';

interface PlaceholderPageProps {
  title: string;
  breadcrumbs: Array<{ label: string; path?: string }>;
}

const PlaceholderPage = ({ title, breadcrumbs }: PlaceholderPageProps) => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  useEffect(() => {
    setCurrentPageTitle(title);
    setBreadcrumbs(breadcrumbs);
  }, [setCurrentPageTitle, setBreadcrumbs, title, breadcrumbs]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      <p className="text-gray-500">此页面开发中...</p>
    </div>
  );
};

export default PlaceholderPage;