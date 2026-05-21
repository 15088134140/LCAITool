'use client';

import Link from 'next/link';
import type { Tool } from '../../types';

interface ToolCardProps {
  tool: Tool;
  showImage?: boolean;
}

export function ToolCard({ tool, showImage = false }: ToolCardProps) {
  // 根据工具ID获取对应的图片
  const getToolImage = () => {
    switch (tool.id) {
      case 'storybook-generator':
        return '/images/tool-illustration.png';
      case 'ecommerce-detail':
        return '/images/tool-ecommerce.png';
      case 'marketing-copywriter':
        return '/images/tool-content.png';
      default:
        return 'https://picsum.photos/600/300?random=' + tool.id;
    }
  };

  return (
    <Link href={`/tools/${tool.id}`} className="tool-card bg-white rounded-2xl overflow-hidden group">
      {showImage && (
        <div className="relative">
          <img
            src={tool.heroImage || getToolImage()}
            alt={tool.name}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-4 left-4 flex gap-2">
            {tool.isHot && (
              <span className="tag-hot px-2.5 py-1 rounded-full text-xs font-bold">热门</span>
            )}
            {tool.isNew && !tool.isHot && (
              <span className="tag-new px-2.5 py-1 rounded-full text-xs font-bold">新品</span>
            )}
            {tool.isFeatured && (
              <span className="bg-white/90 text-[#1E3A5F] px-2.5 py-1 rounded-full text-xs font-bold">标杆工具</span>
            )}
          </div>
        </div>
      )}
      <div className="p-6">
        {!showImage && (
          <div className="flex items-center gap-2 mb-3">
            {tool.isHot && (
              <span className="tag-hot px-2.5 py-1 rounded-full text-xs font-bold">热门</span>
            )}
            {tool.isNew && !tool.isHot && (
              <span className="tag-new px-2.5 py-1 rounded-full text-xs font-bold">新品</span>
            )}
          </div>
        )}
        <h3 className="font-bold text-lg text-[#1E3A5F] mb-2">{tool.name}</h3>
        <p className="text-[#64748B] text-sm mb-4 line-clamp-2">
          {tool.shortDescription || tool.description}
        </p>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium text-[#1E3A5F]">{tool.avgRating.toFixed(1)}</span>
            <span className="text-xs text-[#64748B] ml-1">{tool.useCount.toLocaleString()}人使用</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[#059669] font-bold">
            {tool.pricing.baseFee} <span className="text-sm font-normal text-[#64748B]">积分起/次</span>
          </div>
          <span className="px-4 py-2 bg-[#F0F7FF] text-[#2563EB] rounded-lg text-sm font-medium group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
            立即使用
          </span>
        </div>
      </div>
    </Link>
  );
}