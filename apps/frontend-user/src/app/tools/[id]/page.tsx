'use client';

import { useEffect } from 'react';
import { useToolStore } from '../../../store';
import { Breadcrumb } from '../../../components/layout';
import {
  ToolHero,
  ToolFeatures,
  ToolHowTo,
  ToolPricing,
  ToolReviews,
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark" />
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
        <div className="text-gray-500">工具不存在</div>
      </div>
    );
  }

  return (
    <>
      {/* 面包屑导航 */}
      <div className="bg-gray-50 py-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: '首页', href: '/' },
              { label: '工具中心', href: '/tools' },
              { label: currentTool.name, href: `/tools/${currentTool.id}`, active: true },
            ]}
          />
        </div>
      </div>

      <ToolHero tool={currentTool} />
      <ToolFeatures />
      <ToolHowTo />
      <ToolPricing pricing={currentTool.pricing} />
      <ToolReviews toolId={currentTool.id} />

      {/* 底部CTA */}
      <section className="py-16 bg-gradient-to-br from-success-dark to-success-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            准备好开始了吗？
          </h2>
          <p className="text-white/80 text-lg mb-8">
            立即体验 {currentTool.name}，感受AI带来的效率提升
          </p>
          <button className="bg-white text-success-dark px-10 py-4 rounded-xl text-lg font-semibold shadow-xl hover:shadow-2xl transition-shadow">
            立即开始使用
          </button>
        </div>
      </section>
    </>
  );
}
