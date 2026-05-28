'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useToolStore } from '../../store';

const FALLBACK_IMAGES = [
  '/images/tool-illustration.png',
  '/images/tool-ecommerce.png',
  '/images/tool-content.png',
];

function formatCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}千`;
  return count.toLocaleString();
}

export function BenchmarkTools() {
  const { tools, loading, fetchTools } = useToolStore();

  useEffect(() => {
    fetchTools({ isFeatured: true });
  }, [fetchTools]);

  const displayTools = tools.slice(0, 3);

  return (
    <section id="tools" className="py-16 lg:py-20 bg-white section-bg-blobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4">精品工具 · 开箱即用</h2>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto">每一款工具都经过专业调试，输出质量达到商用标准，让你的创意快速落地</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="tool-card animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="flex justify-between pt-2">
                    <div className="h-5 bg-gray-200 rounded w-20" />
                    <div className="h-5 bg-gray-200 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayTools.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            暂无推荐工具
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {displayTools.map((tool, index) => {
              const toolUrl = tool.slug ? `/tools/${tool.slug}` : `/tools/${tool.id}`;
              const coverImage = tool.heroImage || FALLBACK_IMAGES[index] || FALLBACK_IMAGES[0];

              return (
                <div key={tool.id} className="tool-card card-hover">
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img
                      src={coverImage}
                      alt={tool.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-4 left-4">
                      {tool.isHot ? (
                        <span className="px-3 py-1 bg-rose-500 text-white text-xs font-medium rounded-full">HOT</span>
                      ) : tool.isNew ? (
                        <span className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">NEW</span>
                      ) : (
                        <span className="px-3 py-1 bg-[#1E3A5F]/80 text-white text-xs font-medium rounded-full">推荐</span>
                      )}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">{tool.name}</h3>
                    <p className="text-[#64748B] mb-4">{tool.shortDescription || tool.description}</p>
                    <div className="flex items-center gap-2 mb-4 text-sm text-[#64748B]">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                        {tool.avgRating.toFixed(1)}
                      </span>
                      <span>·</span>
                      <span>{formatCount(tool.useCount)} 人使用</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-[#059669]">{tool.pricing.baseFee} 积分/次起</span>
                      <div className="flex gap-2">
                        <Link
                          href={toolUrl}
                          className="px-4 py-2 border border-[#1E3A5F] text-[#1E3A5F] rounded-lg font-medium hover:bg-[#1E3A5F] hover:text-white transition-colors focus-ring"
                        >
                          查看演示
                        </Link>
                        <Link
                          href={toolUrl}
                          className="btn-primary px-4 py-2 text-white rounded-lg font-medium focus-ring"
                        >
                          立即使用
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
