'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToolStore } from '../../../store/useToolStore';
import {
  ToolHero,
  ToolFeatures,
  ToolHowTo,
  ToolPricing,
  ToolReviews,
  ToolCreationForm,
} from '../../../components/tool-detail';

export default function GenericToolDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { currentTool, detailLoading, error, fetchToolDetail, clearCurrentTool } = useToolStore();

  useEffect(() => {
    fetchToolDetail(params.id);
    return () => clearCurrentTool();
  }, [params.id, fetchToolDetail, clearCurrentTool]);

  // 如果工具配置了 slug 且当前 URL 不是 slug，重定向
  useEffect(() => {
    if (currentTool?.slug && currentTool.slug !== params.id) {
      router.replace(`/tools/${currentTool.slug}`);
    }
  }, [currentTool, params.id, router]);

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
    <div className="page-bg-animated min-h-screen bg-[#F8FAFC]">
<ToolHero tool={currentTool} />
      <ToolCreationForm tool={currentTool} />
      <ToolFeatures />
      <ToolHowTo />
      <ToolPricing pricing={currentTool.pricing} />
      <ToolReviews toolId={currentTool.id} />

      {/* Bottom CTA */}
      <section className="py-16 bg-gradient-to-br from-green-600 to-green-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">准备好开始了吗？</h2>
          <p className="text-white/80 text-lg mb-8">立即体验 {currentTool.name}，感受AI带来的效率提升</p>
          <a
            href="#start-creation"
            className="inline-block bg-white text-green-600 px-10 py-4 rounded-xl text-lg font-semibold shadow-xl hover:shadow-2xl transition-all focus-ring"
          >
            立即开始使用
          </a>
        </div>
      </section>
    </div>
  );
}
