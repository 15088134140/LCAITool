'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { WorkCard, EmptyWorksState } from '@/components/work/WorkCard';
import { workApi } from '@/lib/api/modules/work';
import { categoryApi } from '@/lib/api/modules/tool';
import type { Work, ToolCategory } from '@/lib/api/types';

type StatusFilterType = 'all' | 'draft' | 'published';

export default function WorksPage() {
  const router = useRouter();

  const [works, setWorks] = useState<(Work & {
    toolName?: string;
    coverImage?: string;
    fileCount?: number;
    taskType?: string;
  })[]>([]);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total: number; published_count: number; total_views: number; avg_version: number } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; workId: string; title: string }>({
    open: false, workId: '', title: ''
  });

  const pageSize = 12;
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterCategory, statusFilter, debouncedSearch, dateRange]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryApi.getCategories();
        setCategories(res.items);
      } catch (err) {
        console.error('获取分类失败:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch works
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const params: any = { page, page_size: pageSize };
        if (filterCategory) params.category_id = filterCategory;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (debouncedSearch) params.search = debouncedSearch;
        if (dateRange.from) params.date_from = Math.floor(dateRange.from.getTime() / 1000);
        if (dateRange.to) params.date_to = Math.floor(dateRange.to.getTime() / 1000);

        const worksData = await workApi.getWorks(params);

        setWorks(worksData.items);
        setTotal(worksData.total);
        setStats(worksData.stats || null);
      } catch (err) {
        console.error('获取数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [page, filterCategory, statusFilter, debouncedSearch, dateRange]);

  // Delete handler
  const handleDeleteConfirm = async () => {
    try {
      await workApi.deleteWork(deleteModal.workId);
      setWorks(prev => prev.filter(w => w.id !== deleteModal.workId));
      setTotal(prev => prev - 1);
    } catch {
      console.error('删除失败');
    } finally {
      setDeleteModal({ open: false, workId: '', title: '' });
    }
  };

  // Download handler
  const handleDownload = (workId: string) => {
    window.open(`/api/v1/works/${workId}/download`, '_blank');
  };

  // Continue optimize handler
  const handleContinueOptimize = (workId: string) => {
    router.push(`/tools?workId=${workId}`);
  };

  // Pagination
  const totalPages = Math.ceil(total / pageSize);
  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse mb-8">
            <div className="h-8 w-48 bg-[#E4E7EB] rounded-lg mb-2" />
            <div className="h-4 w-64 bg-[#E4E7EB] rounded-lg" />
          </div>
          <div className="animate-pulse mb-8 flex gap-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 w-20 bg-[#E4E7EB] rounded-full" />
            ))}
          </div>
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
            <p className="text-[#64748B]">管理和查看您使用AI工具创建的所有作品</p>
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

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-[#E4E7EB] p-5 text-center">
              <div className="text-2xl font-bold text-[#1E3A5F] mb-1">{stats.total}</div>
              <div className="text-sm text-[#64748B]">总作品数</div>
            </div>
            <div className="bg-white rounded-xl border border-[#E4E7EB] p-5 text-center">
              <div className="text-2xl font-bold text-success-dark mb-1">{stats.published_count}</div>
              <div className="text-sm text-[#64748B]">已发布</div>
            </div>
            <div className="bg-white rounded-xl border border-[#E4E7EB] p-5 text-center">
              <div className="text-2xl font-bold text-brand-light mb-1">{stats.total_views}</div>
              <div className="text-sm text-[#64748B]">总浏览</div>
            </div>
            <div className="bg-white rounded-xl border border-[#E4E7EB] p-5 text-center">
              <div className="text-2xl font-bold text-[#F59E0B] mb-1">{stats.avg_version}</div>
              <div className="text-sm text-[#64748B]">平均版本</div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Category + Status Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category chips */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterCategory(null)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  !filterCategory
                    ? 'bg-gradient-to-r from-brand-dark to-brand-light text-white shadow-md'
                    : 'bg-white text-[#64748B] hover:text-[#1E3A5F] border border-[#E4E7EB]'
                )}
              >
                全部
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all',
                    filterCategory === cat.id
                      ? 'bg-gradient-to-r from-brand-dark to-brand-light text-white shadow-md'
                      : 'bg-white text-[#64748B] hover:text-[#1E3A5F] border border-[#E4E7EB]'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex gap-2">
              {[
                { key: 'all' as StatusFilterType, label: '全部状态' },
                { key: 'published' as StatusFilterType, label: '已发布' },
                { key: 'draft' as StatusFilterType, label: '草稿' },
              ].map(filter => (
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

          {/* Search + Date */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索作品名称..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-light/20 focus:border-brand-light"
              />
            </div>
          </div>
        </div>

        {/* Works Grid */}
        {works.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {works.map(work => (
                <WorkCard
                  key={work.id}
                  work={work}
                  hasDialogMode={work.usage_modes?.includes('dialog') ?? false}
                  onDownload={handleDownload}
                  onContinueOptimize={handleContinueOptimize}
                  onDelete={(id, title) => setDeleteModal({ open: true, workId: id, title })}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm rounded-lg border border-[#E4E7EB] disabled:opacity-50 hover:bg-[#F8FAFC] transition-colors"
                >
                  ◀ 上一页
                </button>
                {getPageNumbers().map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'px-3 py-2 text-sm rounded-lg border transition-colors',
                      p === page
                        ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                        : 'border-[#E4E7EB] hover:bg-[#F8FAFC]'
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm rounded-lg border border-[#E4E7EB] disabled:opacity-50 hover:bg-[#F8FAFC] transition-colors"
                >
                  下一页 ▶
                </button>
                <span className="text-sm text-[#64748B] ml-2">共 {totalPages} 页</span>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E4E7EB]">
            <EmptyWorksState onBrowseTools={() => router.push('/tools')} />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDeleteModal(d => ({ ...d, open: false }))}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1E3A5F] mb-2">确认删除</h3>
            <p className="text-[#64748B] mb-6">
              确定要删除作品「{deleteModal.title}」吗？<br />
              删除后将从列表中隐藏，数据仍然保留。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(d => ({ ...d, open: false }))}
                className="px-4 py-2 text-sm font-medium text-[#64748B] bg-white border border-[#E4E7EB] rounded-lg hover:bg-[#F8FAFC] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
