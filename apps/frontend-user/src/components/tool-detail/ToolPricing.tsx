'use client';

import type { ToolPricing as ToolPricingType } from '../../types';

interface ToolPricingProps {
  pricing: ToolPricingType;
}

export function ToolPricing({ pricing }: ToolPricingProps) {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
          费用说明
        </h2>

        <div className="pricing-card">
          {/* 基础费用 */}
          <div className="text-center mb-8 pb-8 border-b border-gray-200">
            <div className="text-5xl font-bold text-brand-dark mb-2">
              {pricing.baseFee}
              <span className="text-xl text-gray-500 font-normal"> 积分</span>
            </div>
            <p className="text-gray-600">基础费用（每次生成）</p>
          </div>

          {/* 额外费用明细 */}
          {pricing.resourceFees && Object.keys(pricing.resourceFees).length > 0 && (
            <>
              <h3 className="font-semibold text-gray-900 mb-4">额外资源费用</h3>
              <table className="w-full mb-8">
                <tbody>
                  {Object.entries(pricing.resourceFees).map(([key, value]) => (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-3 text-gray-600">
                        {key === 'image' && '图片生成'}
                        {key === 'audio' && '语音合成'}
                        {key === 'video' && '视频生成'}
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900">
                        {value} 积分/{key === 'image' ? '张' : key === 'audio' ? '分钟' : '秒'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* 示例 */}
          {pricing.example && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <span className="font-medium">💡 举例：</span>
                {pricing.example}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
