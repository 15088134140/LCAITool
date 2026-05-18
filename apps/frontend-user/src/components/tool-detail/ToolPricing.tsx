'use client';

import type { ToolPricing as ToolPricingType } from '../../types';

interface ToolPricingProps {
  pricing: ToolPricingType;
}

export function ToolPricing({ pricing }: ToolPricingProps) {
  return (
    <section className="pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <span className="text-white text-2xl">💰</span>
          </div>
          <h2 className="text-3xl font-bold text-brand-dark">透明定价，明明白白消费</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* 基础调用费
          <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 transition-all hover:border-green-600">
            <h3 className="font-semibold text-xl text-brand-dark mb-2">基础调用费</h3>
            <p className="text-gray-500 mb-6">每次调用固定收取，包含AI创作和基础排版服务</p>
            <div className="text-4xl font-bold text-green-600 mb-2">
              {pricing.baseFee} 积分
            </div>
            <p className="text-sm text-gray-500">≈ ¥{(pricing.baseFee * 0.1).toFixed(1)} / 次</p>
            <hr className="my-6 border-gray-200" />
            <ul className="space-y-3 text-gray-500">
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                AI智能故事创作
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                专业排版设计
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                提示词文档
              </li>
            </ul>
          </div>

          {/* 插图生成 */}
          <div className="bg-white rounded-2xl p-8 border-2 border-green-600 bg-gradient-to-br from-green-50 to-emerald-50 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold">
                推荐
              </span>
            </div>
            <h3 className="font-semibold text-xl text-brand-dark mb-2">插图生成</h3>
            <p className="text-gray-500 mb-6">高清专业插图，支持多种艺术风格，保持风格统一</p>
            <div className="text-4xl font-bold text-green-600 mb-2">
              {pricing.resourceFees?.image || 1} 积分
            </div>
            <p className="text-sm text-gray-500">/ 张</p>
            <hr className="my-6 border-gray-200" />
            <ul className="space-y-3 text-gray-500">
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                1024x1024 高清分辨率
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                10+艺术风格可选
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                角色形象一致性保障
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                PNG 无损下载
              </li>
            </ul>
          </div>

          {/* 语音合成 */}
          <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 transition-all hover:border-green-600">
            <h3 className="font-semibold text-xl text-brand-dark mb-2">语音合成</h3>
            <p className="text-gray-500 mb-6">专业AI配音，支持多种音色，自动添加背景音乐</p>
            <div className="text-4xl font-bold text-green-600 mb-2">
              {pricing.resourceFees?.audio || 0.5} 积分
            </div>
            <p className="text-sm text-gray-500">/ 段</p>
            <hr className="my-6 border-gray-200" />
            <ul className="space-y-3 text-gray-500">
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                5种专业音色可选
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                背景音乐适配
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                MP3 高清音质
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                音效增强处理
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
