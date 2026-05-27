'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { workApi } from '@/lib/api/modules/work';
import { tokenStorage } from '@/lib/api/client';
import { getFirstImage, getFileUrl, isRelativePath } from '@/lib/utils/image';
import type { Work, WorkFile, Work as WorkVersion, ToolRating } from '@/lib/api/types';
import ratingApi from '@/lib/api/modules/rating';
import RatingModal from '@/components/rating/RatingModal';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:8000/api/v1';

// 工具类型配置
const toolConfig = {
  storybook: {
    name: '有声绘本生成',
    color: 'from-blue-500 to-blue-600',
    icon: '📖',
  },
  ecommerce: {
    name: '电商详情页生成',
    color: 'from-green-500 to-green-600',
    icon: '🛒',
  },
  marketing: {
    name: '营销文案生成',
    color: 'from-amber-500 to-amber-600',
    icon: '📝',
  },
  default: {
    name: 'AI创作',
    color: 'from-purple-500 to-purple-600',
    icon: '✨',
  },
};

// 格式化文件大小
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '未知大小';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// 格式化时长
const formatDuration = (seconds?: number) => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 格式化日期
const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 获取文件图标
const getFileIcon = (fileType: WorkFile['file_type']) => {
  switch (fileType) {
    case 'image':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'pdf':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case 'audio':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    case 'video':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
  }
};

