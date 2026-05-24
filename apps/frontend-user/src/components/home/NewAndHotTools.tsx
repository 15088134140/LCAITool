'use client';

import { useState, useEffect } from 'react';
import { toolApi } from '@/lib/api';
import { getFirstImage } from '@/lib/utils/image';

export function NewAndHotTools() {
  const [newTools, setNewTools] = useState<any[]>([]);
  const [hotTools, setHotTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [newRes, hotRes] = await Promise.allSettled([
          toolApi.getTools({ is_new: true, page_size: 3 }),
          toolApi.getTools({ is_hot: true, page_size: 5 }),
        ]);

        if (newRes.status === 'fulfilled') {
          const items = newRes.value?.items || [];
          if (Array.isArray(items) && items.length > 0) {
            setNewTools(items.map((item: any) => ({
              name: item.name || item.title || '',
              description: item.short_desc || item.description || '',
              usage: item.use_count?.toString() || '0',
              price: item.base_fee ?? 0,
              slug: item.slug || '',
              icon: item.icon || '',
              cover_image: getFirstImage(item.cover_image) || item.heroImage || '',
            })));
          }
        }

        if (hotRes.status === 'fulfilled') {
          const items = hotRes.value?.items || [];
          if (Array.isArray(items) && items.length > 0) {
            setHotTools(items.map((item: any, idx: number) => ({
              rank: idx + 1,
              name: item.name || item.title || '',
              rating: item.rating_avg ?? item.avg_rating ?? 4.5,
              usage: item.use_count?.toLocaleString() || '0',
              color: ['#EF4444', '#F59E0B', '#059669', '#64748B', '#64748B'][idx] || '#64748B',
              slug: item.slug || '',
            })));
          }
        }
      } catch (err) {
        console.error('Failed to load tools:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fallback to hardcoded data if API returns nothing
  const displayNewTools = newTools.length > 0 ? newTools : [];
  const displayHotTools = hotTools.length > 0 ? hotTools : [];

  const getIcon = (_name: string) => (
    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  const getGradient = (index: number) => {
    const gradients = ['from-indigo-500 to-purple-600', 'from-orange-500 to-red-500', 'from-teal-500 to-cyan-600'];
    return gradients[index % gradients.length];
  };

  if (loading) {
    return (
      <section className="py-16 lg:py-20 bg-white section-bg-blobs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-20 bg-white section-bg-blobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* New Tools */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <span className="new-badge text-sm px-3 py-1">NEW</span>
              <h2 className="text-2xl font-bold text-[#1E3A5F]">新品上架</h2>
            </div>
            {displayNewTools.length > 0 ? (
              <div className="space-y-4">
                {displayNewTools.map((tool, index) => (
                  <a
                    key={index}
                    href={`/tools/${tool.slug}`}
                    className="p-5 border border-[#E4E7EB] rounded-xl hover:border-[#2563EB] transition-colors block"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getGradient(index)} flex items-center justify-center flex-shrink-0`}>
                          {tool.cover_image ? (
                            <img src={tool.cover_image} alt="" className="w-7 h-7 object-contain" />
                          ) : getIcon(tool.name)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#1E3A5F]">{tool.name}</h3>
                          <p className="text-sm text-[#64748B] mt-1">{tool.description}</p>
                          <p className="text-xs text-[#059669] font-medium mt-2">今日已有 {tool.usage} 人使用</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#059669]">{tool.price} 积分</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#64748B] text-sm border border-dashed border-[#E4E7EB] rounded-xl">
                暂无新品数据
              </div>
            )}
          </div>

          {/* Hot Tools */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <span className="hot-badge text-sm px-3 py-1">HOT</span>
              <h2 className="text-2xl font-bold text-[#1E3A5F]">热门工具</h2>
            </div>
            {displayHotTools.length > 0 ? (
              <div className="space-y-4">
                {displayHotTools.map((tool, index) => (
                  <a
                    key={index}
                    href={`/tools/${tool.slug}`}
                    className="p-5 border border-[#E4E7EB] rounded-xl hover:border-[#2563EB] transition-colors block"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold" style={{ color: tool.color }}>#{tool.rank}</span>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                        <span className="text-sm font-medium">{tool.rating}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-[#1E3A5F]">{tool.name}</h3>
                    <p className="text-sm text-[#64748B] mt-1">本周 {tool.usage} 次使用</p>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#64748B] text-sm border border-dashed border-[#E4E7EB] rounded-xl">
                暂无热门工具数据
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
