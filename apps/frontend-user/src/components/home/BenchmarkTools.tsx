'use client';

import { useEffect } from 'react';
import { useToolStore } from '../../store';
import { ToolCard } from '../shared';

export function BenchmarkTools() {
  const { tools, loading, error, fetchTools } = useToolStore();

  useEffect(() => {
    fetchTools({ isFeatured: true });
  }, [fetchTools]);

  const featuredTools = tools.filter(t => t.isFeatured);

  return (
    <section id="tools-section" className="py-20 bg-gray-50 section-bg-blobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            标杆工具
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            经过精心打磨的明星产品，用户口碑验证，效果达到商用级别
          </p>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark" />
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="text-center py-12 text-red-500">
            {error}
          </div>
        )}

        {/* 工具卡片网格 */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} variant="featured" />
            ))}
          </div>
        )}

        {/* 查看更多按钮 */}
        {!loading && featuredTools.length > 0 && (
          <div className="text-center mt-10">
            <a
              href="/tools"
              className="btn-secondary inline-flex items-center px-8 py-3 rounded-lg font-medium"
            >
              查看全部工具
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
