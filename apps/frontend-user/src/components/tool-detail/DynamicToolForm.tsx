'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressModal } from '@/components/tool-detail/ProgressModal';
import { toast } from '@/lib/toast';
import { fileApi } from '@/lib/api/modules/file';
import { taskApi } from '@/lib/api/modules/task';
import type { Tool, ToolParamField, ToolParamCondition } from '@/types';

interface DynamicToolFormProps {
  tool: Tool;
}

interface FormState {
  [key: string]: any;
}

interface FieldErrors {
  [key: string]: string;
}

interface UploadingFiles {
  [key: string]: boolean;
}

function evaluateCondition(
  condition: ToolParamCondition,
  formState: FormState
): boolean {
  const { when } = condition;
  const fieldValue = formState[when.field];

  switch (when.operator) {
    case 'eq':
      return fieldValue === when.value;
    case 'ne':
      return fieldValue !== when.value;
    case 'gt':
      return fieldValue > when.value;
    case 'gte':
      return fieldValue >= when.value;
    case 'lt':
      return fieldValue < when.value;
    case 'lte':
      return fieldValue <= when.value;
    case 'in':
      return Array.isArray(when.value) && when.value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(when.value) && !when.value.includes(fieldValue);
    case 'truthy':
      return !!fieldValue;
    case 'falsy':
      return !fieldValue;
    default:
      return true;
  }
}

function shouldShowField(
  field: ToolParamField,
  formState: FormState
): boolean {
  if (!field.condition) return true;
  if (field.condition.effect === 'hide') {
    return !evaluateCondition(field.condition, formState);
  }
  return evaluateCondition(field.condition, formState);
}

function shouldDisableField(
  field: ToolParamField,
  formState: FormState
): boolean {
  if (!field.condition) return false;
  if (field.condition.effect === 'disable') {
    return evaluateCondition(field.condition, formState);
  }
  if (field.condition.effect === 'enable') {
    return !evaluateCondition(field.condition, formState);
  }
  return false;
}

function validateCreativeVideoForm(formState: FormState): FieldErrors {
  const errors: FieldErrors = {};

  const prompt = String(formState['prompt'] || '').trim();
  const firstFrame = formState['first_frame'];
  const lastFrame = formState['last_frame'];
  const quantity = Number(formState['quantity'] ?? 1);
  const durationMode = formState['duration_mode'] || 'seconds';
  const duration = Number(formState['duration'] ?? 6);

  if (!firstFrame && !lastFrame && !prompt) {
    errors['prompt'] = '文生视频模式下请输入创意描述';
  }
  if (lastFrame && !firstFrame) {
    errors['last_frame'] = '不能只上传尾帧，请先上传首帧参考图';
  }
  if (quantity !== 1) {
    errors['quantity'] = 'P0 仅支持生成 1 条视频';
  }
  if (durationMode === 'seconds' && (duration < 4 || duration > 12)) {
    errors['duration'] = '视频时长必须在 4-12 秒之间';
  }

  return errors;
}

