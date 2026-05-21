'use client';

import { useEffect, useState } from 'react';
import { useToolStore } from '../../store/useToolStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { ToolCard } from '../../components/shared/ToolCard';
import { ToolCategoryNav } from '../../components/tool/ToolCategoryNav';
import { ToolSearch } from '../../components/tool/ToolSearch';

type SortOption = 'popular' | 'newest' | 'rating';

export default function ToolsPage() {
  const { tools, loading, error, fetchTools, searchQuery, setSearchQuery, categoryFilter, setCategoryFilter } = useToolStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [sortOption, setSortOption] = useState<SortOption>('popular');

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchTools({ categoryId: categoryFilter, search: searchQuery });
  }, [fetchTools, categoryFilter, searchQuery]);

  // 排序工具
  const sortedTools = [...tools].sort((a, b) => {
    switch (sortOption) {
      case 'popular':
        return b.useCount - a.useCount;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'rating':
        return b.avgRating - a.avgRating;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-bg-animated">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] py-12 section-bg-blobs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-3">AI 工具集合</h1>
            <p className="text-blue-200 text-lg">专业场景深度优化，开箱即用，成果可交付</p>
          </div>
          <ToolSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="搜索工具名称、功能、场景..."
          />
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-10 section-bg-blobs bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filter */}
          <div className="mb-8">
            <ToolCategoryNav
              categories={categories}
              selectedCategoryId={categoryFilter}
              onCategorySelect={setCategoryFilter}
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-[#64748B]">
              共找到 <span className="font-semibold text-[#1E3A5F]">{sortedTools.length}</span> 个工具
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <button
                  className={`sort-btn px-3 py-1.5 rounded-lg transition-colors focus-ring ${sortOption === 'popular' ? 'active' : ''}`}
                  onClick={() => setSortOption('popular')}
                >
                  热门推荐
                </button>
                <button
                  className={`sort-btn px-3 py-1.5 rounded-lg transition-colors focus-ring ${sortOption === 'newest' ? 'active' : ''}`}
                  onClick={() => setSortOption('newest')}
                >
                  最新上线
                </button>
                <button
                  className={`sort-btn px-3 py-1.5 rounded-lg transition-colors focus-ring ${sortOption === 'rating' ? 'active' : ''}`}
                  onClick={() => setSortOption('rating')}
                >
                  评分最高
                </button>
              </div>
            </div>
          </div>

          {/* Tools Grid */}
          {sortedTools.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} showImage={true} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-[#E4E7EB]">
              <div className="text-[#64748B]">没有找到符合条件的工具</div>
            </div>
          )}

          {/* Pagination (placeholder for now) */}
          {sortedTools.length > 0 && (
            <div className="mt-12 flex justify-center">
              <nav className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="w-10 h-10 rounded-lg bg-[#2563EB] text-white font-medium focus-ring">1</button>
                <button className="w-10 h-10 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">2</button>
                <button className="w-10 h-10 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">3</button>
                <span className="text-[#64748B]">...</span>
                <button className="w-10 h-10 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </nav>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}