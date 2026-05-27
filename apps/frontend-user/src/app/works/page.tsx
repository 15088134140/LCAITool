'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { WorkCard, EmptyWorksState } from '@/components/work/WorkCard';
import { workApi } from '@/lib/api/modules/work';
import { categoryApi } from '@/lib/api/modules/tool';
import { toast } from '@/lib/toast';
import { tokenStorage, API_BASE_URL } from '@/lib/api/client';
import type { Work, ToolCategory } from '@/lib/api/types';


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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total: number; published_count: number; total_views: number; avg_version: number } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; workId: string; title: string }>({
    open: false, workId: '', title: ''
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

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
  }, [filterCategory, debouncedSearch, dateRange]);

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
  }, [page, filterCategory, debouncedSearch, dateRange]);

  // Click outside to close date picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Delete handler
  const handleDeleteConfirm = async () => {
    try {
      await workApi.deleteWork(deleteModal.workId);
      setWorks(prev => prev.filter(w => w.id !== deleteModal.workId));
      setTotal(prev => prev - 1);
      toast.success(`已删除「${deleteModal.title}」`);
    } catch {
      toast.error('删除失败，请稍后重试');
    } finally {
      setDeleteModal({ open: false, workId: '', title: '' });
    }
  };

  // Download handler
  const handleDownload = async (workId: string) => {
    try {
      const token = tokenStorage.getToken();
      const response = await fetch(
        `${API_BASE_URL}/works/${workId}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('下载失败');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work_${workId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('下载完成');
    } catch (err) {
      console.error('下载失败:', err);
      toast.error('下载失败，请稍后重试');
    }
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
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#64748B] mb-3">
          <Link href="/user" className="hover:text-[#1E3A5F] transition-colors">个人中心</Link>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-[#1E3A5F] font-medium">我的创作成果</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">我的创作成果</h1>
            <p className="text-[#64748B]">管理和查看您使用AI工具创建的所有作品</p>
          </div>
          <Link
            href="/tools"
            className="btn-primary px-6 py-3 text-white font-semibold rounded-xl inline-flex items-center gap-2 shadow-[0_4px_12px_rgba(5,150,105,0.25)] hover:shadow-[0_8px_24px_rgba(5,150,105,0.35)]"
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
              <div className="text-2xl font-bold text-[#059669] mb-1">{stats.total_views}</div>
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
          {/* Categories - natural wrap */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory(null)}
              className={cn(
                'px-[18px] py-[7px] rounded-full text-sm font-medium transition-all border',
                !filterCategory
                  ? 'bg-gradient-to-r from-brand-dark to-brand-light text-white border-transparent shadow-[0_2px_8px_rgba(37,99,235,0.25)]'
                  : 'bg-white text-[#64748B] hover:text-brand-light border-[#E4E7EB] hover:border-brand-light'
              )}
            >
              全部
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={cn(
                  'px-[18px] py-[7px] rounded-full text-sm font-medium transition-all border',
                  filterCategory === cat.id
                    ? 'bg-gradient-to-r from-brand-dark to-brand-light text-white border-transparent shadow-[0_2px_8px_rgba(37,99,235,0.25)]'
                    : 'bg-white text-[#64748B] hover:text-brand-light border-[#E4E7EB] hover:border-brand-light'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Date + Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Date Picker */}
            <div className="relative w-full sm:w-auto" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="w-full sm:w-auto inline-flex items-center gap-1.5 px-3.5 py-[9px] bg-white border border-[#E4E7EB] rounded-lg text-sm text-[#64748B] hover:border-brand-light transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="flex-1 text-left">
                  {dateRange.from || dateRange.to
                    ? `${dateRange.from ? dateRange.from.toLocaleDateString('zh-CN') : '不限'} → ${dateRange.to ? dateRange.to.toLocaleDateString('zh-CN') : '不限'}`
                    : '全部时间'}
                </span>
                {(dateRange.from || dateRange.to) && (
                  <button
                    onClick={e => { e.stopPropagation(); setDateRange({ from: null, to: null }); setPage(1); }}
                    className="w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-[#E4E7EB]"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showDatePicker && (
                <div className="fixed sm:absolute left-0 sm:left-auto sm:right-0 top-auto sm:top-full bottom-0 sm:bottom-auto mt-0 sm:mt-1 z-50 bg-white border-0 sm:border border-[#E4E7EB] rounded-t-2xl sm:rounded-xl shadow-xl p-5 sm:p-4 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-[#64748B] mb-1">开始日期</label>
                      <input
                        type="date"
                        value={dateRange.from ? dateRange.from.toISOString().split('T')[0] : ''}
                        onChange={e => {
                          setDateRange(prev => ({ ...prev, from: e.target.value ? new Date(e.target.value) : null }));
                          setPage(1);
                        }}
                        className="w-full px-4 py-3 sm:px-3 sm:py-2 border border-[#E4E7EB] rounded-lg text-sm text-[#1F2937] focus:outline-none focus:ring-[3px] focus:ring-brand-light/10 focus:border-brand-light"
                      />
                    </div>
                    <div className="hidden sm:flex items-center px-1 pb-2">
                      <span className="text-xs text-[#94A3B8]">→</span>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-[#64748B] mb-1">结束日期</label>
                      <input
                        type="date"
                        value={dateRange.to ? dateRange.to.toISOString().split('T')[0] : ''}
                        onChange={e => {
                          setDateRange(prev => ({ ...prev, to: e.target.value ? new Date(e.target.value) : null }));
                          setPage(1);
                        }}
                        className="w-full px-4 py-3 sm:px-3 sm:py-2 border border-[#E4E7EB] rounded-lg text-sm text-[#1F2937] focus:outline-none focus:ring-[3px] focus:ring-brand-light/10 focus:border-brand-light"
                      />
                    </div>
                  </div>
                  {/* Mobile action buttons */}
                  <div className="flex sm:hidden items-center gap-3 mt-4">
                    <button
                      onClick={e => { e.stopPropagation(); setDateRange({ from: null, to: null }); setShowDatePicker(false); setPage(1); }}
                      className="flex-1 py-3 text-sm font-medium text-[#64748B] bg-white border border-[#E4E7EB] rounded-lg"
                    >
                      重置
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setShowDatePicker(false); }}
                      className="flex-1 py-3 text-sm font-medium text-white bg-gradient-to-r from-brand-dark to-brand-light rounded-lg"
                    >
                      确定
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-[260px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#94A3B8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索成果名称..."
                className="w-full pl-[38px] pr-[14px] py-[9px] bg-white border border-[#E4E7EB] rounded-lg text-sm text-[#1F2937] focus:outline-none focus:ring-[3px] focus:ring-brand-light/10 focus:border-brand-light transition-colors placeholder:text-[#94A3B8]"
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
              <div className="flex items-center justify-center gap-1 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="min-w-[38px] h-[38px] inline-flex items-center justify-center rounded-lg text-sm font-medium text-[#64748B] border border-[#E4E7EB] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-light hover:text-brand-light transition-all"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                {getPageNumbers().map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'min-w-[38px] h-[38px] inline-flex items-center justify-center rounded-lg text-sm font-medium border transition-all',
                      p === page
                        ? 'bg-gradient-to-r from-brand-dark to-brand-light text-white border-transparent'
                        : 'text-[#64748B] border-[#E4E7EB] bg-white hover:border-brand-light hover:text-brand-light'
                    )}
                  >
                    {p}
                  </button>
                ))}
                <span className="text-[13px] text-[#94A3B8] mx-3">共 {totalPages} 页</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="min-w-[38px] h-[38px] inline-flex items-center justify-center rounded-lg text-sm font-medium text-[#64748B] border border-[#E4E7EB] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-light hover:text-brand-light transition-all"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-6"
          onClick={() => setDeleteModal(d => ({ ...d, open: false }))}
        >
          <div
            className="bg-white rounded-[20px] p-7 w-full max-w-[440px] shadow-xl animate-slide-in-right origin-bottom"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">确认删除</h3>
            <p className="text-sm text-[#64748B] leading-relaxed mb-6">
              确定要删除作品「{deleteModal.title}」吗？<br />
              删除后不可恢复，相关文件也会一并清除。
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteModal(d => ({ ...d, open: false }))}
                className="px-6 py-2.5 text-sm font-semibold text-[#64748B] bg-white border border-[#E4E7EB] rounded-lg hover:border-[#94A3B8] transition-all"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 hover:shadow-[0_4px_12px_rgba(220,38,38,0.3)] transition-all"
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