export function DynamicToolForm({ tool }: DynamicToolFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFiles>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  const sortedFields = useMemo(() => {
    return [...(tool.param_schema || [])].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );
  }, [tool.param_schema]);

  const visibleFields = useMemo(() => {
    return sortedFields.filter((field) => shouldShowField(field, formState));
  }, [sortedFields, formState]);

  const handleFieldChange = useCallback(
    (key: string, value: any) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  const handleFileChange = useCallback(
    async (field: ToolParamField, event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingFiles((prev) => ({ ...prev, [field.key]: true }));

      try {
        const result = await fileApi.uploadFile(file, {
          toolId: tool.id,
          fieldKey: field.key,
        });
        handleFieldChange(field.key, result.id);
        toast.success('文件上传成功');
      } catch (error) {
        console.error('文件上传失败:', error);
        toast.error('文件上传失败，请重试');
      } finally {
        setUploadingFiles((prev) => ({ ...prev, [field.key]: false }));
      }
    },
    [tool.id, handleFieldChange]
  );

  const handleAction = useCallback(
    (action: string | undefined) => {
      if (action === 'open_demo_preview') {
        const demosElement = document.getElementById('demos');
        if (demosElement) {
          demosElement.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        toast.info('该功能即将上线，敬请期待');
      }
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      // Basic validation for required fields
      const newErrors: FieldErrors = {};
      visibleFields.forEach((field) => {
        if (
          field.required &&
          field.type !== 'section' &&
          field.type !== 'action' &&
          field.type !== 'hidden'
        ) {
          const value = formState[field.key];
          if (value === undefined || value === null || value === '') {
            newErrors[field.key] = `${field.label}为必填项`;
          }
        }
      });

      // Creative video specific validation
      if (tool.slug === 'creative-video-generator') {
        const creativeErrors = validateCreativeVideoForm(formState);
        Object.assign(newErrors, creativeErrors);
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        const firstErrorMessage = Object.values(newErrors)[0];
        if (firstErrorMessage) {
          toast.error(firstErrorMessage);
        }
        return;
      }

      setIsSubmitting(true);

      try {
        const task = await taskApi.createTask({
          tool_id: tool.id,
          task_type: tool.executor_key || tool.slug || '',
          estimated_cost: tool.base_fee ?? tool.pricing?.baseFee ?? 0,
          input_params: formState,
        });

        setTaskId(task.id);
        setShowProgress(true);
      } catch (error) {
        console.error('创建任务失败:', error);
        toast.error('创建任务失败，请稍后重试');
      } finally {
        setIsSubmitting(false);
      }
    },
    [visibleFields, formState, tool]
  );

  const handleProgressComplete = useCallback(
    (workId: string) => {
      setShowProgress(false);
      setTaskId(null);
      router.push(`/works/detail/${workId}`);
    },
    [router]
  );

  const handleProgressClose = useCallback(() => {
    setShowProgress(false);
    setTaskId(null);
  }, []);

  const renderField = (field: ToolParamField) => {
    const hasError = !!errors[field.key];
    const errorMessage = errors[field.key];
    const isUploading = uploadingFiles[field.key];
    const isDisabled = shouldDisableField(field, formState);

    switch (field.type) {
      case 'section':
        return (
          <div key={field.key} className="mb-8">
            <h3 className="text-lg font-semibold text-brand-dark mb-2">
              {field.label}
            </h3>
            {field.helpText && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      case 'text':
        return (
          <div key={field.key} className={`mb-6 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <label className="block text-sm font-medium text-brand-dark mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              disabled={isDisabled}
              className={`w-full px-4 py-3 rounded-xl border ${
                hasError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-200 focus:ring-[#1E3A5F]'
              } focus:outline-none focus:ring-2 transition-all disabled:bg-gray-100`}
              placeholder={field.placeholder || ''}
              value={formState[field.key] || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
            {field.helpText && (
              <p className="mt-2 text-sm text-gray-500">{field.helpText}</p>
            )}
            {hasError && (
              <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className={`mb-6 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <label className="block text-sm font-medium text-brand-dark mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              disabled={isDisabled}
              className={`w-full px-4 py-3 rounded-xl border ${
                hasError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-200 focus:ring-[#1E3A5F]'
              } focus:outline-none focus:ring-2 transition-all resize-none disabled:bg-gray-100`}
              rows={5}
              placeholder={field.placeholder || ''}
              value={formState[field.key] || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
            {field.helpText && (
              <p className="mt-2 text-sm text-gray-500">{field.helpText}</p>
            )}
            {hasError && (
              <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className={`mb-6 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <label className="block text-sm font-medium text-brand-dark mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              disabled={isDisabled}
              className={`w-full px-4 py-3 rounded-xl border ${
                hasError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-200 focus:ring-[#1E3A5F]'
              } focus:outline-none focus:ring-2 transition-all disabled:bg-gray-100`}
              placeholder={field.placeholder || ''}
              min={field.min}
              max={field.max}
              value={formState[field.key] || ''}
              onChange={(e) =>
                handleFieldChange(
                  field.key,
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
            />
            {field.helpText && (
              <p className="mt-2 text-sm text-gray-500">{field.helpText}</p>
            )}
            {hasError && (
              <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div key={field.key} className={`mb-6 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <label className="block text-sm font-medium text-brand-dark mb-3">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {(field.options || []).map((option) => (
                <label
                  key={String(option.value)}
                  className={`flex items-center p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all ${isDisabled ? 'pointer-events-none' : ''}`}
                >
                  <input
                    type="radio"
                    name={field.key}
                    value={String(option.value)}
                    checked={formState[field.key] === option.value}
                    onChange={() => handleFieldChange(field.key, option.value)}
                    disabled={isDisabled}
                    className="w-4 h-4 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-brand-dark flex items-center gap-2">
                      {option.icon && <span>{option.icon}</span>}
                      {option.label}
                    </div>
                    {option.desc && (
                      <p className="text-sm text-gray-500 mt-1">{option.desc}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
            {hasError && (
              <p className="mt-2 text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className={`mb-6 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <label className="block text-sm font-medium text-brand-dark mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              disabled={isDisabled}
              className={`w-full px-4 py-3 rounded-xl border ${
                hasError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-200 focus:ring-[#1E3A5F]'
              } focus:outline-none focus:ring-2 transition-all bg-white disabled:bg-gray-100`}
              value={formState[field.key] || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            >
              <option value="">请选择</option>
              {(field.options || []).map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.helpText && (
              <p className="mt-2 text-sm text-gray-500">{field.helpText}</p>
            )}
            {hasError && (
              <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        );

      case 'range':
        const rangeValue = formState[field.key] ?? field.defaultValue ?? field.min ?? 0;
        return (
          <div key={field.key} className={`mb-6 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <label className="block text-sm font-medium text-brand-dark mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                disabled={isDisabled}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                min={field.min ?? 0}
                max={field.max ?? 100}
                value={rangeValue}
                onChange={(e) =>
                  handleFieldChange(field.key, Number(e.target.value))
                }
              />
              <span className="w-16 text-center font-medium text-brand-dark">
                {rangeValue}
              </span>
            </div>
            {field.helpText && (
              <p className="mt-2 text-sm text-gray-500">{field.helpText}</p>
            )}
            {hasError && (
              <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.key} className={`mb-6 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <label className={`flex items-center cursor-pointer ${isDisabled ? 'pointer-events-none' : ''}`}>
              <input
                type="checkbox"
                disabled={isDisabled}
                className="w-5 h-5 text-[#1E3A5F] rounded border-gray-300 focus:ring-[#1E3A5F]"
                checked={!!formState[field.key]}
                onChange={(e) => handleFieldChange(field.key, e.target.checked)}
              />
              <span className="ml-3 text-sm font-medium text-brand-dark">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
            {field.helpText && (
              <p className="mt-2 text-sm text-gray-500">{field.helpText}</p>
            )}
            {hasError && (
              <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        );

      case 'file':
        const hasValue = !!formState[field.key];
        return (
          <div key={field.key} className={`mb-6 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <label className="block text-sm font-medium text-brand-dark mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                hasValue
                  ? 'border-green-400 bg-green-50'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-200 hover:border-[#1E3A5F] hover:bg-gray-50'
              }`}
            >
              {isUploading ? (
                <div className="py-4">
                  <div className="w-8 h-8 border-2 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">上传中...</p>
                </div>
              ) : hasValue ? (
                <div>
                  <svg
                    className="w-12 h-12 mx-auto text-green-500 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm font-medium text-green-600 mb-2">
                    文件已上传
                  </p>
                  {!isDisabled && (
                    <label className="inline-block px-4 py-2 text-sm text-[#1E3A5F] border border-[#1E3A5F] rounded-lg cursor-pointer hover:bg-[#1E3A5F] hover:text-white transition-all">
                      重新选择
                      <input
                        type="file"
                        className="hidden"
                        accept={field.accept || 'image/*'}
                        onChange={(e) => handleFileChange(field, e)}
                      />
                    </label>
                  )}
                </div>
              ) : isDisabled ? (
                <div>
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    文件上传已禁用
                  </p>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm font-medium text-brand-dark mb-1">
                    点击上传文件
                  </p>
                  <p className="text-xs text-gray-500">
                    {field.accept === 'video/*'
                      ? '支持 MP4, MOV 等视频格式'
                      : field.accept === 'image/*' || !field.accept
                      ? '支持 JPG, PNG, WEBP 等图片格式'
                      : '点击选择文件'}
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept={field.accept || 'image/*'}
                    onChange={(e) => handleFileChange(field, e)}
                  />
                </label>
              )}
            </div>
            {field.helpText && (
              <p className="mt-2 text-sm text-gray-500">{field.helpText}</p>
            )}
            {hasError && (
              <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        );

      case 'action':
        return (
          <div key={field.key} className={`mb-6 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <button
              type="button"
              disabled={isDisabled}
              className="w-full px-6 py-3 bg-white border border-gray-200 text-brand-dark rounded-xl font-medium hover:bg-gray-50 transition-all disabled:bg-gray-100"
              onClick={() => handleAction(field.action)}
            >
              {field.label}
            </button>
            {field.helpText && (
              <p className="mt-2 text-sm text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      case 'hidden':
        return null;

      default:
        return null;
    }
  };

  return (
    <section id="start-creation" className="py-16 bg-[#F8FAFC]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-brand-dark mb-2">
              开始创作
            </h2>
            <p className="text-gray-500">填写以下参数，AI 将为您生成专属内容</p>
          </div>

          <form onSubmit={handleSubmit}>
            {visibleFields.map(renderField)}

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500">
                  预计消耗积分：
                  <span className="font-semibold text-[#1E3A5F]">
                    {tool.base_fee ?? tool.pricing?.baseFee ?? 0}
                  </span>
                </p>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#1E3A5F] to-[#2D4A6F] text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    创建任务中...
                  </span>
                ) : (
                  '开始生成'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ProgressModal
        isOpen={showProgress}
        taskId={taskId}
        toolName={tool.name}
        onClose={handleProgressClose}
        onComplete={handleProgressComplete}
      />
    </section>
  );
}

export default DynamicToolForm;
