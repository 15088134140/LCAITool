'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Tool } from '@/lib/api/types';
import { taskApi } from '@/lib/api/modules/task';

interface EcommerceFormProps {
  tool: Tool;
}

interface EcommerceFormState {
  productName?: string;
  productCategory?: string;
  productFeatures?: string;
  targetAudience?: string;
  imageStyle?: string;
  includePsd?: boolean;
  imageCount?: number;
}

export function EcommerceForm({ tool }: EcommerceFormProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [formState, setFormState] = useState<EcommerceFormState>({
    imageCount: 5,
    imageStyle: 'professional',
    includePsd: true,
  });

  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    calculateTotalCost();
  }, [formState, tool]);

  const calculateTotalCost = () => {
    let cost = tool.base_fee;

    const imageCost = tool.image_fee || 2;
    cost += imageCost * (formState.imageCount || 5);

    setTotalCost(cost);
  };

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setCurrentProgress(0);
    setCurrentStep(1);

    try {
      // Map tool slug to task type for backend executor
      const taskTypeMap: Record<string, string> = {
        'ecommerce-detail': 'ecommerce',
      };
      const taskType = taskTypeMap[tool.slug] || tool.slug;

      // Collect form inputs
      const inputParams: Record<string, any> = {
        productName: formState.productName,
        productCategory: formState.productCategory,
        productFeatures: formState.productFeatures,
        targetAudience: formState.targetAudience,
        imageStyle: formState.imageStyle,
        includePsd: formState.includePsd,
        imageCount: formState.imageCount,
        estimatedCost: totalCost,
      };

      const task = await taskApi.createTask({
        tool_id: tool.id,
        task_type: taskType,
        input_params: inputParams,
      });

      // Navigate to progress page
      router.push(`/works/${task.id}/progress`);
    } catch (error: any) {
      console.error('创建任务失败:', error);
      alert(error?.response?.data?.detail || '创建任务失败，请检查登录状态或稍后重试');
      setIsGenerating(false);
      setCurrentProgress(0);
      setCurrentStep(0);
    }
  };

  const updateFormState = (key: keyof EcommerceFormState, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  // Progress Modal
  const renderProgressModal = () => {
    if (!isGenerating) return null;

    const steps = ['文案创作', '主图生成', '详情图合成'];

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-600 to-green-500 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <span className="text-3xl">⚙️</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-brand-dark">正在生成</h3>
            <p className="text-gray-500 mt-2">{steps[currentStep - 1] || '处理中...'}</p>
          </div>
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">步骤 {currentStep}/{steps.length}</span>
              <span className="font-medium text-green-600">{Math.round(currentProgress)}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-600 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  index < currentStep - 1
                    ? 'bg-green-50'
                    : index === currentStep - 1
                    ? 'bg-blue-50'
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                {index < currentStep - 1 ? (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : index === currentStep - 1 ? (
                  <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
                <span className={index < currentStep ? 'text-green-600 font-medium' : ''}>{step}</span>
              </div>
            ))}
          </div>
          <button
            className="mt-6 w-full py-3 border border-gray-200 text-gray-500 rounded-xl font-medium hover:bg-gray-50 transition-all"
            onClick={() => setIsGenerating(false)}
          >
            取消生成
          </button>
        </div>
      </div>
    );
  };

  return (
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
              {/* Step 1: Product Info */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-xl text-brand-dark mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">1</span>
                  商品信息
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-2">商品名称 *</label>
                    <input
                      type="text"
                      className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg"
                      placeholder="例如：高端蓝牙耳机 Pro Max"
                      value={formState.productName || ''}
                      onChange={(e) => updateFormState('productName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-2">商品类目</label>
                    <select
                      className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg"
                      value={formState.productCategory || ''}
                      onChange={(e) => updateFormState('productCategory', e.target.value)}
                    >
                      <option value="">选择类目</option>
                      <option value="electronics">3C数码</option>
                      <option value="fashion">服饰鞋包</option>
                      <option value="beauty">美妆护肤</option>
                      <option value="food">食品生鲜</option>
                      <option value="home">家居家装</option>
                      <option value="other">其他类目</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-2">核心卖点 *</label>
                    <textarea
                      rows={4}
                      className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-lg"
                      placeholder="列出商品的核心卖点，每行一个卖点..."
                      value={formState.productFeatures || ''}
                      onChange={(e) => updateFormState('productFeatures', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-2">目标人群</label>
                    <input
                      type="text"
                      className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg"
                      placeholder="例如：25-35岁职场白领，追求品质生活"
                      value={formState.targetAudience || ''}
                      onChange={(e) => updateFormState('targetAudience', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Image Settings */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-xl text-brand-dark mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">2</span>
                  图片风格
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-4">视觉风格</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { value: 'professional', label: '商业大片', icon: '📸' },
                        { value: 'minimal', label: '简约高级', icon: '✨' },
                        { value: 'lifestyle', label: '生活场景', icon: '🏠' },
                        { value: 'tech', label: '科技感', icon: '🚀' },
                      ].map((style) => (
                        <label key={style.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name="imageStyle"
                            value={style.value}
                            className="peer hidden"
                            checked={formState.imageStyle === style.value}
                            onChange={() => updateFormState('imageStyle', style.value)}
                          />
                          <div className="p-6 border-2 border-gray-200 rounded-2xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all hover:border-gray-300">
                            <div className="text-3xl mb-2">{style.icon}</div>
                            <div className="font-semibold text-brand-dark">{style.label}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-600 mb-3">
                      详情图数量：<span className="text-blue-500 font-bold text-xl">{formState.imageCount}</span>张
                    </label>
                    <input
                      type="range"
                      min={3}
                      max={15}
                      value={formState.imageCount}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      onChange={(e) => updateFormState('imageCount', parseInt(e.target.value))}
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-2">
                      <span>3张</span>
                      <span>8张</span>
                      <span>15张</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-4 p-5 border border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all">
                    <input
                      type="checkbox"
                      className="w-6 h-6 accent-blue-500"
                      checked={formState.includePsd}
                      onChange={(e) => updateFormState('includePsd', e.target.checked)}
                    />
                    <div>
                      <span className="font-semibold text-brand-dark text-lg">📄 导出PSD源文件</span>
                      <p className="text-sm text-gray-500">可用于后续二次编辑（+2积分）</p>
                    </div>
                  </label>
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
                  <span className="font-medium text-brand-dark text-lg">{tool.base_fee} 积分</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-500 text-lg">详情图生成 ({formState.imageCount}张 × {(tool.image_fee || 2).toFixed(1)}积分)</span>
                  <span className="font-medium text-brand-dark text-lg">{((formState.imageCount || 5) * (tool.image_fee || 2)).toFixed(1)} 积分</span>
                </div>

                <div className="flex justify-between items-center py-4">
                  <span className="font-semibold text-brand-dark text-xl">总计</span>
                  <span className="text-3xl font-bold text-green-600">{totalCost.toFixed(1)} 积分</span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-5 mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-blue-500 text-xl">💳</span>
                  <span className="font-semibold text-brand-dark text-lg">账户余额</span>
                </div>
                <div className="text-3xl font-bold text-brand-dark">128 积分</div>
                <p className="text-sm text-gray-500 mt-1">≈ ¥12.8</p>
              </div>

              <button
                className="w-full py-5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-2xl font-bold text-xl hover:shadow-2xl transition-all"
                onClick={handleStartGeneration}
                disabled={isGenerating}
              >
                {isGenerating ? '⏳ 生成中...' : '🚀 开始生成'}
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">预计耗时：1-3 分钟</p>
            </div>
          </div>
        </div>
      </div>

      {renderProgressModal()}
    </section>
  );
}
