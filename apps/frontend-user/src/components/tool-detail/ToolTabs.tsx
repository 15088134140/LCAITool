'use client';

import { useState } from 'react';
import { ToolDemos } from './ToolDemos';
import { ToolPricing } from './ToolPricing';
import { ToolReviews } from './ToolReviews';
import type { Tool } from '../../types';

type TabType = 'demo' | 'pricing' | 'reviews';

interface ToolTabsProps {
  tool: Tool;
}

export function ToolTabs({ tool }: ToolTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('demo');

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-[#E4E7EB] mb-8">
        <div className="flex gap-8">
          <button
            className={`tab-btn ${activeTab === 'demo' ? 'active' : ''} py-4 text-lg focus-ring`}
            onClick={() => setActiveTab('demo')}
          >
            成品展示
          </button>
          <button
            className={`tab-btn ${activeTab === 'pricing' ? 'active' : ''} py-4 text-lg focus-ring`}
            onClick={() => setActiveTab('pricing')}
          >
            费用说明
          </button>
          <button
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''} py-4 text-lg focus-ring`}
            onClick={() => setActiveTab('reviews')}
          >
            用户评价
            <span className="ml-2 bg-[#E4E7EB] text-[#64748B] text-sm px-2 py-0.5 rounded-full">
              {tool.reviewCount}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'demo' && (
          <ToolDemos demos={tool.demos || []} />
        )}
        {activeTab === 'pricing' && (
          <ToolPricing pricing={tool.pricing} />
        )}
        {activeTab === 'reviews' && (
          <ToolReviews toolId={tool.id} />
        )}
      </div>
    </div>
  );
}