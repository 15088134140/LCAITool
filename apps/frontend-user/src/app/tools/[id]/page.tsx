'use client';

import { useEffect } from 'react';
import { useToolStore } from '../../../store/useToolStore';
import {
  ToolHero,
  ToolTabs,
  ToolFeatures,
  ToolHowTo,
} from '../../../components/tool-detail';

interface ToolDetailPageProps {
  params: {
    id: string;
  };
}

export default function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { currentTool, detailLoading, error, fetchToolDetail, clearCurrentTool } = useToolStore();

  useEffect(() => {
    fetchToolDetail(params.id);
    return () => clearCurrentTool();
  }, [fetchToolDetail, clearCurrentTool, params.id]);

  if (detailLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!currentTool) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-[#64748B]">工具不存在</div>
      </div>
    );
  }

  return (
    <div className="page-bg-animated">
      <ToolHero tool={currentTool} />

      {/* 核心内容区域 */}
      <section id="start-creation" className="pb-12 section-bg-blobs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 使用说明 */}
          <ToolHowTo />
        </div>
      </section>

      {/* 功能特性 */}
      <section className="pb-12 section-bg-blobs bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ToolFeatures />
        </div>
      </section>

      {/* Tab 切换区域 */}
      <section className="pb-12 section-bg-blobs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ToolTabs tool={currentTool} />
        </div>
      </section>

      {/* 底部CTA */}
      <section className="py-16 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] section-bg-blobs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            准备好开始创作了吗？
          </h2>
          <p className="text-blue-200 text-lg mb-8">
            注册即送体验积分，完整体验 {currentTool.name} 的强大功能
          </p>
          <button className="btn-primary px-10 py-4 text-lg focus-ring">
            立即免费注册
          </button>
        </div>
      </section>
    </div>
  );
}
