'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { IdeaCard } from '@/components/idea/IdeaCard';
import { IdeaSubmission } from '@/lib/api/types';
import { ideaApi } from '@/lib/api/modules/idea';
import { useAuthStore } from '@/store/useAuthStore';

// 模拟数据 - 在真实API就绪前使用
const mockIdeas: IdeaSubmission[] = [
  {
    id: '1',
    user_id: 'user-1',
    title: 'AI视频脚本生成器',
    description: '自动生成短视频、宣传片、广告片专业脚本。支持多种风格、时长、平台定制，包含分镜建议和配乐推荐。',
    category: '内容创作',
    tags: ['视频', '脚本', 'AI生成'],
    vote_count: 328,
    view_count: 1256,
    status: 'approved',
    created_at: Date.now() - 86400000 * 7,
    updated_at: Date.now() - 86400000 * 7,
  },
  {
    id: '2',
    user_id: 'user-2',
    title: 'AI播客节目生成器',
    description: '输入主题，自动生成对话稿+多角色配音+背景音乐。支持访谈、故事、知识分享等多种播客类型。',
    category: '视频音频',
    tags: ['播客', '音频', 'AI生成'],
    vote_count: 256,
    view_count: 892,
    status: 'approved',
    created_at: Date.now() - 86400000 * 5,
    updated_at: Date.now() - 86400000 * 5,
  },
  {
    id: '3',
    user_id: 'user-3',
    title: 'AI简历优化大师',
    description: '智能分析简历，优化内容描述、排版格式，针对不同岗位定制优化，提供面试问题预测和回答建议。',
    category: '办公效率',
    tags: ['简历', '求职', 'AI优化'],
    vote_count: 189,
    view_count: 756,
    status: 'approved',
    created_at: Date.now() - 86400000 * 3,
    updated_at: Date.now() - 86400000 * 3,
  },
  {
    id: '4',
    user_id: 'user-4',
    title: 'AI菜谱创意生成',
    description: '输入可用食材，智能生成创意菜谱，附带详细步骤、营养分析和高清美食图片，支持家常/餐厅等风格。',
    category: '内容创作',
    tags: ['菜谱', '烹饪', 'AI生成'],
    vote_count: 156,
    view_count: 543,
    status: 'approved',
    created_at: Date.now() - 86400000 * 2,
    updated_at: Date.now() - 86400000 * 2,
  },
  {
    id: '5',
    user_id: 'user-5',
    title: 'AI旅行规划助手',
    description: '一键生成个性化旅行攻略，包含行程安排、预算规划、景点推荐、交通住宿建议，可导出详细PDF。',
    category: '办公效率',
    tags: ['旅行', '规划', 'AI助手'],
    vote_count: 142,
    view_count: 478,
    status: 'approved',
    created_at: Date.now() - 86400000 * 1.5,
    updated_at: Date.now() - 86400000 * 1.5,
  },
  {
    id: '6',
    user_id: 'user-6',
    title: 'AI表情包制作器',
    description: '输入文字或上传图片，一键生成定制表情包。支持多种风格，自动添加文字效果和热门梗。',
    category: '设计工具',
    tags: ['表情包', '设计', 'AI生成'],
    vote_count: 98,
    view_count: 321,
    status: 'approved',
    created_at: Date.now() - 86400000,
    updated_at: Date.now() - 86400000,
  },
  {
    id: '7',
    user_id: 'user-7',
    title: 'AI艺术字生成器',
    description: '输入文字生成各种风格的艺术字体设计，可用于海报、视频标题等。',
    category: '设计工具',
    tags: ['字体', '设计', 'AI生成'],
    vote_count: 76,
    view_count: 254,
    status: 'approved',
    created_at: Date.now() - 86400000 * 0.5,
    updated_at: Date.now() - 86400000 * 0.5,
  },
  {
    id: '8',
    user_id: 'user-8',
    title: 'AI合同撰写助手',
    description: '根据需求自动生成各类合同模板，包含风险提示和法律条款建议。',
    category: '办公效率',
    tags: ['合同', '法律', 'AI助手'],
    vote_count: 65,
    view_count: 198,
    status: 'approved',
    created_at: Date.now() - 3600000 * 12,
    updated_at: Date.now() - 3600000 * 12,
  },
  {
    id: '9',
    user_id: 'user-9',
    title: 'AI理财规划师',
    description: '分析收支情况，智能生成理财规划建议，包含投资组合和风险评估。',
    category: '办公效率',
    tags: ['理财', '规划', 'AI'],
    vote_count: 58,
    view_count: 167,
    status: 'approved',
    created_at: Date.now() - 3600000 * 6,
    updated_at: Date.now() - 3600000 * 6,
  },
  {
    id: '10',
    user_id: 'user-10',
    title: 'AI思维导图生成',
    description: '输入主题自动生成思维导图，支持多种布局样式，可导出PNG/SVG。',
    category: '设计工具',
    tags: ['思维导图', '设计', 'AI生成'],
    vote_count: 52,
    view_count: 145,
    status: 'approved',
    created_at: Date.now() - 3600000 * 2,
    updated_at: Date.now() - 3600000 * 2,
  },
];

