import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type {
  PricingSchema,
  PricingItem,
  PricingItemFixed,
  PricingItemPerUnit,
  PricingAmountRef,
  PricingWhenCondition,
  ToolParamField,
} from '@/api';

const AMOUNT_REFS: { value: PricingAmountRef; label: string }[] = [
  { value: 'base_fee', label: '基础费 (base_fee)' },
  { value: 'image_fee', label: '图片费/张 (image_fee)' },
  { value: 'audio_fee', label: '音频费/段 (audio_fee)' },
  { value: 'token_fee', label: 'Token费/千 (token_fee)' },
];

const WHEN_OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'ne', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'in', label: '∈' },
  { value: 'not_in', label: '∉' },
  { value: 'truthy', label: '为真' },
  { value: 'falsy', label: '为假' },
];

interface PricingSchemaEditorProps {
  value: PricingSchema | null | undefined;
  onChange: (value: PricingSchema | null) => void;
  paramSchema: ToolParamField[] | null | undefined;
}

const DEFAULT_SCHEMA: PricingSchema = {
  version: 1,
  currency: 'credits',
  rounding: 'ceil',
  min_total: 0,
  items: [],
  display: {
    show_breakdown: true,
    total_label: '预计消耗',
    unit_label: '积分',
  },
};

function createFixedItem(): PricingItemFixed {
  return {
    key: `item_${Date.now()}`,
    type: 'fixed',
    label: '基础服务费',
    amount_ref: 'base_fee',
  };
}

function createPerUnitItem(): PricingItemPerUnit {
  return {
    key: `item_${Date.now()}`,
    type: 'per_unit',
    label: '按量计费',
    field: '',
    unit_amount_ref: 'image_fee',
    default_quantity: 1,
  };
}

