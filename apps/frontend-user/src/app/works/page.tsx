'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { WorkCard, EmptyWorksState } from '@/components/work/WorkCard';
import { workApi } from '@/lib/api/modules/work';
import type { Work } from '@/lib/api/types';

type FilterType = 'all' | 'storybook' | 'ecommerce' | 'marketing' | 'other';
type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

export default function WorksPage() {
  const router = useRouter();

  const [works, setWorks] = useState<(Work & {
    toolName?: string;
    coverImage?: string;
    fileCount?: number;
    taskType?: string;
  })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const filters = [
    { key: 'all' as FilterType, label: '全部' },
    { key: 'storybook' as FilterType, label: '有声绘本' },
    { key: 'ecommerce' as FilterType, label: '电商详情' },
    { key: 'marketing' as FilterType, label: '营销文案' },
    { key: 'other' as FilterType, label: '其他' },
  ];

  const statusFilters = [
    { key: 'all' as StatusFilter, label: '全部状态' },
    { key: 'draft' as StatusFilter, label: '草稿' },
    { key: 'published' as StatusFilter, label: '已发布' },
    { key: 'archived' as StatusFilter, label: '已归档' },
  ];

  // 筛选作品
  const filteredWorks = works.filter(work => {
    // 类型筛选
    let typeMatch = true;
    if (filterType !== 'all') {
      const taskType = work.task_type?.toLowerCase() || '';
      if (filterType === 'storybook') typeMatch = taskType === 'storybook-generator';
      else if (filterType === 'ecommerce') typeMatch = taskType === 'ecommerce-detail';
      else if (filterType === 'marketing') typeMatch = taskType === 'product-description';
      else if (filterType === 'other') typeMatch = !['storybook-generator', 'ecommerce-detail', 'product-description'].includes(taskType);
    }

    // 状态筛选
    let statusMatch = true;
    if (statusFilter !== 'all') {
      statusMatch = work.status === statusFilter;
    }

    return typeMatch && statusMatch;
  });

  // 获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const worksData = await workApi.getWorks({ page, page_size: 12 });
        setWorks(worksData.items);
        setHasMore(worksData.total > worksData.items.length);
      } catch (err) {
        console.error('获取数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [page]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton Header */}
          <div className="animate-pulse mb-8">
            <div className="h-8 w-48 bg-[#E4E7EB] rounded-lg mb-2" />
            <div className="h-4 w-64 bg-[#E4E7EB] rounded-lg" />
          </div>

          {/* Skeleton Filters */}
          <div className="animate-pulse mb-8 flex gap-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 w-20 bg-[#E4E7EB] rounded-full" />
            ))}
          </div>

          {/* Skeleton Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-[#E4E7EB] overflow-hidden">
                <div className="aspect-video bg-[#E4E7EB]" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-3/4 bg-[#E4E7EB] rounded" />
                  <div className="h-4 w-full bg-[#E4E7EB] rounded" />
                  <div className="h-4 w-2/3 bg-[#E4E7EB] rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">我的创作成果</h1>
            <p className="text-[#64748B]">
              管理和查看您使用AI工具创建的所有作品
            </p>
          </div>
          <Link
            href="/tools"
            className="btn-primary px-6 py-3 text-white font-semibold rounded-xl inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            创建新作品
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            {filters.map(filter => (
              <button
                key={filter.key}
                onClick={() => setFilterType(filter.key)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  filterType === filter.key
                    ? 'bg-gradient-to-r from-brand-dark to-brand-light text-white shadow-md'
                    : 'bg-white text-[#64748B] hover:text-[#1E3A5F] border border-[#E4E7EB]'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {statusFilters.map(filter => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  statusFilter === filter.key
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-white text-[#64748B] hover:text-[#1E3A5F] border border-[#E4E7EB]'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Works Grid */}
        {filteredWorks.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredWorks.map(work => (
                <WorkCard key={work.id} work={work} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="btn-secondary px-8 py-3 font-semibold rounded-xl"
                >
                  加载更多
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E4E7EB]">
            <EmptyWorksState onBrowseTools={() => router.push('/tools')} />
          </div>
        )}

        {/* Stats Summary */}
        {works.length > 0 && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-[#E4E7EB] p-6 text-center">
              <div className="text-3xl font-bold text-[#1E3A5F] mb-1">{works.length}</div>
              <div className="text-sm text-[#64748B]">总作品数</div>
            </div>
            <div className="bg-white rounded-xl border border-[#E4E7EB] p-6 text-center">
              <div className="text-3xl font-bold text-success-dark mb-1">
                {works.filter(w => w.status === 'published').length}
              </div>
              <div className="text-sm text-[#64748B]">已发布</div>
            </div>
            <div className="bg-white rounded-xl border border-[#E4E7EB] p-6 text-center">
              <div className="text-3xl font-bold text-brand-light mb-1">
                {works.reduce((sum, w) => sum + (w.view_count || 0), 0)}
              </div>
              <div className="text-sm text-[#64748B]">总浏览</div>
            </div>
            <div className="bg-white rounded-xl border border-[#E4E7EB] p-6 text-center">
              <div className="text-3xl font-bold text-[#F59E0B] mb-1">
                {works.length > 0
                  ? (works.reduce((sum, w) => sum + (w.version || 0), 0) / works.length).toFixed(1)
                  : 0}
              </div>
              <div className="text-sm text-[#64748B]">平均版本</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