const categories = ['全部', '内容创作', '设计工具', '视频音频', '办公效率'];
const sortOptions = [
  { value: 'votes', label: '票数最高' },
  { value: 'latest', label: '最新发布' },
  { value: 'progress', label: '即将达成' },
];

export default function IdeasPage() {
  const { isAuthenticated } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [sortBy, setSortBy] = useState('votes');
  const [ideas, setIdeas] = useState<IdeaSubmission[]>(mockIdeas);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 过滤和排序思路
  const filteredIdeas = ideas
    .filter(idea => selectedCategory === '全部' || idea.category === selectedCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case 'votes':
          return b.vote_count - a.vote_count;
        case 'latest':
          return b.created_at - a.created_at;
        case 'progress':
          return (b.vote_count / 500) - (a.vote_count / 500);
        default:
          return 0;
      }
    });

  const hotIdeas = filteredIdeas.slice(0, 6);
  const moreIdeas = filteredIdeas.slice(6);

  const handleVoteSuccess = useCallback((ideaId: string, newVoteCount: number) => {
    setIdeas(prev => prev.map(idea =>
      idea.id === ideaId
        ? { ...idea, vote_count: newVoteCount }
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
            <button className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors focus-ring">
              查看我的投票
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-white">{ideas.length}</div>
              <div className="text-blue-200 text-sm">构思中工具</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">
                {ideas.reduce((sum, idea) => sum + idea.vote_count, 0).toLocaleString()}
              </div>
              <div className="text-blue-200 text-sm">累计投票数</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">15</div>
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

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-[#1E3A5F] mb-2">AI有声绘本生成专家</h3>
              <p className="text-[#64748B] text-sm mb-3">从构思到上线仅用了 45 天</p>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="px-3 py-1 bg-white rounded-full text-[#059669] font-medium">428 人参与投票</span>
                <span className="px-3 py-1 bg-white rounded-full text-[#1E3A5F] font-medium">已上线</span>
              </div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-[#1E3A5F] mb-2">AI电商详情页生成器</h3>
              <p className="text-[#64748B] text-sm mb-3">从构思到上线仅用了 38 天</p>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="px-3 py-1 bg-white rounded-full text-[#2563EB] font-medium">386 人参与投票</span>
                <span className="px-3 py-1 bg-white rounded-full text-[#1E3A5F] font-medium">已上线</span>
              </div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#D97706] to-[#F59E0B] flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-[#1E3A5F] mb-2">AI营销文案大师</h3>
              <p className="text-[#64748B] text-sm mb-3">从构思到上线仅用了 32 天</p>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="px-3 py-1 bg-white rounded-full text-[#D97706] font-medium">312 人参与投票</span>
                <span className="px-3 py-1 bg-white rounded-full text-[#1E3A5F] font-medium">已上线</span>
              </div>
            </div>
          </div>
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
