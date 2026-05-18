'use client';

import type { Tool } from '../../types';

interface ToolHeroProps {
  tool: Tool;
}

export function ToolHero({ tool }: ToolHeroProps) {
  // 根据工具类型确定快速统计数据
  const getQuickStats = () => {
    switch (tool.id) {
      case 'storybook-generator':
        return [
          { value: '2-5', label: '分钟生成', color: 'text-brand-dark' },
          { value: '10+', label: '艺术风格', color: 'text-green-600' },
          { value: '5种', label: '配音音色', color: 'text-blue-500' },
        ];
      case 'ecommerce-detail':
        return [
          { value: '1-3', label: '分钟生成', color: 'text-brand-dark' },
          { value: '8+', label: '视觉风格', color: 'text-green-600' },
          { value: 'PSD', label: '源文件导出', color: 'text-blue-500' },
        ];
      case 'marketing-copywriter':
        return [
          { value: '0.5-1', label: '分钟生成', color: 'text-brand-dark' },
          { value: '4+', label: '平台适配', color: 'text-green-600' },
          { value: '5种', label: '文案风格', color: 'text-blue-500' },
        ];
      default:
        return [
          { value: '快速', label: '生成', color: 'text-brand-dark' },
          { value: '多风格', label: '可选', color: 'text-green-600' },
          { value: '高质量', label: '导出', color: 'text-blue-500' },
        ];
    }
  };

  const stats = getQuickStats();

  return (
    <section className="pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Left: Image */}
          <div className="sticky top-24">
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={tool.heroImage || 'https://picsum.photos/800/600'}
                alt={tool.name}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-brand-dark cursor-pointer">
                <img
                  src={tool.heroImage || 'https://picsum.photos/200/200?1'}
                  className="w-full h-full object-cover"
                  alt="缩略图1"
                />
              </div>
              <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-blue-500 transition-colors">
                <img
                  src="https://picsum.photos/200/200?2"
                  className="w-full h-full object-cover"
                  alt="缩略图2"
                />
              </div>
              <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-blue-500 transition-colors">
                <img
                  src="https://picsum.photos/200/200?3"
                  className="w-full h-full object-cover"
                  alt="缩略图3"
                />
              </div>
            </div>
          </div>

          {/* Right: Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {tool.isHot && (
                <span className="badge badge-hot">热门</span>
              )}
              {tool.isNew && !tool.isHot && (
                <span className="badge badge-new">新上线</span>
              )}
              <span className="text-sm text-gray-500">累计使用 {tool.useCount.toLocaleString()} 次</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-brand-dark mb-4">{tool.name}</h1>

            <p className="text-lg text-gray-500 mb-6 leading-relaxed">{tool.description}</p>

            {/* Rating */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-amber-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="font-semibold text-brand-dark ml-2">{tool.avgRating.toFixed(1)}</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">{tool.useCount} 条真实评价</span>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center p-4 bg-white rounded-xl border border-gray-200"
                >
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Pricing Preview */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500">基础调用费</span>
                <span className="text-2xl font-bold text-green-600">{tool.pricing.baseFee} 积分</span>
              </div>
              {tool.pricing.resourceFees?.image && (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-500">插图生成</span>
                  <span className="font-semibold text-brand-dark">{tool.pricing.resourceFees.image} 积分/张</span>
                </div>
              )}
              {tool.pricing.resourceFees?.audio && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">语音生成</span>
                  <span className="font-semibold text-brand-dark">{tool.pricing.resourceFees.audio} 积分/段</span>
                </div>
              )}
              <hr className="my-4 border-gray-200" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-brand-dark">示例：10页绘本</span>
                <span className="text-xl font-bold bg-gradient-to-r from-brand-dark to-blue-500 bg-clip-text text-transparent">
                  ≈ {(tool.pricing.baseFee + 10 * (tool.pricing.resourceFees?.image || 1) + 10 * (tool.pricing.resourceFees?.audio || 0.5)).toFixed(0)} 积分
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#start-creation"
                className="flex-1 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold text-lg rounded-xl hover:shadow-2xl transition-all text-center"
              >
                立即使用
              </a>
              <button className="flex-1 py-4 border-2 border-brand-dark text-brand-dark font-bold text-lg rounded-xl hover:bg-brand-dark hover:text-white transition-colors">
                收藏工具
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-4">
              注册即送体验积分，完整体验所有功能
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
