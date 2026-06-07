import { useState, useCallback } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { ToolParamField, ToolParamOption, ToolParamCondition } from '@/api';

const FIELD_TYPES: { value: ToolParamField['type']; label: string }[] = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'number', label: '数字' },
  { value: 'select', label: '下拉框' },
  { value: 'radio', label: '单选' },
  { value: 'checkbox', label: '多选' },
  { value: 'boolean', label: '开关' },
  { value: 'date', label: '日期' },
  { value: 'file', label: '文件上传' },
  { value: 'range', label: '滑块' },
  { value: 'radioCard', label: '卡片式单选' },
  { value: 'section', label: '分组标题' },
  { value: 'hidden', label: '隐藏字段' },
];

const CONDITION_OPERATORS = [
  { value: 'eq', label: '等于' },
  { value: 'neq', label: '不等于' },
  { value: 'in', label: '包含于' },
  { value: 'nin', label: '不包含于' },
];

const EFFECT_OPTIONS = [
  { value: 'show', label: '显示' },
  { value: 'hide', label: '隐藏' },
  { value: 'enable', label: '启用' },
  { value: 'disable', label: '禁用' },
];

interface DynamicSchemaEditorProps {
  value: ToolParamField[] | null | undefined;
  onChange: (value: ToolParamField[]) => void;
}

function createEmptyField(): ToolParamField {
  return {
    key: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    helpText: '',
    defaultValue: '',
    order: 0,
  };
}

function createOption(): ToolParamOption {
  return { label: '', value: '' };
}

