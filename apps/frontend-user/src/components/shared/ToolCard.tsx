'use client';

import Link from 'next/link';
import type { Tool } from '../../types';
import { StarRating } from './StarRating';

interface ToolCardProps {
  tool: Tool;
  variant?: 'default' | 'featured';
}

export function ToolCard({ tool, variant = 'default' }: ToolCardProps) {
  // 如果是 featured 变体，使用不同的样式
  const isFeatured = variant === 'featured' || tool.isFeatured;

  return (
    <Link href={`/tools/${tool.id}`}>
      <div className={`tool-card card-hover flex ${isFeatured ? 'flex-col p-6' : 'items-center gap-4 p-4'}`}>
        {/* 工具图标 */}
        <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-brand-dark to-brand-light rounded-xl flex items-center justify-center text-2xl text-white">
          {tool.icon}
        </div>

        {/* 工具信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {tool.name}
            </h3>
            {tool.isNew && (
              <span className="new-badge">NEW</span>
            )}
            {tool.isHot && (
              <span className="hot-badge">HOT</span>
            )}
          </div>

          <p className="text-sm text-gray-500 line-clamp-2 mb-2">
            {tool.shortDescription}
          </p>

          <div className="flex items-center justify-between">
            <StarRating rating={tool.avgRating} size="sm" showValue />
            <span className="text-xs text-gray-400">
              {tool.useCount.toLocaleString()} 使用
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
