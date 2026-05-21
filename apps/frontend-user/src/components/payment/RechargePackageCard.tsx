'use client';

import React from 'react';
import type { RechargePackage } from '@/lib/api/types';

interface RechargePackageCardProps {
  pkg: RechargePackage;
  isSelected: boolean;
  onSelect: (pkg: RechargePackage) => void;
}

export const RechargePackageCard: React.FC<RechargePackageCardProps> = ({
  pkg,
  isSelected,
  onSelect,
}) => {
  const totalPoints = pkg.base_points + pkg.bonus_points;
  const savingsPercentage = pkg.original_price > 0
    ? Math.round(((pkg.original_price - pkg.sale_price) / pkg.original_price) * 100)
    : 0;

  return (
    <div
      className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 card-hover ${
        isSelected
          ? 'border-[#059669] shadow-lg shadow-green-500/20 bg-white'
          : 'border-[#E4E7EB] bg-white hover:border-[#2563EB] hover:shadow-md'
      }`}
      onClick={() => onSelect(pkg)}
    >
      {/* Popular badge */}
      {pkg.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-[#F59E0B] to-[#EF4444] text-white px-4 py-1 rounded-full text-sm font-bold">
            🔥 推荐
          </span>
        </div>
      )}

      {/* Package name */}
      <div className="text-center mb-4 pt-2">
        <h3 className="font-bold text-xl text-[#1E3A5F] mb-1">{pkg.name}</h3>
        {pkg.description && (
          <p className="text-sm text-[#64748B]">{pkg.description}</p>
        )}
      </div>

      {/* Points display */}
      <div className="text-center mb-4">
        <div className="text-4xl font-bold text-[#1E3A5F]">{totalPoints}</div>
        <div className="text-[#64748B]">积分</div>
        {pkg.bonus_points > 0 && (
          <div className="text-sm text-[#059669] font-medium mt-1">
            含赠送 {pkg.bonus_points} 积分
          </div>
        )}
      </div>

      {/* Price display */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2">
          {pkg.original_price > pkg.sale_price && (
            <span className="text-lg text-[#94A3B8] line-through">
              ¥{pkg.original_price.toFixed(2)}
            </span>
          )}
          <span className="text-3xl font-bold text-[#059669]">
            ¥{pkg.sale_price.toFixed(2)}
          </span>
        </div>
        {savingsPercentage > 0 && (
          <div className="text-sm text-[#EF4444] mt-1">
            省 {savingsPercentage}%
          </div>
        )}
      </div>

      {/* Features list (can be customized per package if needed) */}
      <ul className="space-y-2 mb-6">
        <li className="flex items-center gap-2 text-sm text-[#475569]">
          <svg className="w-5 h-5 text-[#059669] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>积分永久有效</span>
        </li>
        <li className="flex items-center gap-2 text-sm text-[#475569]">
          <svg className="w-5 h-5 text-[#059669] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>所有工具可用</span>
        </li>
      </ul>

      {/* Select button indicator */}
      <div className="flex justify-center">
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected
            ? 'border-[#059669] bg-[#059669]'
            : 'border-[#E4E7EB] bg-white'
        }`}>
          {isSelected && (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default RechargePackageCard;