const DynamicSchemaEditor = ({ value, onChange }: DynamicSchemaEditorProps) => {
  const fields: ToolParamField[] = Array.isArray(value) ? value : [];
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  const handleFieldChange = useCallback(
    (index: number, partial: Partial<ToolParamField>) => {
      const next = [...fields];
      next[index] = { ...next[index], ...partial };
      onChange(next);
    },
    [fields, onChange]
  );

  const addField = useCallback(() => {
    const newField = { ...createEmptyField(), order: fields.length + 1 };
    onChange([...fields, newField]);
  }, [fields, onChange]);

  const removeField = useCallback(
    (index: number) => {
      onChange(fields.filter((_, i) => i !== index));
    },
    [fields, onChange]
  );

  const moveField = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const next = [...fields];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];
      onChange(next.map((f, i) => ({ ...f, order: i + 1 })));
    },
    [fields, onChange]
  );

  const handleOptionChange = useCallback(
    (fieldIndex: number, optIndex: number, partial: Partial<ToolParamOption>) => {
      const next = [...fields];
      const field = next[fieldIndex];
      const options = [...(field.options || [])];
      options[optIndex] = { ...options[optIndex], ...partial };
      next[fieldIndex] = { ...field, options };
      onChange(next);
    },
    [fields, onChange]
  );

  const addOption = useCallback(
    (index: number) => {
      const next = [...fields];
      const field = next[index];
      next[index] = { ...field, options: [...(field.options || []), createOption()] };
      onChange(next);
    },
    [fields, onChange]
  );

  const removeOption = useCallback(
    (fieldIndex: number, optIndex: number) => {
      const next = [...fields];
      const field = next[fieldIndex];
      next[fieldIndex] = { ...field, options: field.options?.filter((_, i) => i !== optIndex) };
      onChange(next);
    },
    [fields, onChange]
  );

  const handleConditionChange = useCallback(
    (index: number, partial: Partial<ToolParamCondition['when']>) => {
      const next = [...fields];
      const field = next[index];
      next[index] = {
        ...field,
        condition: field.condition
          ? { ...field.condition, when: { ...field.condition.when, ...partial } }
          : { when: { field: '', operator: 'eq', value: '' }, effect: 'show' },
      };
      onChange(next);
    },
    [fields, onChange]
  );

  const handleEffectChange = useCallback(
    (index: number, effect: ToolParamCondition['effect']) => {
      const next = [...fields];
      const field = next[index];
      next[index] = {
        ...field,
        condition: field.condition
          ? { ...field.condition, effect }
          : { when: { field: '', operator: 'eq', value: '' }, effect },
      };
      onChange(next);
    },
    [fields, onChange]
  );

  const removeCondition = useCallback(
    (index: number) => {
      const next = [...fields];
      const field = next[index];
      next[index] = { ...field };
      delete next[index].condition;
      onChange(next);
    },
    [fields, onChange]
  );

  const hasOptions = (type: string) =>
    ['select', 'radio', 'checkbox', 'radioCard'].includes(type);

  const openJsonEditor = () => {
    setJsonText(JSON.stringify(fields, null, 2));
    setJsonError('');
    setShowJsonEditor(true);
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('必须是数组');
      // Basic validation
      for (const f of parsed) {
        if (!f.key || !f.type) throw new Error(`字段缺少 key 或 type: ${JSON.stringify(f)}`);
      }
      onChange(parsed);
      setShowJsonEditor(false);
      setJsonError('');
    } catch (err: any) {
      setJsonError(err.message || 'JSON 格式错误');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          已配置 {fields.length} 个字段
          {fields.some((f) => f.type === 'file') && '（含文件上传）'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openJsonEditor}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            JSON 编辑
          </button>
          <button
            type="button"
            onClick={addField}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#1E3A5F] text-white rounded-lg hover:bg-[#152D4A]"
          >
            <Plus size={14} /> 添加字段
          </button>
        </div>
      </div>

      {/* JSON Editor Modal */}
      {showJsonEditor && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <textarea
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setJsonError(''); }}
            rows={12}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
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

      {/* Field List */}
      {!showJsonEditor && (
        <div className="space-y-3">
          {fields.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
              尚未配置表单字段。点击"添加字段"开始构建动态表单。
            </p>
          )}

          {fields.map((field, idx) => (
            <div
              key={idx}
              className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white"
            >
              {/* Header row: type badge + key + actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <select
                    value={field.type}
                    onChange={(e) => handleFieldChange(idx, { type: e.target.value as ToolParamField['type'] })}
                    className="px-2 py-1 text-xs border border-gray-300 rounded bg-gray-50 font-medium"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {field.type !== 'section' && (
                    <input
                      value={field.key}
                      onChange={(e) => handleFieldChange(idx, { key: e.target.value })}
                      placeholder="字段标识 (key)"
                      className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none font-mono"
                    />
                  )}
                  {field.type === 'section' && (
                    <span className="text-xs text-gray-400 italic">分组标题（不提交）</span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveField(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                    title="上移"
                  >
                    <ChevronUp size={16} className="text-gray-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(idx, 'down')}
                    disabled={idx === fields.length - 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                    title="下移"
                  >
                    <ChevronDown size={16} className="text-gray-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeField(idx)}
                    className="p-1 hover:bg-red-50 rounded"
                    title="删除"
                  >
                    <Trash2 size={16} className="text-red-400 hover:text-red-600" />
                  </button>
                </div>
              </div>

              {/* Common fields (not section) */}
              {field.type !== 'section' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">显示标签</label>
                      <input
                        value={field.label}
                        onChange={(e) => handleFieldChange(idx, { label: e.target.value })}
                        placeholder="字段标签"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">占位符</label>
                      <input
                        value={field.placeholder || ''}
                        onChange={(e) => handleFieldChange(idx, { placeholder: e.target.value })}
                        placeholder="输入提示..."
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">帮助说明</label>
                    <input
                      value={field.helpText || ''}
                      onChange={(e) => handleFieldChange(idx, { helpText: e.target.value })}
                      placeholder="字段的帮助说明"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {!['boolean', 'hidden'].includes(field.type) && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">默认值</label>
                        <input
                          value={String(field.defaultValue ?? '')}
                          onChange={(e) => handleFieldChange(idx, { defaultValue: e.target.value })}
                          placeholder="默认值"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">排序</label>
                      <input
                        type="number"
                        min={1}
                        value={field.order ?? idx + 1}
                        onChange={(e) => handleFieldChange(idx, { order: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                      />
                    </div>
                    {field.type === 'hidden' && (
                      <div className="col-span-2 flex items-center pt-5">
                        <span className="text-xs text-amber-600">
                          隐藏字段不显示，提交时使用默认值
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 pt-1">
                    {field.type !== 'hidden' && (
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!field.required}
                          onChange={(e) => handleFieldChange(idx, { required: e.target.checked })}
                          className="w-3.5 h-3.5 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F]"
                        />
                        <span className="text-xs text-gray-600">必填</span>
                      </label>
                    )}
                    {(field.type === 'select' || field.type === 'radio' || field.type === 'radioCard') && (
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!field.allowCustom}
                          onChange={(e) => handleFieldChange(idx, { allowCustom: e.target.checked })}
                          className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-xs text-gray-600">允许自定义输入</span>
                      </label>
                    )}
                    {field.type === 'boolean' && (
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.defaultValue === true}
                          onChange={(e) => handleFieldChange(idx, { defaultValue: e.target.checked })}
                          className="w-3.5 h-3.5 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F]"
                        />
                        <span className="text-xs text-gray-600">默认开启</span>
                      </label>
                    )}
                    {field.type === 'file' && (
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!field.multiple}
                          onChange={(e) => handleFieldChange(idx, { multiple: e.target.checked })}
                          className="w-3.5 h-3.5 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F]"
                        />
                        <span className="text-xs text-gray-600">支持多文件</span>
                      </label>
                    )}
                  </div>

                  {/* Number / Range specific */}
                  {(field.type === 'number' || field.type === 'range') && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">最小值</label>
                        <input
                          type="number"
                          value={field.min ?? ''}
                          onChange={(e) => handleFieldChange(idx, { min: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">最大值</label>
                        <input
                          type="number"
                          value={field.max ?? ''}
                          onChange={(e) => handleFieldChange(idx, { max: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                        />
                      </div>
                      {field.type === 'range' && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">步长</label>
                          <input
                            type="number"
                            step="any"
                            value={field.step ?? ''}
                            onChange={(e) => handleFieldChange(idx, { step: Number(e.target.value) })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* File specific */}
                  {field.type === 'file' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          accept（文件类型，如 image/*）
                        </label>
                        <input
                          value={field.accept || ''}
                          onChange={(e) => handleFieldChange(idx, { accept: e.target.value })}
                          placeholder="image/*,.pdf"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">最大单文件 (MB)</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={field.maxSizeMB ?? 10}
                          onChange={(e) => handleFieldChange(idx, { maxSizeMB: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                        />
                      </div>
                      {field.multiple && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">最大文件数</label>
                          <input
                            type="number"
                            min={1}
                            value={field.maxFiles ?? 5}
                            onChange={(e) => handleFieldChange(idx, { maxFiles: Number(e.target.value) })}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Options for select/radio/checkbox/radioCard */}
                  {hasOptions(field.type) && (
                    <div className="border-t border-gray-100 pt-3 mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">选项列表</span>
                        <button
                          type="button"
                          onClick={() => addOption(idx)}
                          className="flex items-center gap-1 text-xs text-[#1E3A5F] hover:text-[#152D4A]"
                        >
                          <Plus size={12} /> 添加选项
                        </button>
                      </div>
                      {(!field.options || field.options.length === 0) && (
                        <p className="text-xs text-gray-400">暂无选项</p>
                      )}
                      <div className="space-y-2">
                        {(field.options || []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input
                              value={opt.label}
                              onChange={(e) => handleOptionChange(idx, oi, { label: e.target.value })}
                              placeholder="显示文本"
                              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                            />
                            <input
                              value={opt.value}
                              onChange={(e) => handleOptionChange(idx, oi, { value: e.target.value })}
                              placeholder="提交值"
                              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none font-mono"
                            />
                            {field.type === 'radioCard' && (
                              <input
                                value={opt.icon || ''}
                                onChange={(e) => handleOptionChange(idx, oi, { icon: e.target.value })}
                                placeholder="图标 emoji"
                                className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                              />
                            )}
                            {field.type === 'radioCard' && (
                              <input
                                value={opt.desc || ''}
                                onChange={(e) => handleOptionChange(idx, oi, { desc: e.target.value })}
                                placeholder="描述"
                                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => removeOption(idx, oi)}
                              className="p-1 hover:bg-red-50 rounded flex-shrink-0"
                            >
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Section type just needs label */}
              {field.type === 'section' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">分组标题</label>
                  <input
                    value={field.label}
                    onChange={(e) => handleFieldChange(idx, { label: e.target.value })}
                    placeholder="例如：基础信息"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none font-medium"
                  />
                </div>
              )}

              {/* Condition (for non-hidden, non-section) */}
              {field.type !== 'hidden' && field.type !== 'section' && (
                <div className="border-t border-gray-100 pt-3 mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">条件显示/禁用</span>
                    {field.condition && (
                      <button
                        type="button"
                        onClick={() => removeCondition(idx)}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        移除条件
                      </button>
                    )}
                  </div>
                  {!field.condition ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleFieldChange(idx, {
                          condition: { when: { field: '', operator: 'eq', value: '' }, effect: 'show' },
                        })
                      }
                      className="text-xs text-[#1E3A5F] hover:text-[#152D4A]"
                    >
                      + 添加条件
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">当</span>
                      <input
                        value={field.condition.when.field}
                        onChange={(e) =>
                          handleConditionChange(idx, { field: e.target.value })
                        }
                        placeholder="字段 key"
                        className="w-32 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none font-mono"
                      />
                      <select
                        value={field.condition.when.operator}
                        onChange={(e) =>
                          handleConditionChange(idx, { operator: e.target.value as 'eq' | 'neq' | 'in' | 'nin' })
                        }
                        className="px-2 py-1 text-xs border border-gray-300 rounded-lg"
                      >
                        {CONDITION_OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={String(field.condition.when.value ?? '')}
                        onChange={(e) => handleConditionChange(idx, { value: e.target.value })}
                        placeholder="值"
                        className="w-24 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                      />
                      <span className="text-xs text-gray-500">时</span>
                      <select
                        value={field.condition.effect}
                        onChange={(e) =>
                          handleEffectChange(idx, e.target.value as ToolParamCondition['effect'])
                        }
                        className="px-2 py-1 text-xs border border-gray-300 rounded-lg"
                      >
                        {EFFECT_OPTIONS.map((e) => (
                          <option key={e.value} value={e.value}>
                            {e.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DynamicSchemaEditor;