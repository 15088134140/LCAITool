'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { WorkCard, EmptyWorksState } from '@/components/work/WorkCard';
import { workApi } from '@/lib/api/modules/work';
import { taskApi } from '@/lib/api/modules/task';
import type { Work, Task } from '@/lib/api/types';

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
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
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
      const taskType = work.taskType?.toLowerCase() || '';
      if (filterType === 'storybook') typeMatch = taskType.includes('storybook');
      else if (filterType === 'ecommerce') typeMatch = taskType.includes('ecommerce');
      else if (filterType === 'marketing') typeMatch = taskType.includes('marketing');
      else if (filterType === 'other') typeMatch = !['storybook', 'ecommerce', 'marketing'].some(t => taskType.includes(t));
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
        const [worksData, tasksData] = await Promise.all([
          workApi.getWorks({ page, pageSize: 12 }),
          taskApi.getTasks({ status: 'pending' }),
        ]);
        setWorks(worksData.items);
        setHasMore(worksData.total > worksData.items.length);
        setPendingTasks(tasksData.items);
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

        {/* Pending Tasks Banner */}
        {pendingTasks.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-brand-dark to-brand-light rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">有 {pendingTasks.length} 个任务正在处理中</h3>
                <p className="text-white/80 text-sm">点击查看任务进度</p>
              </div>
              <div className="flex gap-2">
                {pendingTasks.map(task => (
                  <Link
                    key={task.id}
                    href={`/works/${task.id}/progress`}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-colors"
                  >
                    查看 #{task.id.slice(-6)}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

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
                {works.reduce((sum, w) => sum + w.viewCount, 0)}
              </div>
              <div className="text-sm text-[#64748B]">总浏览</div>
            </div>
            <div className="bg-white rounded-xl border border-[#E4E7EB] p-6 text-center">
              <div className="text-3xl font-bold text-[#F59E0B] mb-1">
                {works.reduce((sum, w) => sum + w.version, 0) / works.length}
              </div>
              <div className="text-sm text-[#64748B]">平均版本</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
