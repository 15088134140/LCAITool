'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { IdeaCard } from '@/components/idea/IdeaCard';
import type { IdeaSubmission } from '@/lib/api/types';
import { ideaApi } from '@/lib/api/modules/idea';
import { useAuthStore } from '@/store/useAuthStore';

export default function MyVotesPage() {
  const { isAuthenticated } = useAuthStore();
  const [ideas, setIdeas] = useState<IdeaSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const fetchMyVotes = async () => {
      setIsLoading(true);
      try {
        const result = await ideaApi.getMyVotes({ page, page_size: pageSize });
        setIdeas(result.items || []);
        setTotal(result.total || 0);
      } catch (err) {
        console.error('获取投票列表失败:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMyVotes();
  }, [page, isAuthenticated]);

  const handleVoteSuccess = useCallback((ideaId: string, newVoteCount: number) => {
    setIdeas(prev => prev.map(idea =>
      idea.id === ideaId
        ? { ...idea, vote_count: newVoteCount, has_voted: true }
        : idea
    ));
  }, []);

  const handleCancelVoteSuccess = useCallback((ideaId: string, _newVoteCount: number) => {
    setIdeas(prev => prev.filter(idea => idea.id !== ideaId));
    setTotal(prev => Math.max(0, prev - 1));
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#F8FAFC]">
        <section className="py-24 section-bg-blobs bg-gradient-to-br from-[#1E3A5F] to-[#2563EB]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">我的投票</h1>
            <p className="text-xl text-blue-100 mb-8">请登录后查看你的投票记录</p>
            <Link
              href="/login"
              className="inline-block px-10 py-4 bg-white text-[#1E3A5F] rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-xl focus-ring"
            >
              立即登录
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <section className="py-16 lg:py-20 section-bg-blobs bg-gradient-to-br from-[#1E3A5F] to-[#2563EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/ideas"
                className="text-blue-200 hover:text-white transition-colors text-sm mb-2 inline-block"
              >
                &larr; 返回构思列表
              </Link>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">我的投票</h1>
              <p className="text-blue-100 mt-2">
                共投票了 <span className="font-bold text-white">{total}</span> 个创意
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E4E7EB] p-6 animate-pulse">
                  <div className="h-7 bg-gray-200 rounded mb-4 w-3/4"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded mb-4"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : ideas.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ideas.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    targetVotes={500}
                    onVoteSuccess={handleVoteSuccess}
                    onCancelVoteSuccess={handleCancelVoteSuccess}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-12">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-6 py-3 rounded-xl border border-[#E4E7EB] bg-white text-[#1E3A5F] font-medium hover:border-[#2563EB] transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <span className="text-[#64748B]">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-6 py-3 rounded-xl border border-[#E4E7EB] bg-white text-[#1E3A5F] font-medium hover:border-[#2563EB] transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
                <svg className="w-10 h-10 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#1E3A5F] mb-3">还没有投票记录</h2>
              <p className="text-[#64748B] mb-8">去浏览创意工具，为你喜欢的投票吧！</p>
              <Link
                href="/ideas"
                className="inline-block px-8 py-4 bg-[#1E3A5F] text-white rounded-xl font-bold text-lg hover:bg-[#2563EB] transition-colors shadow-xl focus-ring"
              >
                浏览创意工具
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
