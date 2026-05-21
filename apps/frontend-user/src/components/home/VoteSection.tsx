'use client';

import Link from 'next/link';
import { IdeaCard } from '@/components/idea/IdeaCard';
import { IdeaSubmission } from '@/lib/api/types';

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
];

export function VoteSection() {
  return (
    <section id="vote" className="py-16 lg:py-20 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] section-bg-blobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">参与产品共建 · 投票你期待的工具</h2>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">你的声音决定开发优先级，高票工具优先安排开发，采纳创意获得积分奖励</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockIdeas.map((idea) => (
            <div key={idea.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-1 border border-white/20">
              <IdeaCard idea={idea} targetVotes={500} className="border-0" />
            </div>
          ))}
        </div>

        <div className="text-center mt-10 space-x-4">
          <Link
            href="/ideas"
            className="inline-block px-6 py-3 border border-white/30 text-white rounded-xl font-medium hover:bg-white/10 transition-colors focus-ring"
          >
            查看全部 30+ 构思工具 →
          </Link>
          <Link
            href="/ideas/submit"
            className="inline-block px-6 py-3 bg-white text-[#1E3A5F] rounded-xl font-semibold hover:bg-blue-50 transition-colors focus-ring"
          >
            💡 提交我的工具创意
          </Link>
        </div>
      </div>
    </section>
  );
}
