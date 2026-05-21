'use client';

import { useState, useEffect } from 'react';
import type { Tool } from '../../types';

interface ToolCreationFormProps {
  tool: Tool;
}

interface FormState {
  // Storybook specific
  storyTitle?: string;
  storyContent?: string;
  artStyle?: string;
  voiceType?: string;
  pageCount?: number;
  hasBackgroundMusic?: boolean;
  hasSoundEffects?: boolean;

  // Ecommerce specific
  productName?: string;
  productCategory?: string;
  productFeatures?: string;
  targetAudience?: string;
  imageStyle?: string;
  includePsd?: boolean;
  imageCount?: number;

  // Marketing copy specific
  productOrBrand?: string;
  keySellingPoints?: string;
  targetPlatform?: string;
  toneStyle?: string;
  copyLength?: string;
  platformCount?: number;
}

export function ToolCreationForm({ tool }: ToolCreationFormProps) {
  const [mode, setMode] = useState<'form' | 'chat'>('form');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [formState, setFormState] = useState<FormState>({
    pageCount: 10,
    imageCount: 5,
    platformCount: 3,
    artStyle: 'cartoon',
    voiceType: 'warm',
    imageStyle: 'professional',
    targetPlatform: 'all',
    toneStyle: 'professional',
    copyLength: 'medium',
    includePsd: true,
  });

  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    calculateTotalCost();
  }, [formState, tool]);

  const calculateTotalCost = () => {
    let cost = tool.pricing.baseFee;

    // Storybook
    if (tool.slug === 'ai-storybook') {
      const imageCost = tool.pricing.resourceFees?.image || 1;
      cost += imageCost * (formState.pageCount || 10);

      if (formState.voiceType && formState.voiceType !== 'none') {
        const audioCost = tool.pricing.resourceFees?.audio || 0.5;
        cost += audioCost * (formState.pageCount || 10);
      }
    }

    // Ecommerce
    if (tool.slug === 'ecommerce-detail') {
      const imageCost = tool.pricing.resourceFees?.image || 2;
      cost += imageCost * (formState.imageCount || 5);
    }

    // Marketing
    if (tool.slug === 'product-description') {
      const platformCost = tool.pricing.resourceFees?.image || 1;
      cost += platformCost * (formState.platformCount || 3);
    }

    setTotalCost(cost);
  };

  const handleStartGeneration = () => {
    setIsGenerating(true);
    setCurrentProgress(0);
    setCurrentStep(1);

    // Simulate progress
    const steps = tool.slug === 'ai-storybook' ? 4 : tool.slug === 'ecommerce-detail' ? 3 : 2;
    let step = 1;
    const interval = setInterval(() => {
      const progress = Math.min((step / steps) * 100, 100);
      setCurrentProgress(progress);
      setCurrentStep(step);
      step++;

      if (step > steps) {
        clearInterval(interval);
        setTimeout(() => {
          setIsGenerating(false);
        }, 1000);
      }
    }, 1500);
  };

  const updateFormState = (key: keyof FormState, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  // Storybook Generator Form
  const renderStorybookForm = () => (
    <div className="space-y-6">
      {/* Step 1: Basic Info */}
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-xl text-brand-dark mb-6 flex items-center gap-3">
          <span className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">1</span>
          基础信息
        </h3>
        <div className="space-y-5">
          <div>
            <label className="block text-base font-medium text-gray-600 mb-2">绘本标题 *</label>
            <input
              type="text"
              className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg"
              placeholder="例如：小兔子的森林冒险"
              value={formState.storyTitle || ''}
              onChange={(e) => updateFormState('storyTitle', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-base font-medium text-gray-600 mb-2">故事主题或文案 *</label>
            <textarea
              rows={5}
              className="w-full px-5 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-lg"
              placeholder="描述您想要的故事，或者粘贴完整的故事文案..."
              value={formState.storyContent || ''}
              onChange={(e) => updateFormState('storyContent', e.target.value)}
            />
          </div>
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
                { value: 'japanese', label: '日系动漫', icon: '🌸' },
                { value: 'flat', label: '扁平插画', icon: '💎' },
              ].map((style) => (
                <label key={style.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="style"
                    value={style.value}
                    className="peer hidden"
                    checked={formState.artStyle === style.value}
                    onChange={() => updateFormState('artStyle', style.value)}
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

      {/* Step 3: Page Settings */}
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-xl text-brand-dark mb-6 flex items-center gap-3">
          <span className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">3</span>
          页数设置
        </h3>
        <div className="space-y-6">
          <div>
            <label className="block text-base font-medium text-gray-600 mb-3">
              绘本页数：<span className="text-blue-500 font-bold text-xl">{formState.pageCount}</span>页
            </label>
            <input
              type="range"
              min={5}
              max={30}
              value={formState.pageCount}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              onChange={(e) => updateFormState('pageCount', parseInt(e.target.value))}
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
  );

  // Ecommerce Detail Generator Form
  const renderEcommerceForm = () => (
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
  );

  // Marketing Copy Generator Form
  const renderMarketingForm = () => (
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
  );

  const renderChatMode = () => (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-8" style={{ minHeight: '500px' }}>
        {/* Chat Area */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-dark to-blue-500 flex items-center justify-center">
                <span className="text-white text-lg">🤖</span>
              </div>
              <div>
                <h3 className="font-semibold text-brand-dark">AI创作助手</h3>
                <p className="text-xs text-gray-500">在线，可以随时提问</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-dark to-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">🤖</span>
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-2xl rounded-tl-none p-4 max-w-lg">
                  <p className="text-gray-700 mb-3">您好！我是您的专属AI创作助手 👋</p>
                  <p className="text-gray-700 mb-3">请告诉我您的具体需求，我可以帮您：</p>
                  <ul className="text-gray-500 text-sm space-y-1 ml-4 list-disc">
                    <li>梳理需求并提供专业建议</li>
                    <li>生成多个方案供您选择</li>
                    <li>根据您的反馈持续优化</li>
                  </ul>
                  <p className="text-gray-700 mt-3">让我们开始吧！有什么我可以帮您的吗？</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-3">
              <input
                type="text"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="输入您的想法..."
              />
              <button className="px-6 py-3 bg-gradient-to-r from-brand-dark to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all">
                发送
              </button>
            </div>
          </div>
        </div>

        {/* Requirements Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
            <h3 className="font-semibold text-lg text-brand-dark mb-4">📋 需求摘要</h3>
            <div className="space-y-4 mb-6">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">当前状态</p>
                <p className="text-sm text-gray-600">等待您输入需求...</p>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">预估费用</span>
                <span className="text-xl font-bold text-green-600">≈ {totalCost} 积分</span>
              </div>
            </div>
            <button
              className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all opacity-50 cursor-not-allowed"
              disabled
            >
              🚀 确认并生成
            </button>
            <p className="text-center text-xs text-gray-500 mt-3">完成需求确认后即可开始生成</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCostEstimator = () => (
    <div className="sticky top-24 bg-white rounded-2xl p-8 border border-gray-200 shadow-xl">
      <h3 className="font-semibold text-xl text-brand-dark mb-6">费用预估</h3>
      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center py-3 border-b border-gray-200">
          <span className="text-gray-500 text-lg">基础调用费</span>
          <span className="font-medium text-brand-dark text-lg">{tool.pricing.baseFee} 积分</span>
        </div>

        {tool.slug === 'ai-storybook' && (
          <>
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-gray-500 text-lg">插图生成 ({formState.pageCount}张 × {(tool.pricing.resourceFees?.image || 1).toFixed(1)}积分)</span>
              <span className="font-medium text-brand-dark text-lg">{((formState.pageCount || 10) * (tool.pricing.resourceFees?.image || 1)).toFixed(1)} 积分</span>
            </div>
            {formState.voiceType && formState.voiceType !== 'none' && (
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-500 text-lg">配音合成 ({formState.pageCount}段 × {(tool.pricing.resourceFees?.audio || 0.5).toFixed(1)}积分)</span>
                <span className="font-medium text-brand-dark text-lg">{((formState.pageCount || 10) * (tool.pricing.resourceFees?.audio || 0.5)).toFixed(1)} 积分</span>
              </div>
            )}
          </>
        )}

        {tool.slug === 'ecommerce-detail' && (
          <div className="flex justify-between items-center py-3 border-b border-gray-200">
            <span className="text-gray-500 text-lg">详情图生成 ({formState.imageCount}张 × {(tool.pricing.resourceFees?.image || 2).toFixed(1)}积分)</span>
            <span className="font-medium text-brand-dark text-lg">{((formState.imageCount || 5) * (tool.pricing.resourceFees?.image || 2)).toFixed(1)} 积分</span>
          </div>
        )}

        {tool.slug === 'product-description' && (
          <div className="flex justify-between items-center py-3 border-b border-gray-200">
            <span className="text-gray-500 text-lg">多平台适配 ({formState.platformCount}个 × {(tool.pricing.resourceFees?.image || 1).toFixed(1)}积分)</span>
            <span className="font-medium text-brand-dark text-lg">{((formState.platformCount || 3) * (tool.pricing.resourceFees?.image || 1)).toFixed(1)} 积分</span>
          </div>
        )}

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
      <p className="text-center text-sm text-gray-500 mt-4">预计耗时：{tool.slug === 'ai-storybook' ? '2-5' : tool.slug === 'ecommerce-detail' ? '1-3' : '0.5-1'} 分钟</p>
    </div>
  );

  // Progress Modal
  const renderProgressModal = () => {
    if (!isGenerating) return null;

    const steps = tool.slug === 'ai-storybook'
      ? ['故事内容创作', '批量生成插图', '语音合成', '打包交付']
      : tool.slug === 'ecommerce-detail'
      ? ['文案创作', '主图生成', '详情图合成']
      : ['需求分析', '多平台文案生成'];

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

        {/* Mode Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
            <button
              className={`px-8 py-4 rounded-xl font-semibold transition-all text-lg ${
                mode === 'form'
                  ? 'bg-[#1E3A5F] text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              onClick={() => setMode('form')}
            >
              📝 表单模式
            </button>
            <button
              className={`px-8 py-4 rounded-xl font-semibold transition-all text-lg ${
                mode === 'chat'
                  ? 'bg-[#1E3A5F] text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              onClick={() => setMode('chat')}
            >
              💬 对话模式
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {mode === 'form' ? (
              <>
                {tool.slug === 'ai-storybook' && renderStorybookForm()}
                {tool.slug === 'ecommerce-detail' && renderEcommerceForm()}
                {tool.slug === 'product-description' && renderMarketingForm()}
              </>
            ) : (
              renderChatMode()
            )}
          </div>

          <div className="lg:col-span-1">
            {mode === 'form' && renderCostEstimator()}
          </div>
        </div>
      </div>

      {renderProgressModal()}
    </section>
  );
}
