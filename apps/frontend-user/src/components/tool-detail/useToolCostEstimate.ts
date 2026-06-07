/**
 * useToolCostEstimate - 用户端计价 hook
 *
 * 与后端 PricingService 等价的客户端计算逻辑。
 * 当 tool.pricing_schema 为空时，回退按 base_fee + 数量字段 * 单价 的基础估算。
 *
 * 关键约定：
 * - per_unit 字段值为 null 时使用 default_quantity 并产出 warning
 * - amount_ref / unit_amount_ref 必须在白名单内
 * - rounding 默认 ceil
 */

import { useMemo } from 'react';
import type {
  PricingSchema,
  PricingSchemaItem,
  PricingBreakdownItem,
  PricingWhenCondition,
} from '@/lib/api/types';

/** useToolCostEstimate 仅需 tool 的价格 + 计价 schema 字段，不绑定具体 Tool 类型，
 * 兼容旧 `@/types` 和新 `@/lib/api/types` 两套 Tool 形状。 */
export interface PricingToolShape {
  base_fee?: number;
  image_fee?: number;
  audio_fee?: number;
  token_fee?: number;
  pricing_schema?: PricingSchema | null;
}

const WHITELIST_REFS = new Set(['base_fee', 'image_fee', 'audio_fee', 'token_fee']);

export interface UseToolCostEstimateResult {
  total: number;
  breakdown: PricingBreakdownItem[];
  warnings: string[];
  currency: string;
  hasSchema: boolean;
}

function resolveRef(tool: PricingToolShape, ref?: string): number {
  if (!ref || !WHITELIST_REFS.has(ref)) return 0;
  const v = (tool as any)[ref];
  return typeof v === 'number' ? v : 0;
}

function applyRounding(value: number, mode: PricingSchema['rounding'] = 'ceil'): number {
  if (mode === 'floor') return Math.floor(value);
  if (mode === 'round') return Math.round(value);
  return Math.ceil(value);
}

function evaluateWhen(when: PricingWhenCondition | undefined, params: Record<string, any>): boolean {
  if (!when) return true;
  const fieldValue = params[when.field];
  switch (when.operator) {
    case 'eq':
      return fieldValue === when.value;
    case 'ne':
      return fieldValue !== when.value;
    case 'gt':
      return typeof fieldValue === 'number' && fieldValue > when.value;
    case 'gte':
      return typeof fieldValue === 'number' && fieldValue >= when.value;
    case 'lt':
      return typeof fieldValue === 'number' && fieldValue < when.value;
    case 'lte':
      return typeof fieldValue === 'number' && fieldValue <= when.value;
    case 'in':
      return Array.isArray(when.value) && when.value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(when.value) && !when.value.includes(fieldValue);
    case 'truthy':
      return Boolean(fieldValue);
    case 'falsy':
      return !fieldValue;
    default:
      return true;
  }
}

function computeItem(
  tool: PricingToolShape,
  item: PricingSchemaItem,
  params: Record<string, any>,
  warnings: string[],
): PricingBreakdownItem {
  // 条件不满足，amount=0
  if (!evaluateWhen(item.when, params)) {
    return {
      key: item.key,
      label: item.label || item.key,
      amount: 0,
      quantity: 0,
      unit_amount: 0,
      ...(item.amount_ref ? { amount_ref: item.amount_ref } : {}),
      ...(item.unit_amount_ref ? { unit_amount_ref: item.unit_amount_ref } : {}),
    };
  }

  if (item.type === 'fixed') {
    const amount = resolveRef(tool, item.amount_ref);
    return {
      key: item.key,
      label: item.label || item.key,
      amount,
      quantity: 1,
      unit_amount: amount,
      ...(item.amount_ref ? { amount_ref: item.amount_ref } : {}),
    };
  }

  // per_unit
  const unitAmount = resolveRef(tool, item.unit_amount_ref);
  let quantity: number;
  const rawValue = item.field ? params[item.field] : null;

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    quantity = item.default_quantity ?? 0;
    if (rawValue === null || rawValue === undefined) {
      warnings.push(`${item.label || item.key}: 数量为空，按默认 ${quantity} 预估`);
    }
  } else {
    quantity = Number(rawValue);
    if (isNaN(quantity)) quantity = item.default_quantity ?? 0;
  }

  if (item.min_quantity !== undefined) quantity = Math.max(quantity, item.min_quantity);
  if (item.max_quantity !== undefined) quantity = Math.min(quantity, item.max_quantity);

  let amount: number;
  if (item.unit_size && item.unit_size > 0) {
    // token 模式：ceil(quantity / unit_size) * unitAmount
    amount = Math.ceil(quantity / item.unit_size) * unitAmount;
  } else {
    amount = quantity * unitAmount;
  }

  return {
    key: item.key,
    label: item.label || item.key,
    amount,
    quantity,
    unit_amount: unitAmount,
    ...(item.unit_amount_ref ? { unit_amount_ref: item.unit_amount_ref } : {}),
  };
}