const PricingSchemaEditor = ({ value, onChange, paramSchema }: PricingSchemaEditorProps) => {
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Available numeric field keys from param_schema for per_unit.field selection
  const availableFields = (paramSchema || []).filter(
    (f) => ['number', 'range', 'hidden'].includes(f.type) && f.key
  );
  const allFields = (paramSchema || []).filter((f) => f.type !== 'section' && f.key);

  const enabled = !!value;
  const schema: PricingSchema = value || DEFAULT_SCHEMA;
  const items: PricingItem[] = Array.isArray(schema.items) ? schema.items : [];

  const updateSchema = useCallback(
    (partial: Partial<PricingSchema>) => {
      onChange({ ...schema, ...partial });
    },
    [schema, onChange]
  );

  const updateItem = useCallback(
    (idx: number, partial: Partial<PricingItem>) => {
      const next = [...items];
      next[idx] = { ...next[idx], ...partial } as PricingItem;
      updateSchema({ items: next });
    },
    [items, updateSchema]
  );

  const removeItem = useCallback(
    (idx: number) => {
      updateSchema({ items: items.filter((_, i) => i !== idx) });
    },
    [items, updateSchema]
  );

  const addItem = useCallback(
    (type: 'fixed' | 'per_unit') => {
      const newItem = type === 'fixed' ? createFixedItem() : createPerUnitItem();
      updateSchema({ items: [...items, newItem] });
    },
    [items, updateSchema]
  );

  const updateWhen = useCallback(
    (idx: number, partial: Partial<PricingWhenCondition>) => {
      const item = items[idx];
      const when = item.when || { field: '', operator: 'eq', value: '' };
      updateItem(idx, { when: { ...when, ...partial } as PricingWhenCondition });
    },
    [items, updateItem]
  );

  const removeWhen = useCallback(
    (idx: number) => {
      const item = { ...items[idx] };
      delete item.when;
      const next = [...items];
      next[idx] = item;
      updateSchema({ items: next });
    },
    [items, updateSchema]
  );

  const handleEnable = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onChange(DEFAULT_SCHEMA);
    } else {
      onChange(null);
    }
  };

  const openJsonEditor = () => {
    setJsonText(JSON.stringify(schema, null, 2));
    setJsonError('');
    setShowJsonEditor(true);
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.version !== 1) throw new Error('version 必须为 1');
      if (parsed.currency !== 'credits') throw new Error('currency 必须为 credits');
      if (!Array.isArray(parsed.items)) throw new Error('items 必须是数组');
      onChange(parsed);
      setShowJsonEditor(false);
      setJsonError('');
    } catch (err: any) {
      setJsonError(err.message || 'JSON 格式错误');
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleEnable}
          className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F]"
        />
        <span className="text-sm font-medium text-gray-700">
          启用 pricing_schema（不勾选则回退使用执行器的 estimate_cost 逻辑）
        </span>
      </label>

      {!enabled && (
        <p className="text-xs text-gray-500 ml-6">
          未启用时，价格预估和扣费走旧逻辑（base_fee + 图片张数等硬编码计算）。
          新工具建议启用 pricing_schema 让计价规则可配置且前后端一致。
        </p>
      )}

      {enabled && (
        <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-white">
          {/* Header controls */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="grid grid-cols-3 gap-3 flex-1">
              <div>
                <label className="block text-xs text-gray-500 mb-1">舍入方式</label>
                <select
                  value={schema.rounding || 'ceil'}
                  onChange={(e) =>
                    updateSchema({ rounding: e.target.value as 'ceil' | 'floor' | 'round' })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="ceil">向上取整</option>
                  <option value="floor">向下取整</option>
                  <option value="round">四舍五入</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">最低总价</label>
                <input
                  type="number"
                  min={0}
                  value={schema.min_total ?? 0}
                  onChange={(e) =>
                    updateSchema({ min_total: e.target.value ? Number(e.target.value) : null })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">最高总价</label>
                <input
                  type="number"
                  min={0}
                  value={schema.max_total ?? ''}
                  placeholder="不限制"
                  onChange={(e) =>
                    updateSchema({ max_total: e.target.value ? Number(e.target.value) : null })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={openJsonEditor}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0"
            >
              JSON 编辑
            </button>
          </div>

          {/* JSON Editor */}
          {showJsonEditor && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
              <textarea
                value={jsonText}
                onChange={(e) => { setJsonText(e.target.value); setJsonError(''); }}
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none bg-white"
              />
              {jsonError && <p className="text-xs text-red-500">{jsonError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJsonEditor(false)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={applyJson}
                  className="px-3 py-1.5 text-xs bg-[#059669] text-white rounded-lg hover:bg-[#047857]"
                >
                  应用
                </button>
              </div>
            </div>
          )}

          {/* Items list */}
          {!showJsonEditor && (
            <>
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-sm font-medium text-gray-700">计价项 ({items.length})</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addItem('fixed')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    <Plus size={14} /> 固定费用
                  </button>
                  <button
                    type="button"
                    onClick={() => addItem('per_unit')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
                  >
                    <Plus size={14} /> 按量计费
                  </button>
                </div>
              </div>

              {items.length === 0 && (
                <p className="text-sm text-gray-400 py-6 text-center border-2 border-dashed border-gray-200 rounded-lg">
                  尚无计价项，请添加固定费用或按量计费
                </p>
              )}

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs rounded font-medium ${
                            item.type === 'fixed'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {item.type === 'fixed' ? '固定' : '按量'}
                        </span>
                        <input
                          value={item.key}
                          onChange={(e) => updateItem(idx, { key: e.target.value })}
                          placeholder="key"
                          className="px-2 py-1 text-xs border border-gray-300 rounded font-mono w-32"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} className="text-red-400 hover:text-red-600" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">展示名称</label>
                        <input
                          value={item.label}
                          onChange={(e) => updateItem(idx, { label: e.target.value })}
                          placeholder="例如：插画生成费"
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                        />
                      </div>

                      {item.type === 'fixed' && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">价格变量</label>
                          <select
                            value={(item as PricingItemFixed).amount_ref}
                            onChange={(e) =>
                              updateItem(idx, {
                                amount_ref: e.target.value as PricingAmountRef,
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                          >
                            {AMOUNT_REFS.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {item.type === 'per_unit' && (
                        <>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">单价变量</label>
                            <select
                              value={(item as PricingItemPerUnit).unit_amount_ref}
                              onChange={(e) =>
                                updateItem(idx, {
                                  unit_amount_ref: e.target.value as PricingAmountRef,
                                })
                              }
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                            >
                              {AMOUNT_REFS.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">数量字段 key</label>
                            {availableFields.length > 0 ? (
                              <select
                                value={(item as PricingItemPerUnit).field}
                                onChange={(e) => updateItem(idx, { field: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-mono"
                              >
                                <option value="">请选择</option>
                                {availableFields.map((f) => (
                                  <option key={f.key} value={f.key}>
                                    {f.key}（{f.label}）
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                value={(item as PricingItemPerUnit).field}
                                onChange={(e) => updateItem(idx, { field: e.target.value })}
                                placeholder="字段 key"
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-mono"
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">默认数量</label>
                            <input
                              type="number"
                              min={0}
                              value={(item as PricingItemPerUnit).default_quantity ?? 1}
                              onChange={(e) =>
                                updateItem(idx, { default_quantity: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2 col-span-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">最小数</label>
                              <input
                                type="number"
                                value={(item as PricingItemPerUnit).min_quantity ?? ''}
                                onChange={(e) =>
                                  updateItem(idx, {
                                    min_quantity: e.target.value ? Number(e.target.value) : undefined,
                                  })
                                }
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">最大数</label>
                              <input
                                type="number"
                                value={(item as PricingItemPerUnit).max_quantity ?? ''}
                                onChange={(e) =>
                                  updateItem(idx, {
                                    max_quantity: e.target.value ? Number(e.target.value) : undefined,
                                  })
                                }
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">unit_size</label>
                              <input
                                type="number"
                                value={(item as PricingItemPerUnit).unit_size ?? ''}
                                placeholder="如 1000"
                                onChange={(e) =>
                                  updateItem(idx, {
                                    unit_size: e.target.value ? Number(e.target.value) : undefined,
                                  })
                                }
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* When condition */}
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">条件启用</span>
                        {item.when ? (
                          <button
                            type="button"
                            onClick={() => removeWhen(idx)}
                            className="text-xs text-red-500"
                          >
                            移除
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              updateWhen(idx, { field: '', operator: 'eq', value: '' })
                            }
                            className="text-xs text-[#1E3A5F]"
                          >
                            + 添加 when 条件
                          </button>
                        )}
                      </div>
                      {item.when && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {allFields.length > 0 ? (
                            <select
                              value={item.when.field}
                              onChange={(e) => updateWhen(idx, { field: e.target.value })}
                              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white font-mono"
                            >
                              <option value="">请选择字段</option>
                              {allFields.map((f) => (
                                <option key={f.key} value={f.key}>
                                  {f.key}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={item.when.field}
                              onChange={(e) => updateWhen(idx, { field: e.target.value })}
                              placeholder="字段 key"
                              className="w-32 px-2 py-1 text-xs border border-gray-300 rounded bg-white font-mono"
                            />
                          )}
                          <select
                            value={item.when.operator}
                            onChange={(e) =>
                              updateWhen(idx, { operator: e.target.value as PricingWhenCondition['operator'] })
                            }
                            className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                          >
                            {WHEN_OPERATORS.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                          {!['truthy', 'falsy'].includes(item.when.operator) && (
                            <input
                              value={String(item.when.value ?? '')}
                              onChange={(e) => updateWhen(idx, { value: e.target.value })}
                              placeholder="值"
                              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-3">
            说明：金额由上方"价格配置"中的 base_fee/image_fee/audio_fee/token_fee 提供；
            pricing_schema 只配置"怎么算"，不直接填金额。
          </p>
        </div>
      )}
    </div>
  );
};

export default PricingSchemaEditor;