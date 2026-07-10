/**
 * DynamicToolForm - 共享动态表单组件
 *
 * 通用工具页面和独立定制工具页面都使用此组件渲染表单主体。
 *
 * 职责：
 *  - 字段渲染（11 类字段：text/textarea/number/select/radio/radioCard/checkbox/boolean/date/file/range/section/hidden）
 *  - 默认值初始化
 *  - 条件显示/禁用（condition）
 *  - allowCustom 自定义选项（select/radio/radioCard）
 *  - 校验（required/min/max/maxSizeMB/maxFiles）
 *  - 文件上传（提交前完成）
 *  - 组装 normalized input_params 并调用 onSubmit
 *
 * 不负责：
 *  - 调用 taskApi.createTask（交给 useToolGeneration）
 *  - ProgressModal 维护
 *  - 工具页面外壳
 */

'use client';

import { useState, useEffect, useMemo, useCallback, type FormEvent } from 'react';
import { uploadApi } from '@/lib/api/modules/upload';
import type {
  ToolParamField,
  ToolParamCondition,
  UploadedFileMeta,
} from '@/lib/api/types';

const CUSTOM_VALUE = '__custom__';

interface DynamicToolFormProps {
  paramSchema: ToolParamField[];
  toolId?: string;
  onSubmit: (inputParams: Record<string, any>) => void | Promise<void>;
  /** 提交按钮文案 */
  submitLabel?: string;
  /** 外部传入的额外按钮（如价格展示、余额面板） */
  rightSlot?: React.ReactNode;
  /** 整体禁用（提交中或外部状态） */
  disabled?: boolean;
  /** 值变化回调（用于价格预估实时更新） */
  onValuesChange?: (values: Record<string, any>) => void;
  className?: string;
}

interface CustomState {
  [key: string]: { isCustom: boolean; customValue: string };
}

