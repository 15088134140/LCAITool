'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { type Work } from '@/lib/api/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { resolveApiUrl, getFirstImage } from '@/lib/utils/image';

interface WorkCardProps {
  work: Work & {
    toolName?: string;
    coverImage?: string;
    fileCount?: number;
    taskType?: string;
  };
  hasDialogMode?: boolean;
  onDownload?: (workId: string) => void;
  onContinueOptimize?: (workId: string) => void;
  onDelete?: (workId: string, title: string) => void;
  onStatusToggle?: (workId: string, newStatus: 'published' | 'draft') => void;
}

const toolTypeMap: Record<string, { label: string; color: string; icon: string }> = {
  'storybook': { label: '有声绘本', color: 'bg-blue-100 text-blue-700', icon: '📖' },
  'ecommerce': { label: '电商详情', color: 'bg-green-100 text-green-700', icon: '🛒' },
  'marketing': { label: '营销文案', color: 'bg-amber-100 text-amber-700', icon: '📝' },
  'default': { label: '创作成果', color: 'bg-gray-100 text-gray-700', icon: '📁' }
};

export function WorkCard({ work, hasDialogMode, onDownload, onContinueOptimize, onDelete }: WorkCardProps) {
  const router = useRouter();
  const getToolType = (taskType?: string) => {
    if (!taskType) return toolTypeMap['default']!;
    for (const [key, value] of Object.entries(toolTypeMap)) {
      if (taskType.toLowerCase().includes(key)) {
        return value;
      }
    }
    return toolTypeMap['default']!;
  };

  const toolType = getToolType(work.task_type || 'default');

  const getStatusColor = () => {
    switch (work.status) {
      case 'published': return 'text-success-dark bg-green-50';
      default: return 'bg-red-50 text-red-600 border border-red-200';
    }
  };

  const getStatusLabel = () => {
    switch (work.status) {
      case 'published': return '已发布';
      default: return '草稿';
    }
  };

  const formatDate = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp * 1000), {
        addSuffix: true,
        locale: zhCN
      });
    } catch {
      return '刚刚';
    }
  };

  const coverImageUrl = resolveApiUrl(work.coverImage || getFirstImage(work.cover_image));

  return (
    <Link
      href={`/works/detail/${work.id}`}
      className="group block"
    >
      <div className={cn(
        'tool-card card-hover overflow-hidden',
        work.status === 'draft' && 'opacity-75 hover:opacity-100 transition-opacity duration-200'
      )}>
        {/* Cover Image */}
        <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={work.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
                <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}

          {/* Tool Type Badge */}
          <div className="absolute top-3 left-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/tools/${work.tool_id || ''}`);
              }}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold',
                toolType.color
              )}
            >
              {toolType.label}
            </button>
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <span className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold',
              getStatusColor()
            )}>
              {getStatusLabel()}
            </span>
          </div>

          {/* Version Badge */}
          <div className="absolute bottom-3 left-3">
            <span className="bg-white/90 text-brand-dark px-2 py-1 rounded-full text-xs font-semibold shadow-sm">
              v{work.version}
            </span>
          </div>

          {/* File Count Badge */}
          {work.file_count && work.file_count > 0 && (
            <div className="absolute bottom-3 right-3">
              <span className="bg-white/90 text-brand-dark px-2 py-1 rounded-full text-xs font-semibold shadow-sm flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {work.file_count}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-bold text-brand-dark text-lg mb-2 line-clamp-1 group-hover:text-brand-light transition-colors">
            {work.title}
          </h3>

          {work.description && (
            <p className="text-text-secondary text-sm mb-4 line-clamp-2">
              {work.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatDate(work.created_at)}</span>
            </div>

            <div className="flex items-center gap-3">
              {work.view_count > 0 && (
                <div className="flex items-center gap-1 text-sm text-text-muted">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{work.view_count}</span>
                </div>
              )}

              {work.like_count > 0 && (
                <div className="flex items-center gap-1 text-sm text-text-muted">
                  <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <span>{work.like_count}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 操作按钮区 */}
        <div className="px-5 pb-4 pt-0 flex items-center gap-2 border-t border-[#E4E7EB] mt-4 pt-3">
          {/* 下载 */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDownload?.(work.id);
            }}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-[#059669] to-[#10B981] rounded-lg hover:shadow-md transition-all"
          >
            下载
          </button>

          {/* 继续优化（仅当 hasDialogMode 时显示） */}
          {hasDialogMode && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContinueOptimize?.(work.id);
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-[#1E3A5F] bg-[#F8FAFC] border border-[#E4E7EB] rounded-lg hover:bg-[#E4E7EB] transition-all"
            >
              继续优化
            </button>
          )}

          {/* 删除 */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete?.(work.id, work.title);
            }}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </Link>
  );
}

export function EmptyWorksState({ onBrowseTools }: { onBrowseTools?: () => void }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-brand-dark mb-2">还没有创作成果</h3>
      <p className="text-text-secondary mb-8 max-w-md mx-auto">
        使用我们的AI工具开始创作，生成的成果将保存在这里
      </p>
      {onBrowseTools && (
        <button
          onClick={onBrowseTools}
          className="btn-primary px-8 py-3 text-white font-semibold rounded-xl inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          浏览工具
        </button>
      )}
    </div>
  );
}

export default WorkCard;
