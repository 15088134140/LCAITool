'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Tool } from '@/types';
import { taskApi } from '@/lib/api/modules/task';
import { userApi } from '@/lib/api/modules/user';
import { ProgressModal } from '@/components/tool-detail/ProgressModal';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/store';

interface StorybookFormProps {
  tool: Tool;
}

type InputMode = 'theme' | 'storyContent';

interface StorybookFormState {
  inputMode: InputMode;
  theme?: string;
  storyContent?: string;
  art_style?: string;
  custom_style?: string;
  voiceType?: string;
  page_count?: number;
  smart_page_count?: boolean;
  hasBackgroundMusic?: boolean;
  hasSoundEffects?: boolean;
  target_age?: string;
}

export function StorybookForm({ tool }: StorybookFormProps) {
  const router = useRouter();
  const [progressTaskId, setProgressTaskId] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [formState, setFormState] = useState<StorybookFormState>({
    inputMode: 'theme',
    page_count: 10,
    art_style: 'cartoon',
    voiceType: 'warm',
    smart_page_count: false,
  });

  const [totalCost, setTotalCost] = useState(0);
  const [balance, setBalance] = useState(0);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    calculateTotalCost();
  }, [formState, tool]);

  useEffect(() => {
    userApi.getBalance().then(res => setBalance(res.balance)).catch(() => {});
  }, []);

  const calculateTotalCost = () => {
    let cost = tool.base_fee ?? 0;

    const imageFee = tool.image_fee ?? 0;
    if (imageFee > 0) {
      cost += imageFee * (formState.page_count || 10);
    }

    if (formState.voiceType && formState.voiceType !== 'none') {
      const audioFee = tool.audio_fee ?? 0;
      if (audioFee > 0) {
        cost += audioFee * (formState.page_count || 10);
      }
    }

    setTotalCost(cost);
  };

  const [formErrors, setFormErrors] = useState<string[]>([]);

  const validate = (): boolean => {
    const errors: string[] = [];
    if (formState.inputMode === 'theme' && !formState.theme?.trim()) {
      errors.push('theme');
    }
    if (formState.inputMode === 'storyContent' && !formState.storyContent?.trim()) {
      errors.push('storyContent');
    }
    if (formState.art_style === 'custom' && !formState.custom_style?.trim()) {
      errors.push('custom_style');
    }
    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleStartGeneration = async () => {
    if (!validate()) return;

    try {
      // Use tool slug directly as task type
      const taskType = tool.slug || '';

      // Collect form inputs — only send active field
      const resolvedArtStyle = formState.art_style === 'custom' && formState.custom_style
        ? formState.custom_style
        : formState.art_style;
      const inputParams: Record<string, any> = {
        art_style: resolvedArtStyle,
        page_count: formState.smart_page_count ? null : formState.page_count,
        smart_page_count: formState.smart_page_count,
        voiceType: formState.voiceType,
        include_audio: formState.voiceType && formState.voiceType !== 'none',
        target_age: formState.target_age || '3-6',
        hasBackgroundMusic: formState.hasBackgroundMusic,
        hasSoundEffects: formState.hasSoundEffects,
      };
      if (formState.inputMode === 'theme') {
        inputParams['theme'] = formState.theme;
      } else {
        inputParams['storyContent'] = formState.storyContent;
      }

      const task = await taskApi.createTask({
        tool_id: tool.id,
        task_type: taskType,
        estimated_cost: totalCost,
        input_params: inputParams,
      });

      // Open ProgressModal instead of navigating to progress page
      setProgressTaskId(task.id);
      setShowProgressModal(true);
    } catch (error: any) {
      console.error('创建任务失败:', error);
      const detail = error?.response?.data?.detail || '';
      if (detail.includes('余额') || error?.response?.status === 400) {
        toast.warning('积分余额不足，请先充值', { label: '去充值', onClick: () => router.push('/pricing') });
      } else {
        toast.error(detail || '创建任务失败，请稍后重试');
      }
    }
  };

  const handleProgressComplete = useCallback((workId: string) => {
    setShowProgressModal(false);
    setProgressTaskId(null);
    router.push(`/works/detail/${workId}`);
  }, [router]);

  const handleProgressClose = useCallback(() => {
    setShowProgressModal(false);
    setProgressTaskId(null);
  }, []);

  const updateFormState = (key: keyof StorybookFormState, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    // 清除对应字段的错误提示
    if (formErrors.includes(key)) {
      setFormErrors((prev) => prev.filter((e) => e !== key));
    }
  };

  return (
    <>
    <section id="start-creation" className="py-20 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">开始创作</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">选择适合您的创作方式，简单几步即可生成专属成果</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Step 1: Basic Info */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-xl text-brand-dark mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">1</span>
                  基础信息
                </h3>

                {/* 创作方式切换 */}
                <div className="flex gap-3 mb-6">
                  <button
                    type="button"
                    className={`flex-1 py-4 px-5 rounded-2xl text-center font-semibold text-lg transition-all border-2 ${
                      formState.inputMode === 'theme'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                    onClick={() => { updateFormState('inputMode', 'theme'); setFormErrors([]); }}
                  >
                    📝 主题创作
                    <p className="text-sm font-normal mt-1 text-gray-400">输入关键词，AI 自动创作故事</p>
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-4 px-5 rounded-2xl text-center font-semibold text-lg transition-all border-2 ${
                      formState.inputMode === 'storyContent'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                    onClick={() => { updateFormState('inputMode', 'storyContent'); setFormErrors([]); }}
                  >
                    📖 文案改编
                    <p className="text-sm font-normal mt-1 text-gray-400">粘贴已有文案，AI 提炼为绘本</p>
                  </button>
                </div>

                <div className="space-y-5">
                  {formState.inputMode === 'theme' ? (
                    <div>
                      <label className="block text-base font-medium text-gray-600 mb-2">绘本主题 *</label>
                      <input
                        type="text"
                        className={`w-full px-5 py-4 border rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg ${
                          formErrors.includes('theme') ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-200'
                        }`}
                        placeholder="例如：小兔子的森林冒险"
                        value={formState.theme || ''}
                        onChange={(e) => updateFormState('theme', e.target.value)}
                      />
                      {formErrors.includes('theme') && (
                        <p className="text-red-500 text-sm mt-1">请输入绘本主题</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-base font-medium text-gray-600 mb-2">故事文案 *</label>
                      <textarea
                        rows={5}
                        className={`w-full px-5 py-4 border rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-lg ${
                          formErrors.includes('storyContent') ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-200'
                        }`}
                        placeholder="粘贴您已有的故事文案，AI 将提炼为绘本故事大纲..."
                        value={formState.storyContent || ''}
                        onChange={(e) => updateFormState('storyContent', e.target.value)}
                      />
                      {formErrors.includes('storyContent') && (
                        <p className="text-red-500 text-sm mt-1">请输入故事文案</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Style Settings */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-xl text-brand-dark mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">2</span>
                  风格设置
                </h3>
                <div className="space-y-8">
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-4">艺术风格</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { value: 'cartoon', label: '卡通水彩', icon: '🎨' },
                        { value: 'oil', label: '梦幻油画', icon: '🖼️' },
                        { value: 'watercolor', label: '日系动漫', icon: '🌸' },
                        { value: 'flat', label: '扁平插画', icon: '💎' },
                        { value: 'custom', label: '自定义', icon: '✏️' },
                      ].map((style, idx) => (
                        <label key={`${style.value}-${idx}`} className="cursor-pointer">
                          <input
                            type="radio"
                            name="style"
                            value={style.value}
                            className="peer hidden"
                            checked={formState.art_style === style.value}
                            onChange={() => updateFormState('art_style', style.value)}
                          />
                          <div className="p-6 border-2 border-gray-200 rounded-2xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all hover:border-gray-300">
                            <div className="text-3xl mb-2">{style.icon}</div>
                            <div className="font-semibold text-brand-dark">{style.label}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {formState.art_style === 'custom' && (
                      <div className="mt-4">
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          placeholder="请输入自定义风格，如：日式动漫、水墨画..."
                          value={formState.custom_style || ''}
                          onChange={(e) => updateFormState('custom_style', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-4">配音音色</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {[
                        { value: 'warm', label: '温柔女声', icon: '👩' },
                        { value: 'deep', label: '磁性男声', icon: '👨' },
                        { value: 'child', label: '可爱童声', icon: '👧' },
                        { value: 'story', label: '故事主播', icon: '🧙' },
                        { value: 'none', label: '不需要', icon: '🚫' },
                      ].map((voice) => (
                        <label key={voice.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="voice"
                            value={voice.value}
                            className="peer hidden"
                            checked={formState.voiceType === voice.value}
                            onChange={() => updateFormState('voiceType', voice.value)}
                          />
                          <div className="p-5 border-2 border-gray-200 rounded-2xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all hover:border-gray-300">
                            <div className="text-2xl mb-1">{voice.icon}</div>
                            <div className="font-semibold text-brand-dark text-sm">{voice.label}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2.5: Target Age Setting */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-xl text-brand-dark mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold">2.5</span>
                  受众设置
                </h3>
                <div>
                  <label className="block text-base font-medium text-gray-600 mb-4">目标年龄段</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: '3-6', label: '3-6岁', desc: '学龄前儿童' },
                      { value: '6-9', label: '6-9岁', desc: '小学低年级' },
                      { value: '9-12', label: '9-12岁', desc: '小学高年级' },
                    ].map((age) => (
                      <label key={age.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name="targetAge"
                          value={age.value}
                          className="peer hidden"
                          checked={formState.target_age === age.value}
                          onChange={() => updateFormState('target_age', age.value)}
                        />
                        <div className="p-6 border-2 border-gray-200 rounded-2xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all hover:border-gray-300">
                          <div className="text-3xl font-bold text-brand-dark mb-1">{age.label}</div>
                          <div className="text-sm text-gray-500">{age.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 3: Page Settings */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-xl text-brand-dark mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">3</span>
                  页数设置
                </h3>
                <div className="space-y-6">
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                      checked={formState.smart_page_count || false}
                      onChange={(e) => updateFormState('smart_page_count', e.target.checked)}
                    />
                    <div>
                      <span className="font-semibold text-brand-dark">智能决策页数</span>
                      <p className="text-sm text-gray-500">AI 根据故事内容自动决定最佳页数</p>
                    </div>
                  </label>
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-3">
                      绘本页数：<span className="text-blue-500 font-bold text-xl">{formState.page_count}</span>页
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={30}
                      value={formState.page_count}
                      disabled={formState.smart_page_count}
                      className={`w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 ${formState.smart_page_count ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onChange={(e) => updateFormState('page_count', parseInt(e.target.value))}
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-2">
                      <span>5页</span>
                      <span>15页</span>
                      <span>30页</span>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-4 p-5 border border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all">
                      <input
                        type="checkbox"
                        className="w-6 h-6 accent-blue-500"
                        checked={formState.hasBackgroundMusic}
                        onChange={(e) => updateFormState('hasBackgroundMusic', e.target.checked)}
                      />
                      <div>
                        <span className="font-semibold text-brand-dark text-lg">🎵 添加背景音乐</span>
                        <p className="text-sm text-gray-500">根据故事氛围自动匹配</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-4 p-5 border border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all">
                      <input
                        type="checkbox"
                        className="w-6 h-6 accent-blue-500"
                        checked={formState.hasSoundEffects}
                        onChange={(e) => updateFormState('hasSoundEffects', e.target.checked)}
                      />
                      <div>
                        <span className="font-semibold text-brand-dark text-lg">🔊 添加音效</span>
                        <p className="text-sm text-gray-500">脚步声、风声等场景音效</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl p-8 border border-gray-200 shadow-xl">
              <h3 className="font-semibold text-xl text-brand-dark mb-6">费用预估</h3>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-500 text-lg">基础调用费</span>
                  <span className="font-medium text-brand-dark text-lg">{tool.base_fee ? `${tool.base_fee} 积分` : '免费'}</span>
                </div>

                {tool.image_fee ? (
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-500 text-lg">插图生成 ({formState.page_count}张 × {tool.image_fee}积分)</span>
                    <span className="font-medium text-brand-dark text-lg">{(formState.page_count || 10) * tool.image_fee} 积分</span>
                  </div>
                ) : null}
                {tool.audio_fee && formState.voiceType && formState.voiceType !== 'none' ? (
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-500 text-lg">配音合成 ({formState.page_count}段 × {tool.audio_fee}积分)</span>
                    <span className="font-medium text-brand-dark text-lg">{(formState.page_count || 10) * tool.audio_fee} 积分</span>
                  </div>
                ) : null}

                <div className="flex justify-between items-center py-4">
                  <span className="font-semibold text-brand-dark text-xl">总计</span>
                  <span className="text-3xl font-bold text-green-600">{totalCost} 积分</span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-5 mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-blue-500 text-xl">💳</span>
                  <span className="font-semibold text-brand-dark text-lg">账户余额</span>
                </div>
                <div className="text-3xl font-bold text-brand-dark">{balance} 积分</div>
                <p className="text-sm text-gray-500 mt-1">≈ ¥{(balance / 10).toFixed(1)}</p>
              </div>

              <button
                className={`w-full py-5 rounded-2xl font-bold text-xl transition-all ${
                  isAuthenticated
                    ? 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:shadow-2xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (isAuthenticated) {
                    handleStartGeneration();
                  } else {
                    router.push('/login');
                  }
                }}
              >
                🚀 {isAuthenticated ? '开始生成' : '请先登录'}
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">预计耗时：2-5 分钟</p>
            </div>
          </div>
        </div>
      </div>

      <ProgressModal
        isOpen={showProgressModal}
        taskId={progressTaskId}
        toolName={tool.name}
        onClose={handleProgressClose}
        onComplete={handleProgressComplete}
      />
    </section>
    </>
  );
}
