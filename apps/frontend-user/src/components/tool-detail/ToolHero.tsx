'use client';

import { StarRating } from '../shared';
import type { Tool } from '../../types';

interface ToolHeroProps {
  tool: Tool;
}

export function ToolHero({ tool }: ToolHeroProps) {
  return (
    <section className="bg-gradient-to-br from-brand-dark to-brand-light py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* 工具图标 */}
          <div className="flex-shrink-0 w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-5xl shadow-xl">
            {tool.icon}
          </div>

          {/* 工具信息 */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold text-white">{tool.name}</h1>
              {tool.isNew && <span className="new-badge">NEW</span>}
              {tool.isHot && <span className="hot-badge">HOT</span>}
            </div>

            <p className="text-white/90 text-lg mb-4 max-w-3xl">
              {tool.description}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-white">
              <div className="flex items-center gap-2">
                <StarRating rating={tool.avgRating} size="md" />
                <span className="text-sm">({tool.avgRating})</span>
              </div>

              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm">{tool.useCount.toLocaleString()} 次使用</span>
              </div>

              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <div className="flex flex-wrap gap-2">
                  {tool.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-white/20 px-2 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 立即使用按钮 */}
          <div className="flex-shrink-0">
            <button className="btn-primary text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-xl">
              立即使用
            </button>
            <p className="text-white/70 text-sm mt-2 text-center">
              基础费用: {tool.pricing.baseFee} 积分起
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
