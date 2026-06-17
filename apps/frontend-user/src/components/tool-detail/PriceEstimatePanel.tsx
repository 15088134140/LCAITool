/**
 * PriceEstimatePanel - 共享价格预估展示组件
 *
 * 用于通用工具页面、独立定制页面、DialogMode 复用。
 * 展示总积分 + breakdown + warnings；不负责扣费。
 */

'use client';

import { useState } from 'react';
import type { UseToolCostEstimateResult } from './useToolCostEstimate';

interface PriceEstimatePanelProps {
  estimate: UseToolCostEstimateResult;
  totalLabel?: string;
  unitLabel?: string;
  showBreakdown?: boolean;
  className?: string;
  /** 余额（积分），传入时显示余额不足提示 */
  balance?: number;
}

export function PriceEstimatePanel({
  estimate,
  totalLabel = '预计消耗',
  unitLabel = '积分',
  showBreakdown = true,
  className = '',
  balance,
}: PriceEstimatePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const insufficient = typeof balance === 'number' && balance < estimate.total;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{totalLabel}</span>
        <span className="text-2xl font-bold text-[#1E3A5F]">
          {estimate.total} <span className="text-sm font-normal text-gray-500">{unitLabel}</span>
        </span>
      </div>

      {showBreakdown && estimate.breakdown.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▼' : '▶'} 查看明细 ({estimate.breakdown.length} 项)
          </button>
          {expanded && (
            <div className="mt-2 space-y-1 border-t pt-2">
              {estimate.breakdown.map((item) => (
                <div key={item.key} className="flex justify-between text-xs text-gray-600">
                  <span>
                    {item.label}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                  </span>
                  <span>{item.amount} {unitLabel}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {estimate.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {estimate.warnings.map((w, idx) => (
            <p key={idx} className="text-xs text-amber-600">⚠ {w}</p>
          ))}
        </div>
      )}

      {insufficient && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          余额不足（当前 {balance} {unitLabel}），请充值
        </div>
      )}
    </div>
  );
}

export default PriceEstimatePanel;
