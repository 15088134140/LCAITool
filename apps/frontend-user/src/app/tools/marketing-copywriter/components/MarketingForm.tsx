'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Tool } from '@/lib/api/types';
import { taskApi } from '@/lib/api/modules/task';
import { userApi } from '@/lib/api/modules/user';
import { ProgressModal } from '@/components/tool-detail/ProgressModal';
import { toast } from '@/lib/toast';

interface MarketingFormProps {
  tool: Tool;
}

interface MarketingFormState {
  productOrBrand?: string;
  keySellingPoints?: string;
  targetPlatform?: string;
  toneStyle?: string;
  copyLength?: string;
  platformCount?: number;
}

export function MarketingForm({ tool }: MarketingFormProps) {
  const router = useRouter();
  const [progressTaskId, setProgressTaskId] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [formState, setFormState] = useState<MarketingFormState>({
    platformCount: 3,
    targetPlatform: 'all',
    toneStyle: 'professional',
    copyLength: 'medium',
  });

  const [totalCost, setTotalCost] = useState(0);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    calculateTotalCost();
  }, [formState, tool]);

  useEffect(() => {
    userApi.getBalance().then(res => setBalance(res.balance)).catch(() => {});
  }, []);

  const calculateTotalCost = () => {
    let cost = tool.base_fee ?? 0;

    setTotalCost(cost);
  };

  const handleStartGeneration = async () => {
    try {
      // Map tool slug to task type for backend executor
      const taskTypeMap: Record<string, string> = {
        'product-description': 'marketing',
      };
      const taskType = taskTypeMap[tool.slug] || tool.slug;

      // Collect form inputs
      const inputParams: Record<string, any> = {
        productOrBrand: formState.productOrBrand,
        keySellingPoints: formState.keySellingPoints,
        targetPlatform: formState.targetPlatform,
        toneStyle: formState.toneStyle,
        copyLength: formState.copyLength,
        platformCount: formState.platformCount,
      };

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

  const updateFormState = (key: keyof MarketingFormState, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
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
                  产品信息
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-2">产品/品牌名称 *</label>
                    <input
                      type="text"
                      className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg"
                      placeholder="例如：元气森林气泡水"
                      value={formState.productOrBrand || ''}
                      onChange={(e) => updateFormState('productOrBrand', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-2">核心卖点 *</label>
                    <textarea
                      rows={4}
                      className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-lg"
                      placeholder="列出产品的核心卖点，每行一个..."
                      value={formState.keySellingPoints || ''}
                      onChange={(e) => updateFormState('keySellingPoints', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Platform & Tone */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-xl text-brand-dark mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">2</span>
                  平台与风格
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-4">目标平台</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { value: 'xiaohongshu', label: '小红书', icon: '📕' },
                        { value: 'wechat', label: '朋友圈', icon: '💬' },
                        { value: 'douyin', label: '抖音', icon: '🎵' },
                        { value: 'weibo', label: '微博', icon: '📱' },
                      ].map((platform) => (
                        <label key={platform.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="targetPlatform"
                            value={platform.value}
                            className="peer hidden"
                            checked={formState.targetPlatform === platform.value}
                            onChange={() => updateFormState('targetPlatform', platform.value)}
                          />
                          <div className="p-6 border-2 border-gray-200 rounded-2xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all hover:border-gray-300">
                            <div className="text-3xl mb-2">{platform.icon}</div>
                            <div className="font-semibold text-brand-dark">{platform.label}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-4">文案风格</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { value: 'professional', label: '专业权威', icon: '🎓' },
                        { value: 'friendly', label: '亲切友好', icon: '😊' },
                        { value: 'humorous', label: '幽默风趣', icon: '😂' },
                        { value: 'luxury', label: '高端奢华', icon: '💎' },
                      ].map((tone) => (
                        <label key={tone.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="toneStyle"
                            value={tone.value}
                            className="peer hidden"
                            checked={formState.toneStyle === tone.value}
                            onChange={() => updateFormState('toneStyle', tone.value)}
                          />
                          <div className="p-6 border-2 border-gray-200 rounded-2xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all hover:border-gray-300">
                            <div className="text-3xl mb-2">{tone.icon}</div>
                            <div className="font-semibold text-brand-dark">{tone.label}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-4">文案长度</label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: 'short', label: '简短 (100字以内)' },
                        { value: 'medium', label: '中等 (100-300字)' },
                        { value: 'long', label: '详细 (300字以上)' },
                      ].map((length) => (
                        <label key={length.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="copyLength"
                            value={length.value}
                            className="peer hidden"
                            checked={formState.copyLength === length.value}
                            onChange={() => updateFormState('copyLength', length.value)}
                          />
                          <div className="p-5 border-2 border-gray-200 rounded-2xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all hover:border-gray-300">
                            <div className="font-semibold text-brand-dark">{length.label}</div>
                          </div>
                        </label>
                      ))}
                    </div>
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
                className="w-full py-5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-2xl font-bold text-xl hover:shadow-2xl transition-all"
                onClick={handleStartGeneration}
              >
                🚀 开始生成
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">预计耗时：0.5-1 分钟</p>
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
