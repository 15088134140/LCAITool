'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { IdeaCard } from '@/components/idea/IdeaCard';
import type { IdeaSubmission, ToolCategory } from '@/lib/api/types';
import { ideaApi } from '@/lib/api/modules/idea';
import { categoryApi, toolApi } from '@/lib/api/modules/tool';
import { useAuthStore } from '@/store/useAuthStore';

const sortOptions = [
  { value: 'votes', label: '票数最高' },
  { value: 'latest', label: '最新发布' },
  { value: 'progress', label: '即将达成' },
];

export default function IdeasPage() {
  const { isAuthenticated } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [sortBy, setSortBy] = useState('votes');
  const [ideas, setIdeas] = useState<IdeaSubmission[]>([]);
  const [totalIdeas, setTotalIdeas] = useState(0);
  const [totalTools, setTotalTools] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page] = useState(1);
  const [categories, setCategories] = useState<string[]>(['全部']);
  const [implementedIdeas, setImplementedIdeas] = useState<IdeaSubmission[]>([]);

  // 从工具管理同步分类列表
  useEffect(() => {
    categoryApi.getCategories().then((res) => {
      const names = res.items.map((cat: ToolCategory) => cat.name);
      setCategories(['全部', ...names]);
    }).catch(() => {
      // 接口失败时不做处理，使用默认值
    });
  }, []);

  useEffect(() => {
    const fetchIdeas = async () => {
      setIsLoading(true);
      try {
        const sortMap: Record<string, string> = { votes: 'vote_count', latest: 'created_at', progress: 'vote_count' };
        const result = await ideaApi.getIdeas({
          page,
          page_size: 20,
          sort: sortMap[sortBy] || 'vote_count',
        });
        setIdeas(result.items || []);
        setTotalIdeas(result.total || 0);
      } catch (err) {
        console.error('获取构思列表失败:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIdeas();
  }, [page, sortBy, isAuthenticated]);

  // 获取已上线工具数量
  useEffect(() => {
    toolApi.getTools({ page: 1, page_size: 1 }).then((res) => {
      setTotalTools(res.total || 0);
    }).catch(() => {});
  }, []);

  // 获取已实现的构思（成功案例）
  useEffect(() => {
    ideaApi.getIdeas({ status: 'implemented', page: 1, page_size: 10, sort: 'votes' }).then((res) => {
      setImplementedIdeas(res.items || []);
    }).catch(() => {});
  }, []);

  // 过滤和排序思路
  const filteredIdeas = ideas.filter(idea => selectedCategory === '全部' || idea.category === selectedCategory);

  const hotIdeas = filteredIdeas.slice(0, 6);
  const moreIdeas = filteredIdeas.slice(6);

  const handleVoteSuccess = useCallback((ideaId: string, newVoteCount: number) => {
    setIdeas(prev => prev.map(idea =>
      idea.id === ideaId
        ? { ...idea, vote_count: newVoteCount, has_voted: true }
        : idea
    ));
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="py-16 lg:py-24 section-bg-blobs bg-gradient-to-br from-[#1E3A5F] to-[#2563EB]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">参与产品共建</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            你的声音决定开发优先级！投票支持你想要的工具，或提交你的创意，共同打造最实用的AI工具箱。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link
              href="/ideas/submit"
              className="px-8 py-4 bg-white text-[#1E3A5F] rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-xl focus-ring"
            >
              💡 提交我的创意
            </Link>
            <Link
              href="/ideas/my-votes"
              className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors focus-ring inline-block text-center"
            >
              查看我的投票
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-white">{totalIdeas}</div>
              <div className="text-blue-200 text-sm">构思中工具</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">
                {ideas.reduce((sum, idea) => sum + idea.vote_count, 0).toLocaleString()}
              </div>
              <div className="text-blue-200 text-sm">累计投票数</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">{totalTools}</div>
              <div className="text-blue-200 text-sm">已上线工具</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 border-b border-[#E4E7EB] bg-white section-bg-blobs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#64748B] font-medium">分类：</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-ring ${
                    selectedCategory === cat
                      ? 'bg-[#1E3A5F] text-white'
                      : 'text-[#64748B] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#64748B] font-medium">排序：</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-[#E4E7EB] rounded-lg text-sm focus-ring bg-white"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Voting Cards Grid - Hot Ideas */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-8 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#059669]"></span>
            热门构思工具
          </h2>

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
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  targetVotes={500}
                  onVoteSuccess={handleVoteSuccess}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* More Ideas Section */}
      {moreIdeas.length > 0 && (
        <section className="py-12 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-[#1E3A5F] mb-8 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#7C3AED]"></span>
              更多创意构思
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {moreIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  targetVotes={500}
                  variant="compact"
                  onVoteSuccess={handleVoteSuccess}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Success Stories */}
      <section className="py-16 bg-white section-bg-blobs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-8 text-center">从构思到上线的成功案例</h2>

          {implementedIdeas.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {implementedIdeas.map((idea, index) => {
                const gradients = [
                  'from-green-50 to-emerald-50',
                  'from-blue-50 to-indigo-50',
                  'from-amber-50 to-orange-50',
                ];
                const iconColors = [
                  'from-[#059669] to-[#10B981]',
                  'from-[#2563EB] to-[#3B82F6]',
                  'from-[#D97706] to-[#F59E0B]',
                ];
                const voteColors = [
                  'text-[#059669]',
                  'text-[#2563EB]',
                  'text-[#D97706]',
                ];
                const g = index % 3;
                const daysToLaunch = idea.reviewed_at && idea.created_at
                  ? Math.round((idea.reviewed_at - idea.created_at) / 86400)
                  : null;

                return (
                  <div key={idea.id} className={`text-center p-6 bg-gradient-to-br ${gradients[g]} rounded-2xl`}>
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${iconColors[g]} flex items-center justify-center`}>
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-lg text-[#1E3A5F] mb-2">{idea.title}</h3>
                    <p className="text-[#64748B] text-sm mb-3">
                      从构思到上线{daysToLaunch ? `仅用了 ${daysToLaunch} 天` : '已成功上线'}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <span className={`px-3 py-1 bg-white rounded-full font-medium ${voteColors[g]}`}>
                        {idea.vote_count} 人参与投票
                      </span>
                      <span className="px-3 py-1 bg-white rounded-full text-[#1E3A5F] font-medium">已上线</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-[#64748B]">
              暂无成功案例，敬请期待
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6] section-bg-blobs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">有更好的创意想法？</h2>
          <p className="text-xl text-purple-100 mb-10">提交你的工具创意，一旦被采纳，将获得 200 积分奖励！</p>
          <Link
            href="/ideas/submit"
            className="inline-block px-10 py-4 bg-white text-[#7C3AED] rounded-xl font-bold text-lg hover:bg-purple-50 transition-colors shadow-xl focus-ring"
          >
            🎯 提交我的创意
          </Link>
        </div>
      </section>
    </>
  );
}