export function DynamicToolForm({
  paramSchema,
  toolId,
  onSubmit,
  submitLabel = '开始生成',
  rightSlot,
  disabled = false,
  onValuesChange,
  className = '',
}: DynamicToolFormProps) {
  const sortedFields = useMemo(() => {
    return [...paramSchema].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [paramSchema]);

  // 初始化默认值
  const buildInitialValues = useCallback((): Record<string, any> => {
    const initial: Record<string, any> = {};
    for (const f of paramSchema) {
      if (f.type === 'section') continue;
      if (f.defaultValue !== undefined) {
        initial[f.key] = f.defaultValue;
      } else if (f.type === 'checkbox') {
        initial[f.key] = [];
      } else if (f.type === 'boolean') {
        initial[f.key] = false;
      } else if (f.type === 'file') {
        initial[f.key] = f.multiple ? [] : null;
      } else {
        initial[f.key] = '';
      }
    }
    return initial;
  }, [paramSchema]);

  const [values, setValues] = useState<Record<string, any>>(buildInitialValues);
  const [customState, setCustomState] = useState<CustomState>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // 文件字段的本地 File 对象（提交前才上传）
  const [pendingFiles, setPendingFiles] = useState<Record<string, File[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string>('');

  // 当 paramSchema 变化时重置（例如切换工具）
  useEffect(() => {
    setValues(buildInitialValues());
    setCustomState({});
    setErrors({});
    setPendingFiles({});
  }, [buildInitialValues]);

  // 值变化对外通知
  useEffect(() => {
    onValuesChange?.(values);
  }, [values, onValuesChange]);

  // 条件评估
  const evalCondition = useCallback((cond: ToolParamCondition | undefined): { show: boolean; enabled: boolean } => {
    if (!cond) return { show: true, enabled: true };
    const fv = values[cond.when.field];
    let matched = false;
    switch (cond.when.operator) {
      case 'eq': matched = fv === cond.when.value; break;
      case 'neq': matched = fv !== cond.when.value; break;
      case 'in': matched = Array.isArray(cond.when.value) && cond.when.value.includes(fv); break;
      case 'nin': matched = Array.isArray(cond.when.value) && !cond.when.value.includes(fv); break;
    }
    switch (cond.effect) {
      case 'show': return { show: matched, enabled: true };
      case 'hide': return { show: !matched, enabled: true };
      case 'enable': return { show: true, enabled: matched };
      case 'disable': return { show: true, enabled: !matched };
    }
  }, [values]);

  const setValue = (key: string, val: any) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => {
        const { [key]: _ignored, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleFileChange = (field: ToolParamField, files: FileList | null) => {
    if (!files || files.length === 0) {
      setPendingFiles((prev) => ({ ...prev, [field.key]: [] }));
      return;
    }
    const arr = Array.from(files);
    // 前端粗校验
    if (field.maxSizeMB) {
      const maxBytes = field.maxSizeMB * 1024 * 1024;
      const tooBig = arr.find((f) => f.size > maxBytes);
      if (tooBig) {
        setErrors((prev) => ({ ...prev, [field.key]: `文件 ${tooBig.name} 超过 ${field.maxSizeMB}MB 限制` }));
        return;
      }
    }
    if (field.maxFiles && arr.length > field.maxFiles) {
      setErrors((prev) => ({ ...prev, [field.key]: `最多上传 ${field.maxFiles} 个文件` }));
      return;
    }
    setPendingFiles((prev) => ({ ...prev, [field.key]: arr }));
    if (errors[field.key]) {
      setErrors((prev) => {
        const { [field.key]: _ignored, ...rest } = prev;
        return rest;
      });
    }
  };

  // 表单校验
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of paramSchema) {
      if (field.type === 'section') continue;
      const { show, enabled } = evalCondition(field.condition);
      if (!show || !enabled) continue;

      // required
      if (field.required) {
        if (field.type === 'file') {
          const files = pendingFiles[field.key] || [];
          if (files.length === 0) {
            newErrors[field.key] = `${field.label}为必填`;
            continue;
          }
        } else {
          const v = values[field.key];
          if (v === '' || v === null || v === undefined || (Array.isArray(v) && v.length === 0)) {
            newErrors[field.key] = `${field.label}为必填`;
            continue;
          }
        }
      }

      // allowCustom 校验：选中自定义时必须输入值
      if (field.allowCustom && values[field.key] === CUSTOM_VALUE) {
        const cv = customState[field.key]?.customValue?.trim();
        if (!cv) {
          newErrors[field.key] = `请输入自定义${field.label}`;
          continue;
        }
      }

      // number / range min/max
      if ((field.type === 'number' || field.type === 'range') && values[field.key] !== '' && values[field.key] !== null) {
        const n = Number(values[field.key]);
        if (isNaN(n)) {
          newErrors[field.key] = `${field.label}必须为数字`;
          continue;
        }
        if (field.min !== undefined && n < field.min) {
          newErrors[field.key] = `${field.label}不能小于 ${field.min}`;
          continue;
        }
        if (field.max !== undefined && n > field.max) {
          newErrors[field.key] = `${field.label}不能大于 ${field.max}`;
          continue;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 构造 normalized input_params
  const buildSubmitParams = async (): Promise<Record<string, any>> => {
    const params: Record<string, any> = {};

    for (const field of paramSchema) {
      if (field.type === 'section') continue;
      const { show, enabled } = evalCondition(field.condition);

      // hidden 字段始终提交 defaultValue（如果有）
      if (field.type === 'hidden') {
        if (field.defaultValue !== undefined) {
          params[field.key] = field.defaultValue;
        }
        continue;
      }

      // 隐藏字段不提交（除非 enabled=false 但 show=true 的 disable 情况，按隐藏处理也不提交）
      if (!show) continue;

      // disabled 字段不提交
      if (!enabled) continue;

      // allowCustom: 用户选中自定义时把自定义值赋给 key
      if (field.allowCustom && values[field.key] === CUSTOM_VALUE) {
        params[field.key] = customState[field.key]?.customValue ?? '';
        continue;
      }

      // 文件上传
      if (field.type === 'file') {
        const files = pendingFiles[field.key] || [];
        if (files.length === 0) {
          // 未上传，跳过（如果 required，已在 validate 阻止）
          continue;
        }
        setSubmitMsg(`正在上传 ${field.label}...`);
        const uploaded: UploadedFileMeta[] = [];
        for (const f of files) {
          const meta = await uploadApi.uploadFile(f, {
            ...(toolId ? { toolId } : {}),
            fieldKey: field.key,
          });
          uploaded.push({
            id: meta.id,
            file_name: meta.file_name,
            ...(typeof meta.file_size === 'number' ? { file_size: meta.file_size } : {}),
            ...(meta.mime_type ? { mime_type: meta.mime_type } : {}),
            url: meta.url,
          });
        }
        const wrappedFiles = uploaded.map((u) => ({
          file_id: u.id,
          file_name: u.file_name,
          file_size: u.file_size,
          mime_type: u.mime_type,
          url: u.url,
        }));
        params[field.key] = field.multiple ? wrappedFiles : wrappedFiles[0];
        continue;
      }

      // number / range: 转 number
      if (field.type === 'number' || field.type === 'range') {
        const raw = values[field.key];
        if (raw === '' || raw === null || raw === undefined) {
          if (field.defaultValue !== undefined) params[field.key] = Number(field.defaultValue);
          continue;
        }
        params[field.key] = Number(raw);
        continue;
      }

      params[field.key] = values[field.key];
    }

    return params;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || disabled) return;
    if (!validate()) return;

    setSubmitting(true);
    setSubmitMsg('');
    try {
      const params = await buildSubmitParams();
      setSubmitMsg('正在创建任务...');
      await onSubmit(params);
    } catch (err: any) {
      setSubmitMsg('');
      setErrors((prev) => ({ ...prev, __form__: err?.message || '提交失败' }));
    } finally {
      setSubmitting(false);
      setSubmitMsg('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {sortedFields.map((field) => {
        const { show, enabled } = evalCondition(field.condition);
        if (!show && field.type !== 'hidden') return null;

        if (field.type === 'section') {
          return (
            <div key={field.key} className="border-b border-gray-200 pb-2 mt-6">
              <h3 className="text-lg font-semibold text-[#1E3A5F]">{field.label}</h3>
            </div>
          );
        }

        if (field.type === 'hidden') return null;

        const fieldDisabled = !enabled || disabled || submitting;
        const err = errors[field.key];

        return (
          <div key={field.key} className={fieldDisabled ? 'opacity-60' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.helpText && (
              <p className="text-xs text-gray-500 mb-2">{field.helpText}</p>
            )}

            {renderField(field, values, customState, setValue, setCustomState, handleFileChange, pendingFiles, fieldDisabled)}

            {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
          </div>
        );
      })}

      {errors['__form__'] && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {errors['__form__']}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-4">
        {rightSlot}
        <button
          type="submit"
          disabled={submitting || disabled}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (submitMsg || '处理中...') : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ============== 字段渲染 ==============

function renderField(
  field: ToolParamField,
  values: Record<string, any>,
  customState: CustomState,
  setValue: (k: string, v: any) => void,
  setCustomState: React.Dispatch<React.SetStateAction<CustomState>>,
  handleFileChange: (f: ToolParamField, files: FileList | null) => void,
  pendingFiles: Record<string, File[]>,
  disabled: boolean,
) {
  const v = values[field.key];
  const baseInputClass = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent outline-none transition';

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={v ?? ''}
          onChange={(e) => setValue(field.key, e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className={baseInputClass}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={v ?? ''}
          onChange={(e) => setValue(field.key, e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={4}
          className={baseInputClass}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={v ?? ''}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(e) => setValue(field.key, e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={field.placeholder}
          disabled={disabled}
          className={baseInputClass}
        />
      );

    case 'range':
      return (
        <div className="flex items-center gap-3">
          <input
            type="range"
            value={v ?? field.min ?? 0}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onChange={(e) => setValue(field.key, Number(e.target.value))}
            disabled={disabled}
            className="flex-1"
          />
          <span className="w-12 text-center font-medium text-[#1E3A5F]">{v ?? field.min ?? 0}</span>
        </div>
      );

    case 'select': {
      const options = field.allowCustom
        ? [...(field.options || []), { label: '✏️ 自定义', value: CUSTOM_VALUE }]
        : field.options || [];
      const isCustom = v === CUSTOM_VALUE;
      return (
        <>
          <select
            value={v ?? ''}
            onChange={(e) => setValue(field.key, e.target.value)}
            disabled={disabled}
            className={baseInputClass}
          >
            <option value="">请选择...</option>
            {options.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
          {isCustom && (
            <input
              type="text"
              value={customState[field.key]?.customValue ?? ''}
              onChange={(e) => setCustomState((prev) => ({ ...prev, [field.key]: { isCustom: true, customValue: e.target.value } }))}
              placeholder={`请输入自定义${field.label}`}
              disabled={disabled}
              className={`${baseInputClass} mt-2`}
            />
          )}
        </>
      );
    }

    case 'radio':
    case 'radioCard': {
      const options = field.allowCustom
        ? [...(field.options || []), { label: '自定义', value: CUSTOM_VALUE, icon: '✏️' }]
        : field.options || [];
      const isCustom = v === CUSTOM_VALUE;
      const isCard = field.type === 'radioCard' || field.uiHint === 'card';
      return (
        <>
          <div className={isCard ? 'grid grid-cols-2 md:grid-cols-3 gap-3' : 'flex flex-wrap gap-3'}>
            {options.map((opt) => {
              const selected = String(v) === String(opt.value);
              if (isCard) {
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => !disabled && setValue(field.key, opt.value)}
                    disabled={disabled}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      selected ? 'border-[#2563EB] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {opt.icon && <div className="text-2xl mb-1">{opt.icon}</div>}
                    <div className="font-medium text-[#1E3A5F]">{opt.label}</div>
                    {opt.desc && <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>}
                  </button>
                );
              }
              return (
                <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.key}
                    value={String(opt.value)}
                    checked={selected}
                    onChange={() => setValue(field.key, opt.value)}
                    disabled={disabled}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
          {isCustom && (
            <input
              type="text"
              value={customState[field.key]?.customValue ?? ''}
              onChange={(e) => setCustomState((prev) => ({ ...prev, [field.key]: { isCustom: true, customValue: e.target.value } }))}
              placeholder={`请输入自定义${field.label}`}
              disabled={disabled}
              className={`${baseInputClass} mt-3`}
            />
          )}
        </>
      );
    }

    case 'checkbox': {
      const selected: any[] = Array.isArray(v) ? v : [];
      return (
        <div className="flex flex-wrap gap-3">
          {(field.options || []).map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked ? selected.filter((x) => x !== opt.value) : [...selected, opt.value];
                    setValue(field.key, next);
                  }}
                  disabled={disabled}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(v)}
            onChange={(e) => setValue(field.key, e.target.checked)}
            disabled={disabled}
          />
          <span className="text-sm text-gray-700">{field.placeholder || '启用'}</span>
        </label>
      );

    case 'date':
      return (
        <input
          type="date"
          value={v ?? ''}
          onChange={(e) => setValue(field.key, e.target.value)}
          disabled={disabled}
          className={baseInputClass}
        />
      );

    case 'file': {
      const files = pendingFiles[field.key] || [];
      return (
        <>
          <input
            type="file"
            accept={field.accept}
            multiple={field.multiple}
            onChange={(e) => handleFileChange(field, e.target.files)}
            disabled={disabled}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#1E3A5F] file:text-white hover:file:bg-[#2563EB] cursor-pointer"
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              {files.map((f, idx) => (
                <li key={idx}>📎 {f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {field.accept && `允许类型: ${field.accept}`}
            {field.maxSizeMB && ` · 最大 ${field.maxSizeMB}MB`}
            {field.multiple && field.maxFiles && ` · 最多 ${field.maxFiles} 个`}
          </p>
        </>
      );
    }

    default:
      return null;
  }
}

export default DynamicToolForm;
