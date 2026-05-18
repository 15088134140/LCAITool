'use client';

import { useEffect } from 'react';
import { useToolStore } from '../../store';

export function BenchmarkTools() {
  const { fetchTools } = useToolStore();

  useEffect(() => {
    fetchTools({ isFeatured: true });
  }, [fetchTools]);

  return (
    <section id="tools" className="py-16 lg:py-20 bg-white section-bg-blobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4">精品工具 · 开箱即用</h2>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto">每一款工具都经过专业调试，输出质量达到商用标准，让你的创意快速落地</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Tool 1 */}
          <div className="tool-card card-hover">
            <div className="aspect-[4/3] relative overflow-hidden">
              <img src="/images/tool-illustration.png"
                   alt="AI有声绘本生成专家"
                   className="w-full h-full object-cover"
                   loading="lazy" />
              <div className="absolute top-4 left-4">
                <span className="hot-badge">HOT</span>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">AI有声绘本生成专家</h3>
              <p className="text-[#64748B] mb-4">输入故事主题或文字，自动生成带精美插图和专业配音的完整有声绘本</p>
              <div className="flex items-center gap-2 mb-4 text-sm text-[#64748B]">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  4.9
                </span>
                <span>·</span>
                <span>12,580 人使用</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[#059669]">8 积分/次起</span>
                <div className="flex gap-2">
                  <a href="/tools/storybook-generator" className="px-4 py-2 border border-[#1E3A5F] text-[#1E3A5F] rounded-lg font-medium hover:bg-[#1E3A5F] hover:text-white transition-colors focus-ring">查看演示</a>
                  <a href="/tools/storybook-generator" className="btn-primary px-4 py-2 text-white rounded-lg font-medium focus-ring">立即使用</a>
                </div>
              </div>
            </div>
          </div>

          {/* Tool 2 */}
          <div className="tool-card card-hover">
            <div className="aspect-[4/3] relative overflow-hidden">
              <img src="/images/tool-ecommerce.png"
                   alt="AI电商商品详情页生成器"
                   className="w-full h-full object-cover"
                   loading="lazy" />
              <div className="absolute top-4 left-4">
                <span className="new-badge">NEW</span>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">AI电商商品详情页生成器</h3>
              <p className="text-[#64748B] mb-4">输入商品信息，一键生成包含主图、详情图、营销文案的完整详情页</p>
              <div className="flex items-center gap-2 mb-4 text-sm text-[#64748B]">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  4.8
                </span>
                <span>·</span>
                <span>8,920 人使用</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[#059669]">12 积分/次起</span>
                <div className="flex gap-2">
                  <a href="/tools/ecommerce-detail" className="px-4 py-2 border border-[#1E3A5F] text-[#1E3A5F] rounded-lg font-medium hover:bg-[#1E3A5F] hover:text-white transition-colors focus-ring">查看演示</a>
                  <a href="/tools/ecommerce-detail" className="btn-primary px-4 py-2 text-white rounded-lg font-medium focus-ring">立即使用</a>
                </div>
              </div>
            </div>
          </div>

          {/* Tool 3 */}
          <div className="tool-card card-hover">
            <div className="aspect-[4/3] relative overflow-hidden">
              <img src="/images/tool-content.png"
                   alt="AI营销文案大师"
                   className="w-full h-full object-cover"
                   loading="lazy" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">AI营销文案大师</h3>
              <p className="text-[#64748B] mb-4">专业级营销文案生成，支持多风格、多平台，转化率提升看得见</p>
              <div className="flex items-center gap-2 mb-4 text-sm text-[#64748B]">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  4.9
                </span>
                <span>·</span>
                <span>15,230 人使用</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[#059669]">5 积分/次起</span>
                <div className="flex gap-2">
                  <a href="/tools/marketing-copywriter" className="px-4 py-2 border border-[#1E3A5F] text-[#1E3A5F] rounded-lg font-medium hover:bg-[#1E3A5F] hover:text-white transition-colors focus-ring">查看演示</a>
                  <a href="/tools/marketing-copywriter" className="btn-primary px-4 py-2 text-white rounded-lg font-medium focus-ring">立即使用</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