export default function WorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workId = params['id'] as string;

  const [work, setWork] = useState<Work | null>(null);
  const [files, setFiles] = useState<WorkFile[]>([]);
  const [versions, setVersions] = useState<WorkVersion[]>([]);
  const [inputParams, setInputParams] = useState<Record<string, any> | null>(null);
  const [toolParamSchema, setToolParamSchema] = useState<Array<{key: string; label: string; type: string; order: number}> | null>(null);
  const [usageModes, setUsageModes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersion] = useState<number>(2);
  const [activeTab, setActiveTab] = useState<'preview' | 'files' | 'versions'>('preview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isRated, setIsRated] = useState(false);
  const [viewRating, setViewRating] = useState<ToolRating | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [bannerImgError, setBannerImgError] = useState(false);

  const taskType = work?.task_type?.toLowerCase() || '';
  const toolInfo = taskType === 'storybook-generator' ? toolConfig.storybook :
                   taskType === 'ecommerce-detail' ? toolConfig.ecommerce :
                   taskType === 'product-description' ? toolConfig.marketing :
                   toolConfig.default;

  const previewImages = files.filter(f => f.file_type === 'image' && f.file_url && f.file_url !== '#');

  // 封面图：优先用 cover_image（新数据为完整API路径），否则用第一张预览图
  const coverUrl = (() => {
    const cover = getFirstImage(work?.cover_image);
    if (cover && !isRelativePath(cover)) return cover;
    if (previewImages.length > 0) return getFileUrl(previewImages[0]!);
    return null;
  })();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [workData, filesData, versionsData] = await Promise.all([
          workApi.getWork(workId),
          workApi.getWorkFiles(workId),
          workApi.getWorkVersions(workId),
        ]);
        setWork(workData);
        setInputParams((workData as any).input_params ?? null);
        setToolParamSchema((workData as any).tool_param_schema ?? null);
        setUsageModes((workData as any).usage_modes ?? []);
        setFiles(filesData ?? []);
        setVersions(versionsData ?? []);

        // 检查是否已评价
        ratingApi.getTaskRating(workData.task_id).then(r => {
          setIsRated(!!r);
        }).catch(() => {/* ignore */});
      } catch (err) {
        console.error('获取数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (workId) {
      fetchData();
    }
  }, [workId]);

  // 处理迭代创作
  const handleIterate = () => {
    // TODO: 打开迭代创作对话框或跳转到工具页面
    router.push(`/tools?workId=${workId}`);
  };

  // 处理下载
  const handleDownload = async (file: WorkFile) => {
    try {
      const token = tokenStorage.getToken();
      const response = await fetch(
        `${API_BASE_URL}/files/works/${file.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('下载失败');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('下载失败:', err);
      toast.error('文件下载失败，请稍后重试');
    }
  };

  // 处理下载全部（动态打包 ZIP）
  const handleDownloadAll = async () => {
    if (downloading) {
      toast.info('正在打包下载中，请稍候...');
      return;
    }
    setDownloading(true);
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
    } catch (err) {
      console.error('下载全部失败:', err);
      // 回退：逐个下载
      for (const file of files) {
        await handleDownload(file);
      }
    } finally {
      setDownloading(false);
    }
  };

  // 处理分享
  const handleShare = () => {
    setShowShareModal(true);
  };

if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Skeleton Banner */}
        <div className="h-64 bg-[#E4E7EB] animate-pulse" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20">
          <div className="bg-white rounded-2xl border border-[#E4E7EB] p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-1/2 bg-[#E4E7EB] rounded" />
              <div className="h-4 w-full bg-[#E4E7EB] rounded" />
              <div className="h-4 w-3/4 bg-[#E4E7EB] rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#E4E7EB] flex items-center justify-center">
            <svg className="w-10 h-10 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">作品不存在</h1>
          <p className="text-[#64748B] mb-6">该作品可能已被删除或您没有访问权限</p>
          <Link href="/works" className="btn-primary px-6 py-3 text-white font-semibold rounded-xl inline-block">
            返回我的作品
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Cover Banner */}
      <div className="relative h-80 lg:h-96 bg-gradient-to-br from-brand-dark to-brand-light overflow-hidden">
        {coverUrl && !bannerImgError ? (
          <img
            src={coverUrl}
            alt={work.title}
            onError={() => setBannerImgError(true)}
            className="w-full h-full object-cover opacity-50"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E3A5F]/80 to-transparent" />

        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        <div className="bg-white rounded-2xl border border-[#E4E7EB] shadow-xl">
          {/* Header */}
          <div className="p-8 border-b border-[#E4E7EB]">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Thumbnail */}
              <div className="flex-shrink-0 -mt-20 lg:-mt-[76px]">
                <div className="w-32 h-32 lg:w-34 lg:h-34 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-brand-dark to-brand-light">
                  {coverUrl && !bannerImgError ? (
                    <img src={coverUrl} alt={work.title} onError={() => setBannerImgError(true)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {toolInfo.icon}
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r',
                    toolInfo.color
                  )}>
                    {toolInfo.icon} {toolInfo.name}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#F8FAFC] text-[#64748B] border border-[#E4E7EB]">
                    v{work.version}
                  </span>
                  {work.status === 'published' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-success-dark">
                      已发布
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-600 border border-red-200">
                      草稿
                    </span>
                  )}
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-[#1E3A5F]">{work.title}</h1>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap gap-2 pt-6 pb-5 border-b border-[#E4E7EB]">
              {usageModes.includes('dialog') && (
                <button
                  onClick={handleIterate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-success-dark to-success-light hover:shadow-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  继续优化
                </button>
              )}
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-white text-[#64748B] border border-[#E4E7EB] hover:text-brand-light hover:border-brand-light transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                创建新作品
              </Link>
              {isRated ? (
                <button
                  onClick={() => {
                    setRatingLoading(true);
                    ratingApi.getTaskRating(work.task_id).then(r => {
                      if (r) setViewRating(r);
                    }).finally(() => setRatingLoading(false));
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#EFF6FF] text-brand-light border border-brand-light transition-all"
                >
                  <svg className={`w-4 h-4 ${ratingLoading ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  已评价
                </button>
              ) : (
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-white text-[#64748B] border border-[#E4E7EB] hover:text-brand-light hover:border-brand-light transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  评价
                </button>
              )}
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-white text-[#64748B] border border-[#E4E7EB] hover:text-brand-light hover:border-brand-light transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                分享
              </button>
              <button
                onClick={handleDownloadAll}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-white text-[#64748B] border border-[#E4E7EB] hover:text-brand-light hover:border-brand-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )}
                {downloading ? '下载中...' : '下载全部'}
              </button>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-6 pt-5">
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                创建于 {formatDate(work.created_at)}
              </div>
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                {work.view_count} 次浏览
              </div>
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                {files.length} 个文件
              </div>
              {(work as any).actual_cost != null && (
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {(work as any).actual_cost} 积分
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-[#FAFBFC] border-b border-[#E4E7EB]">
            <div className="flex items-center gap-1 px-8">
              <button
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'px-6 py-4 text-sm font-semibold border-b-2 transition-colors',
                  activeTab === 'preview'
                    ? 'border-brand-light text-brand-light'
                    : 'border-transparent text-[#64748B] hover:text-[#1E3A5F]'
                )}
              >
                预览
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={cn(
                  'px-6 py-4 text-sm font-semibold border-b-2 transition-colors inline-flex items-center gap-1.5',
                  activeTab === 'files'
                    ? 'border-brand-light text-brand-light'
                    : 'border-transparent text-[#64748B] hover:text-[#1E3A5F]'
                )}
              >
                文件
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#EFF6FF] text-brand-light text-xs font-semibold">
                  {files.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('versions')}
                className={cn(
                  'px-6 py-4 text-sm font-semibold border-b-2 transition-colors inline-flex items-center gap-1.5',
                  activeTab === 'versions'
                    ? 'border-brand-light text-brand-light'
                    : 'border-transparent text-[#64748B] hover:text-[#1E3A5F]'
                )}
              >
                版本历史
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#EFF6FF] text-brand-light text-xs font-semibold">
                  {versions.length}
                </span>
              </button>
              <div className="ml-auto">
                <Link
                  href={`/tools/${work.tool_id || ''}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#059669] hover:text-[#047857] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                  </svg>
                  前往工具页重新生成
                </Link>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div>
                {previewImages.length > 0 ? (
                  <div className="space-y-6">
                    {/* Main Preview */}
                    <div
                      className="aspect-video bg-[#F8FAFC] rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => setSelectedImage(getFileUrl(previewImages[0]!))}
                    >
                      <img
                        src={getFileUrl(previewImages[0]!)}
                        alt={previewImages[0]!.file_name}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Thumbnail Grid */}
                    {previewImages.length > 1 && (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2.5">
                        {previewImages.map((file) => (
                          <button
                            key={file.id}
                            onClick={() => setSelectedImage(getFileUrl(file))}
                            className="aspect-square bg-[#F8FAFC] rounded-lg overflow-hidden border-2 border-transparent hover:border-brand-light transition-colors"
                          >
                            {file.file_url && file.file_url !== '#' && (
                              <img
                                src={getFileUrl(file)}
                                alt={file.file_name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Audio Preview */}
                    {files.some(f => f.file_type === 'audio') && (
                      <div className="mt-8 p-5 lg:p-6 bg-[#F8FAFC] rounded-xl">
                        <h3 className="text-sm font-semibold text-[#1E3A5F] mb-3">🎧 音频</h3>
                        {files.filter(f => f.file_type === 'audio').map(file => (
                          <div key={file.id} className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 bg-white rounded-lg mb-2 last:mb-0">
                            {getFileIcon('audio')}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1F2937] truncate">{file.file_name}</p>
                              <p className="text-xs text-[#94A3B8]">{formatFileSize(file.file_size)}{file.duration && ` · ${formatDuration(file.duration)}`}</p>
                            </div>
                            <audio
                              controls
                              className="h-8 w-48"
                              preload="none"
                            >
                              <source src={getFileUrl(file)} type={file.mime_type || 'audio/wav'} />
                              您的浏览器不支持音频播放
                            </audio>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F8FAFC] flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-[#64748B]">暂无可预览内容</p>
                  </div>
                )}

                {/* 生成参数区块 */}
                {inputParams && Object.keys(inputParams).length > 0 && (
                  <div className="mt-6 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-5">
                    <h4 className="text-sm font-bold text-[#92400E] mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      生成参数
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(toolParamSchema && toolParamSchema.length > 0
                        ? [
                            ...toolParamSchema.filter(f => inputParams[f.key] !== undefined && inputParams[f.key] !== null),
                            ...Object.keys(inputParams)
                              .filter(k => !toolParamSchema.some(s => s.key === k))
                              .map(k => ({ key: k, label: k, type: 'text', order: 999 })),
                          ]
                        : Object.keys(inputParams).map(k => ({ key: k, label: k, type: 'text', order: 0 }))
                      )
                        .sort((a, b) => a.order - b.order)
                        .map(field => (
                          <div key={field.key} className="space-y-1">
                            <label className="text-xs font-medium text-[#92400E]/70">{field.label}</label>
                            {field.type === 'textarea' || field.type === 'prompt' ? (
                              <div className="relative group">
                                <pre className="text-sm text-[#1F2937] bg-[#FEF3C7] rounded-lg p-3 font-mono text-xs leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                                  {inputParams[field.key]}
                                </pre>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(String(inputParams[field.key]));
                                  }}
                                  className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 hover:bg-white text-[#64748B] hover:text-[#1E3A5F] opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm text-[#1F2937]">{String(inputParams[field.key])}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Files Tab */}
            {activeTab === 'files' && (
              <div>
                <div className="divide-y divide-[#E4E7EB] border border-[#E4E7EB] rounded-xl overflow-hidden">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center gap-4 p-4 hover:bg-[#F8FAFC] transition-colors">
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center',
                        file.file_type === 'image' ? 'bg-blue-50 text-blue-600' :
                        file.file_type === 'pdf' ? 'bg-red-50 text-red-600' :
                        file.file_type === 'audio' ? 'bg-green-50 text-green-600' :
                        file.file_type === 'video' ? 'bg-purple-50 text-purple-600' :
                        'bg-gray-50 text-gray-600'
                      )}>
                        {getFileIcon(file.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1E3A5F] truncate">{file.file_name}</p>
                        <p className="text-sm text-[#64748B]">
                          {formatFileSize(file.file_size)}
                          {file.page_number && ` · 第${file.page_number}页`}
                          {file.duration && ` · ${formatDuration(file.duration)}`}
                        </p>
                      </div>
                      {file.file_type === 'image' && file.file_url && file.file_url !== '#' && (
                        <button
                          onClick={() => setSelectedImage(getFileUrl(file))}
                          className="px-4 py-2 text-sm font-medium text-brand-light hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          查看
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(file)}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-success-dark to-success-light hover:shadow-lg rounded-lg transition-all"
                      >
                        下载
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Versions Tab */}
            {activeTab === 'versions' && (
              <div>
                <div className="space-y-4">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border transition-all',
                        selectedVersion === version.version
                          ? 'border-brand-light bg-blue-50'
                          : 'border-[#E4E7EB] hover:border-brand-light/50'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                        selectedVersion === version.version
                          ? 'bg-gradient-to-r from-brand-dark to-brand-light text-white'
                          : 'bg-[#F8FAFC] text-[#64748B]'
                      )}>
                        v{version.version}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[#1E3A5F]">{version.title}</p>
                        <p className="text-sm text-[#64748B]">{formatDate(version.created_at)}</p>
                      </div>
                      {selectedVersion !== version.version && (
                        <button className="px-4 py-2 text-sm font-medium text-brand-light hover:bg-blue-100 rounded-lg transition-colors">
                          查看此版本
                        </button>
                      )}
                      {selectedVersion === version.version && (
                        <span className="px-4 py-2 text-sm font-medium text-success-dark bg-green-50 rounded-lg">
                          当前版本
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Version Compare Tip */}
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-amber-800">版本对比</p>
                      <p className="text-sm text-amber-700">您可以选择任意历史版本作为基础，继续优化您的作品。</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#1E3A5F]">分享作品</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F8FAFC] flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3 justify-center">
                <button className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
                  </svg>
                </button>
                <button className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.205 2.25h3.308l-7.227 8.26 8.502 11.24H16.13l-5.214-6.817L4.95 21.75H1.64l7.73-8.835L1.215 2.25H8.04l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z"/>
                  </svg>
                </button>
                <button className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </button>
                <button className="w-12 h-12 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 9h4v13H2z" />
                  </svg>
                </button>
              </div>

              <div className="pt-4 border-t border-[#E4E7EB]">
                <label className="block text-sm font-medium text-[#64748B] mb-2">分享链接</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`https://lingchuang.ai/works/${workId}`}
                    readOnly
                    className="flex-1 px-4 py-2 bg-[#F8FAFC] border border-[#E4E7EB] rounded-lg text-sm"
                  />
                  <button className="px-4 py-2 bg-brand-light text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
                    复制
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 评价弹窗 */}
      {work && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          toolId={work.tool_id || ''}
          taskId={work.task_id}
          toolName={toolInfo.name}
          onSubmitSuccess={() => {
            toast.success('评价成功，感谢您的反馈！');
            setIsRated(true);
            setShowRatingModal(false);
          }}
        />
      )}

      {/* 查看评价弹窗 */}
      {viewRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setViewRating(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setViewRating(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className="text-2xl font-bold text-[#1E3A5F] mb-2 text-center">我的评价</h3>
            {/* 星级 */}
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <svg key={star} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={star <= viewRating.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
            {/* 评价内容 */}
            {viewRating.content && (
              <p className="text-gray-700 text-sm mb-4 text-center">{viewRating.content}</p>
            )}
            <p className="text-xs text-gray-400 text-center">
              {new Date(viewRating.created_at * 1000).toLocaleDateString('zh-CN')}
            </p>
            {/* 管理员回复 */}
            {viewRating.admin_reply && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs font-medium text-blue-700 mb-1">管理员回复：</p>
                <p className="text-sm text-blue-900">{viewRating.admin_reply}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
