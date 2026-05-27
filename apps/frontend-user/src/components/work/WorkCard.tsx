'use client';

import { useState } from 'react';
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
  const [downloading, setDownloading] = useState(false);
  const [imgError, setImgError] = useState(false);
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
        'tool-card card-hover overflow-hidden rounded-2xl',
        work.status === 'draft' && 'opacity-75 hover:opacity-100 transition-opacity duration-200'
      )}>
        {/* Cover Image */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
          {coverImageUrl && !imgError ? (
            <img
              src={coverImageUrl}
              alt={work.title}
              onError={() => setImgError(true)}
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
                {work.file_count} 文件
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-[18px_20px_16px]">
          {/* Tool link */}
          {work.tool_name && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/tools/${work.tool_id || ''}`);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-light hover:underline transition-colors mb-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {work.tool_name}
            </button>
          )}

          <h3 className="text-[17px] font-bold text-brand-dark leading-tight mb-1 line-clamp-1">
            {work.title}
          </h3>

          {/* Meta: time + credits */}
          <div className="flex items-center justify-between text-[13px] text-text-muted pb-3.5 border-b border-[#E4E7EB] mb-3">
            <span className="inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formatDate(work.created_at)}
            </span>
            {work.actual_cost != null && <span>{work.actual_cost} 积分</span>}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (downloading) return;
                setDownloading(true);
                try {
                  await onDownload?.(work.id);
                } finally {
                  setDownloading(false);
                }
              }}
              disabled={downloading}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-[13px] font-medium text-white bg-gradient-to-r from-[#059669] to-[#10B981] rounded-lg hover:shadow-[0_4px_12px_rgba(5,150,105,0.3)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <svg className="w-[15px] h-[15px] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              {downloading ? '下载中...' : '下载'}
            </button>

            {hasDialogMode && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContinueOptimize?.(work.id);
                }}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-[13px] font-medium text-[#64748B] bg-white border border-[#E4E7EB] rounded-lg hover:border-brand-light hover:text-brand-light transition-all"
              >
                <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                继续优化
              </button>
            )}

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(work.id, work.title);
              }}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-[13px] font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all"
            >
              <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              删除
            </button>
          </div>
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
