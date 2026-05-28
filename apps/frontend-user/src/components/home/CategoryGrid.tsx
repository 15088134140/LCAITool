'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCategoryStore } from '../../store/useCategoryStore';

const gradientList = [
  'from-blue-500 to-blue-600',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-orange-500',
  'from-green-500 to-emerald-500',
  'from-violet-500 to-purple-500',
  'from-red-500 to-rose-600',
  'from-cyan-500 to-teal-500',
];

const emojiList = ['📖', '🛒', '🎨', '✍️', '🎵', '🎬', '🔧', '📊', '🎮', '📝', '🎯', '💼', '🏗️', '🔬', '🌐'];

function getCategoryEmoji(category: { name: string; icon?: string }, index: number): string {
  if (category.icon) return category.icon;
  return emojiList[index % emojiList.length]!;
}

export function CategoryGrid() {
  const { categories, loading, fetchCategories } = useCategoryStore();

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [fetchCategories, categories.length]);

  return (
    <section className="py-16 lg:py-20 section-bg-blobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4">按场景选择工具</h2>
          <p className="text-lg text-[#64748B]">覆盖主流创作场景，找到最适合你的AI工具</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {loading && categories.length === 0 ? (
            // 加载占位
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-[#E4E7EB] block text-center animate-pulse">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-200" />
                <div className="h-4 w-20 mx-auto bg-gray-200 rounded" />
                <div className="h-3 w-16 mx-auto mt-2 bg-gray-200 rounded" />
              </div>
            ))
          ) : (
            categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/tools?category=${category.id}`}
                className="bg-white rounded-xl p-4 border border-[#E4E7EB] card-hover block text-center"
              >
                <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${gradientList[index % gradientList.length]} flex items-center justify-center text-2xl`}>
                  {getCategoryEmoji(category, index)}
                </div>
                <h3 className="font-semibold text-[#1E3A5F]">{category.name}</h3>
                <p className="text-sm text-[#64748B] mt-1">
                  {category.toolCount > 0 ? `${category.toolCount} 款工具` : '即将上线'}
                </p>
              </Link>
            ))
          )}

          {/* 更多 - 固定卡片，跳转到用户共创 */}
          <Link
            href="/ideas"
            className="bg-white rounded-xl p-4 border border-[#E4E7EB] card-hover block text-center"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[#1E3A5F]">更多</h3>
            <p className="text-sm text-[#64748B] mt-1">即将上线</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