function fallbackEstimate(tool: PricingToolShape, params: Record<string, any>): UseToolCostEstimateResult {
  const base = tool.base_fee || 0;
  const breakdown: PricingBreakdownItem[] = [
    { key: 'base', label: '基础服务费', amount: base, quantity: 1, unit_amount: base, amount_ref: 'base_fee' },
  ];
  // 简单兜底：如果有 page_count/main_image_count/detail_image_count 字段，按 image_fee 估算
  const imageFee = tool.image_fee || 0;
  const audioFee = tool.audio_fee || 0;
  let total = base;
  for (const key of ['page_count', 'mainImageCount', 'detailImageCount', 'main_image_count', 'detail_image_count']) {
    const v = params[key];
    if (typeof v === 'number' && v > 0 && imageFee > 0) {
      const amount = v * imageFee;
      breakdown.push({ key, label: `${key} × image_fee`, amount, quantity: v, unit_amount: imageFee, unit_amount_ref: 'image_fee' });
      total += amount;
    }
  }
  const voiceType = params['voiceType'];
  const pageCount = params['page_count'];
  if (voiceType && voiceType !== 'none' && typeof pageCount === 'number' && audioFee > 0) {
    const amount = pageCount * audioFee;
    breakdown.push({ key: 'audio', label: '语音合成费', amount, quantity: pageCount, unit_amount: audioFee, unit_amount_ref: 'audio_fee' });
    total += amount;
  }
  return { total, breakdown, warnings: [], currency: 'credits', hasSchema: false };
}

export function useToolCostEstimate(
  tool: PricingToolShape | null | undefined,
  inputParams: Record<string, any>,
): UseToolCostEstimateResult {
  return useMemo(() => {
    if (!tool) {
      return { total: 0, breakdown: [], warnings: [], currency: 'credits', hasSchema: false };
    }

    const schema = tool.pricing_schema;
    if (!schema || schema.version !== 1 || !Array.isArray(schema.items) || schema.items.length === 0) {
      return fallbackEstimate(tool, inputParams);
    }

    const warnings: string[] = [];
    const breakdown: PricingBreakdownItem[] = [];
    let total = 0;

    for (const item of schema.items) {
      try {
        const computed = computeItem(tool, item, inputParams, warnings);
        breakdown.push(computed);
        total += computed.amount;
      } catch (e: any) {
        warnings.push(`${item.key}: ${e?.message || '计算失败'}`);
      }
    }

    total = applyRounding(total, schema.rounding);
    if (schema.min_total !== undefined && schema.min_total !== null) {
      total = Math.max(total, schema.min_total);
    }
    if (schema.max_total !== undefined && schema.max_total !== null) {
      total = Math.min(total, schema.max_total);
    }

    return {
      total,
      breakdown,
      warnings,
      currency: schema.currency || 'credits',
      hasSchema: true,
    };
  }, [tool, inputParams]);
}

export default useToolCostEstimate;
