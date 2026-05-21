'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IdeaCard } from '@/components/idea/IdeaCard';
import type { IdeaSubmission } from '@/lib/api/types';
import { ideaApi } from '@/lib/api/modules/idea';

export function VoteSection() {
  const [ideas, setIdeas] = useState<IdeaSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ideaApi.getIdeas({ page: 1, page_size: 3, sort: 'vote_count' }).then((res) => {
      setIdeas(res.items || []);
      setTotal(res.total || 0);
    }).catch(() => {
      // fallback: keep empty
    }).finally(() => setLoading(false));
  }, []);

  const handleVoteSuccess = (ideaId: string, newVoteCount: number) => {
    setIdeas(prev => prev.map(idea =>
      idea.id === ideaId ? { ...idea, vote_count: newVoteCount } : idea
    ));
  };

  return (
    <section id="vote" className="py-16 lg:py-20 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] section-bg-blobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">参与产品共建 · 投票你期待的工具</h2>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">你的声音决定开发优先级，高票工具优先安排开发，采纳创意获得积分奖励</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 animate-pulse">
                <div className="h-6 bg-white/20 rounded mb-4 w-3/4" />
                <div className="h-16 bg-white/10 rounded mb-4" />
                <div className="h-4 bg-white/10 rounded mb-3 w-1/2" />
                <div className="h-10 bg-white/20 rounded" />
              </div>
            ))
          ) : ideas.length === 0 ? (
            <div className="col-span-3 text-center text-blue-200 py-8">暂无推荐构思</div>
          ) : (
            ideas.map((idea) => (
              <div key={idea.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-1 border border-white/20">
                <IdeaCard idea={idea} targetVotes={500} onVoteSuccess={handleVoteSuccess} className="border-0" />
              </div>
            ))
          )}
        </div>

        <div className="text-center mt-10 space-x-4">
          <Link
            href="/ideas"
            className="inline-block px-6 py-3 border border-white/30 text-white rounded-xl font-medium hover:bg-white/10 transition-colors focus-ring"
          >
            查看全部 {total}+ 构思工具 →
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
