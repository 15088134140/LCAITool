'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { IdeaSubmission } from '@/lib/api/types';
import { useAuthStore } from '@/store/useAuthStore';
import { ideaApi } from '@/lib/api/modules/idea';

interface IdeaCardProps {
  idea: IdeaSubmission;
  targetVotes?: number;
  onVoteSuccess?: (ideaId: string, newVoteCount: number) => void;
  variant?: 'default' | 'compact';
}

const categoryColors: Record<string, { bg: string; text: string; fill: string }> = {
  '内容创作': { bg: 'bg-green-100', text: 'text-[#059669]', fill: 'progress-fill' },
  '设计工具': { bg: 'bg-purple-100', text: 'text-[#7C3AED]', fill: 'progress-fill-3' },
  '视频音频': { bg: 'bg-blue-100', text: 'text-[#2563EB]', fill: 'progress-fill-2' },
  '办公效率': { bg: 'bg-teal-100', text: 'text-[#0D9488]', fill: 'progress-fill-2' },
  '其他': { bg: 'bg-gray-100', text: 'text-gray-600', fill: 'progress-fill' },
};

export function IdeaCard({ idea, targetVotes = 500, onVoteSuccess, variant = 'default', className = '' }: IdeaCardProps & { className?: string }) {
  const { isAuthenticated } = useAuthStore();
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(idea.has_voted || false);
  const [voteAnimation, setVoteAnimation] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [localVoteCount, setLocalVoteCount] = useState(idea.vote_count);
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // 同步父组件传来的投票状态
  useEffect(() => {
    setHasVoted(idea.has_voted || false);
  }, [idea.has_voted]);

  useEffect(() => {
    setLocalVoteCount(idea.vote_count);
  }, [idea.vote_count]);

  const category = idea.category || '其他';
  const colors = (categoryColors[category] ?? categoryColors['其他'])!;
  const percentage = Math.min(Math.round((localVoteCount / targetVotes) * 100), 100);

  const handleVote = async () => {
    if (!isAuthenticated || hasVoted || isVoting) return;

    setVoteError(null);
    setIsVoting(true);
    try {
      await ideaApi.voteIdea(idea.id, 'up');

      setHasVoted(true);
      setLocalVoteCount(prev => prev + 1);
      setVoteAnimation(true);
      setTimeout(() => setVoteAnimation(false), 500);

      onVoteSuccess?.(idea.id, localVoteCount + 1);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || '投票失败，请稍后重试';
      // 如果已投票过，同步本地状态
      if (message.includes('已经投过票') || message.includes('已投票')) {
        setHasVoted(true);
      }
      setVoteError(message);
      console.error('投票失败:', error);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setVoteError(null), 4000);
    } finally {
      setIsVoting(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`bg-white rounded-xl border border-[#E4E7EB] p-5 flex items-center gap-4 hover:border-[#2563EB] transition-colors card-hover relative ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#1E3A5F] truncate">{idea.title}</h3>
          <p className="text-sm text-[#64748B] truncate">{idea.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-lg font-bold text-[#1E3A5F]">{localVoteCount}</div>
            <div className="text-xs text-[#64748B]">票</div>
          </div>
          {isAuthenticated ? (
            <button
              onClick={(e) => { e.stopPropagation(); handleVote(); }}
              disabled={hasVoted || isVoting}
              className={`w-16 py-2 rounded-lg text-xs font-semibold transition-all text-center ${
                hasVoted
                  ? 'bg-[#059669] text-white cursor-default'
                  : 'bg-[#1E3A5F] text-white hover:bg-[#2563EB]'
              } ${voteAnimation ? 'vote-bounce' : ''}`}
            >
              {isVoting ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </span>
              ) : hasVoted ? (
                '✓ 已投票'
              ) : (
                '投票'
              )}
            </button>
          ) : (
            <Link
              href="/login"
              className="w-16 py-2 rounded-lg text-xs font-semibold bg-[#1E3A5F] text-white hover:bg-[#2563EB] transition-colors text-center inline-block"
            >
              登录投票
            </Link>
          )}
        </div>
        {voteError && (
          <div className="absolute bottom-0 left-0 right-0 translate-y-full mt-1 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 text-center z-10">
            {voteError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`card-hover bg-white rounded-2xl border border-[#E4E7EB] p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-bold text-xl text-[#1E3A5F]">{idea.title}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
          {category}
        </span>
      </div>
      <p className="text-[#64748B] mb-4 leading-relaxed line-clamp-3">{idea.description}</p>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-[#1E3A5F]">
            {localVoteCount} / {targetVotes} 票
          </span>
          <span className={`font-semibold ${colors.text}`}>{percentage}%</span>
        </div>
        <div className="progress-bar h-2.5">
          <div
            className={`${colors.fill} ${voteAnimation ? 'vote-pop' : ''}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="avatar-stack flex items-center">
          {idea.voters && idea.voters.length > 0 ? (
            idea.voters.map((voter, i) => (
              <img
                key={voter.user_id}
                src={voter.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(voter.nickname || '用户')}&background=random`}
                className="w-8 h-8 rounded-full border-2 border-white"
                alt={voter.nickname || '投票用户'}
                style={{ marginLeft: i > 0 ? '-10px' : '0' }}
              />
            ))
          ) : (
            [1, 2, 3].map((i) => (
              <img
                key={i}
                src={`https://i.pravatar.cc/32?img=${parseInt(idea.id.slice(-2)) + i}`}
                className="w-8 h-8 rounded-full border-2 border-white"
                alt="投票用户"
                style={{ marginLeft: i > 1 ? '-10px' : '0' }}
              />
            ))
          )}
          {(() => {
            const displayCount = (idea.voters && idea.voters.length > 0) ? idea.voters.length : 3;
            return localVoteCount > displayCount ? (
              <span
                className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-xs text-[#64748B]"
                style={{ marginLeft: '-10px' }}
              >
                +{localVoteCount - displayCount}
              </span>
            ) : null;
          })()}
        </div>
      </div>

      {isAuthenticated ? (
        <button
          onClick={handleVote}
          disabled={hasVoted || isVoting}
          className={`w-full py-3 rounded-xl font-semibold transition-all focus-ring ${
            hasVoted
              ? 'bg-[#059669] text-white cursor-default'
              : 'bg-[#1E3A5F] text-white hover:bg-[#2563EB] hover:shadow-lg hover:-translate-y-0.5'
          } ${voteAnimation ? 'vote-bounce' : ''}`}
        >
          {isVoting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              投票中...
            </span>
          ) : hasVoted ? (
            '✓ 已投票'
          ) : (
            '为它投票'
          )}
        </button>
      ) : (
        <Link href="/login" className="w-full py-3 bg-[#1E3A5F] text-white rounded-xl font-semibold hover:bg-[#2563EB] transition-colors focus-ring text-center block">
          登录后投票
        </Link>
      )}

      {voteError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
          {voteError}
        </div>
      )}

      <style jsx>{`
        @keyframes vote-pop {
          0% { transform: scaleX(1); }
          50% { transform: scaleX(1.05); }
          100% { transform: scaleX(1); }
        }
        @keyframes vote-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .vote-pop {
          animation: vote-pop 0.5s ease-out;
        }
        .vote-bounce {
          animation: vote-bounce 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
