'use client';

import { useEffect } from 'react';
import { useCategoryStore, useToolStore } from '../../store';

export function CategoryGrid() {
  const { categories, loading, fetchCategories, selectedCategoryId, setSelectedCategory } = useCategoryStore();
  const { setCategoryFilter, fetchTools } = useToolStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCategoryClick = (categoryId: string) => {
    const newCategoryId = selectedCategoryId === categoryId ? null : categoryId;
    setSelectedCategory(newCategoryId);
    setCategoryFilter(newCategoryId);
    fetchTools({ categoryId: newCategoryId });

    // 滚动到工具列表
    document.getElementById('tools-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            工具分类
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            8大专业场景，覆盖创意、设计、营销、办公等多个领域
          </p>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
          </div>
        )}

        {/* 分类卡片网格 */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`category-card ${
                  selectedCategoryId === category.id
                    ? 'border-brand-light bg-blue-50'
                    : ''
                }`}
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                <p className="text-sm text-gray-500">{category.toolCount} 个工具</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
