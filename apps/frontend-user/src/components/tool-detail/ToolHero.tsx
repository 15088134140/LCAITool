'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FavoriteButton } from './FavoriteButton';
import { useAuthStore } from '@/store';
import type { Tool } from '../../types';

interface ToolHeroProps {
  tool: Tool;
}

export function ToolHero({ tool }: ToolHeroProps) {
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
        return 'https://picsum.photos/600/400?random=' + tool.id;
    }
  };

  // 根据工具类型确定快速统计数据
  const getQuickStats = () => {
    switch (tool.id) {
      case 'storybook-generator':
        return [
          { value: '2-5', label: '分钟生成', color: '#1E3A5F' },
          { value: '10+', label: '艺术风格', color: '#059669' },
          { value: '5种', label: '配音音色', color: '#2563EB' },
        ];
      case 'ecommerce-detail':
        return [
          { value: '1-3', label: '分钟生成', color: '#1E3A5F' },
          { value: '8+', label: '视觉风格', color: '#059669' },
          { value: 'PSD', label: '源文件导出', color: '#2563EB' },
        ];
      case 'marketing-copywriter':
        return [
          { value: '0.5-1', label: '分钟生成', color: '#1E3A5F' },
          { value: '4+', label: '平台适配', color: '#059669' },
          { value: '5种', label: '文案风格', color: '#2563EB' },
        ];
      default:
        return [
          { value: '快速', label: '生成', color: '#1E3A5F' },
          { value: '多风格', label: '可选', color: '#059669' },
          { value: '高质量', label: '导出', color: '#2563EB' },
        ];
    }
  };

  const stats = getQuickStats();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Parse cover_image: support "|" delimited multi-image URLs
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const coverImages: string[] = tool.heroImage
    ? tool.heroImage.split('|').map(url => url.trim()).filter(Boolean)
    : [];
  const displayImages = coverImages.length > 0 ? coverImages : [getToolImage()];

  return (
    <section className="py-8 section-bg-blobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#64748B] mb-8">
          <Link href="/" className="hover:text-[#1E3A5F] transition-colors focus-ring rounded">
            首页
          </Link>
          <span>/</span>
          <Link href="/tools" className="hover:text-[#1E3A5F] transition-colors focus-ring rounded">
            工具中心
          </Link>
          <span>/</span>
          <span className="text-[#1E3A5F] font-medium">{tool.name}</span>
        </nav>

        {/* Hero Content */}
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* Left: Image Gallery */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              {displayImages.map((src, index) => (
                <img
                  key={index}
                  src={src}
                  alt={`${tool.name} - ${index + 1}`}
                  className={`w-full h-auto object-cover ${index === selectedImageIndex ? 'block' : 'hidden'}`}
                />
              ))}
            </div>
            {displayImages.length > 1 && (
            <div className="flex gap-3 mt-4">
              {displayImages.map((src, index) => (
                <div
                  key={index}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                    index === selectedImageIndex
                      ? 'border-[#1E3A5F] shadow-md'
                      : 'border-[#E4E7EB] hover:border-[#2563EB]'
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {tool.demos?.slice(0, 2).map((demo, index) => (
                <div
                  key={`demo-${index}`}
                  className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#E4E7EB] cursor-pointer hover:border-[#2563EB] transition-colors"
                >
                  <img
                    src={demo.image || `https://picsum.photos/200/200?random=${tool.id}-${index}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Right: Info */}
          <div>
            {/* Badges */}
            <div className="flex items-center gap-3 mb-4">
              {tool.isHot && (
                <span className="tag-hot px-2.5 py-1 rounded-full text-xs font-bold">热门</span>
              )}
              {tool.isNew && !tool.isHot && (
                <span className="tag-new px-2.5 py-1 rounded-full text-xs font-bold">新品</span>
              )}
              <span className="text-sm text-[#64748B]">累计使用 {tool.useCount.toLocaleString()} 次</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4">{tool.name}</h1>

            {/* Description */}
            <p className="text-lg text-[#64748B] mb-6 leading-relaxed">{tool.description}</p>

            {/* Rating */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="w-5 h-5 text-[#F59E0B]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="font-semibold text-[#1E3A5F] ml-2">{tool.avgRating.toFixed(1)}</span>
              </div>
              <span className="text-[#64748B]">|</span>
              <span className="text-sm text-[#64748B]">{tool.reviewCount} 条真实评价</span>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center p-4 bg-white rounded-xl border border-[#E4E7EB]"
                >
                  <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-sm text-[#64748B]">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Pricing Preview */}
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB] mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[#64748B]">基础调用费</span>
                <span className="text-2xl font-bold text-[#059669]">{tool.pricing.baseFee ? `${tool.pricing.baseFee} 积分` : '免费'}</span>
              </div>
              {tool.pricing.resourceFees?.image && (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[#64748B]">插图生成</span>
                  <span className="font-semibold text-[#1E3A5F]">{tool.pricing.resourceFees.image} 积分/张</span>
                </div>
              )}
              {tool.pricing.resourceFees?.audio && (
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">语音合成</span>
                  <span className="font-semibold text-[#1E3A5F]">{tool.pricing.resourceFees.audio} 积分/段</span>
                </div>
              )}
              <hr className="my-4 border-[#E4E7EB]" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1E3A5F]">示例：10页</span>
                <span className="text-xl font-bold gradient-text">
                  ≈ {tool.pricing.baseFee + (tool.pricing.resourceFees?.image || 0) * 10 + (tool.pricing.resourceFees?.audio || 0) * 10} 积分
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="#start-creation"
                className="btn-primary flex-1 py-4 text-white font-bold text-lg rounded-xl focus-ring text-center"
              >
                立即使用
              </Link>
              <FavoriteButton toolId={tool.id} size="lg" className="sm:flex-shrink-0" />
            </div>

            {!isAuthenticated && (
            <p className="text-center text-sm text-[#64748B] mt-4">
              注册即送体验积分，完整体验所有功能
            </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
