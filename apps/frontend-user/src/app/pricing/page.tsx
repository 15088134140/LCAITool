'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 定价套餐数据类型
interface PricingPlan {
  id: number;
  title: string;
  subtitle: string;
  price: number;
  points: number;
  bonus?: number;
  description?: string;
  features: string[];
  featured?: boolean;
  badge?: string;
  buttonText: string;
}

// 常见问题数据类型
interface FAQItem {
  question: string;
  answer: string;
}

export default function PricingPage() {
  const router = useRouter();
  const [activePlan, setActivePlan] = useState<number>(2);
  const [activeTab, setActiveTab] = useState<string>('pay-per-use');
  const [selectedPayment, setSelectedPayment] = useState<string>('wechat');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // 定价套餐数据
  const pricingPlans: PricingPlan[] = [
    {
      id: 1,
      title: "新手体验包",
      subtitle: "适合初次体验",
      price: 9.9,
      points: 50,
      features: [
        "所有工具可用",
        "积分永久有效",
        "7天未使用可退款",
        "专业客服支持"
      ],
      buttonText: "立即购买"
    },
    {
      id: 2,
      title: "标准工作包",
      subtitle: "最受欢迎选择",
      price: 29.9,
      points: 200,
      bonus: 30,
      features: [
        "所有工具可用",
        "赠送 30 积分",
        "积分永久有效",
        "优先体验新工具",
        "专属客服支持"
      ],
      featured: true,
      badge: "🔥 最受欢迎",
      buttonText: "立即购买"
    },
    {
      id: 3,
      title: "专业创作包",
      subtitle: "深度用户首选",
      price: 69.9,
      points: 500,
      bonus: 100,
      features: [
        "所有工具可用",
        "赠送 100 积分",
        "积分永久有效",
        "优先体验新工具",
        "专属客服支持",
        "API 调用额度"
      ],
      badge: "💎 最划算",
      buttonText: "立即购买"
    },
    {
      id: 4,
      title: "企业高级包",
      subtitle: "团队/企业使用",
      price: 249.9,
      points: 2000,
      bonus: 500,
      features: [
        "所有工具可用",
        "赠送 500 积分",
        "积分永久有效",
        "多子账户管理",
        "专属客户经理",
        "定制化功能"
      ],
      buttonText: "立即购买"
    },
    {
      id: 5,
      title: "定制量大包",
      subtitle: "联系客服定制",
      price: 0,
      points: 0,
      description: "企业级定制服务",
      features: [
        "按需求定制方案",
        "专属客户经理",
        "个性化服务支持",
        "企业发票开具"
      ],
      buttonText: "联系客服"
    }
  ];

  // 常见问题数据
  const faqItems: FAQItem[] = [
    {
      question: "积分有有效期吗？",
      answer: "积分永久有效，无过期时间。您可以根据使用需求灵活充值，用多少充多少。"
    },
    {
      question: "可以申请退款吗？",
      answer: "充值后7天内，如未使用任何积分，可申请全额退款。已使用部分按实际消费结算，剩余部分可退还。退款将在5个工作日内原路返回。"
    },
    {
      question: "企业发票怎么开？",
      answer: "可以开具增值税普通发票和专用发票。企业用户可通过个人中心申请，或联系客服获取详细发票信息。"
    },
    {
      question: "可以给其他账号充值吗？",
      answer: "目前支持给其他账号充值。在充值页面选择\"代充\"功能，输入对方账号即可。"
    },
    {
      question: "会员和积分的区别？",
      answer: "会员提供基础服务权限，积分用于支付具体工具使用费用。会员可享受一定折扣优惠，但工具使用仍需消耗积分。"
    },
    {
      question: "支付失败怎么办？",
      answer: "如果支付失败，请检查支付方式是否正常，或尝试其他支付方式。如遇到技术问题，可联系客服协助解决。"
    }
  ];

  // 计算平均单价
  const calculateUnitPrice = (price: number, points: number, bonus?: number): string => {
    if (points === 0) return '';
    const totalPoints = points + (bonus || 0);
    const unitPrice = price / totalPoints;
    return unitPrice.toFixed(4);
  };

  // 格式化价格
  const formatPrice = (price: number): string => {
    return `¥${price.toFixed(1)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] py-16 lg:py-24 section-bg-blobs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">充值套餐</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            按量付费，透明划算，无订阅负担，想用就用
          </p>

          {/* Current Balance Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto">
            <div className="text-blue-100 text-sm mb-2">当前积分余额</div>
            <div className="text-5xl font-bold text-white mb-4">156</div>
            <button
              onClick={() => router.push('/payment')}
              className="w-full py-3 bg-white text-[#1E3A5F] rounded-xl font-semibold hover:bg-blue-50 transition-colors focus-ring"
            >
              立即充值
            </button>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="py-8 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center space-x-4">
            {[
              { key: 'pay-per-use', label: '按次充值' },
              { key: 'monthly', label: '月度会员' },
              { key: 'yearly', label: '年度会员' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`tab-btn px-6 py-3 rounded-xl font-semibold transition-colors focus-ring ${
                  activeTab === tab.key
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-16 section-bg-blobs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1E3A5F] mb-3 text-center">
            {activeTab === 'pay-per-use' ? '选择充值套餐' : '会员权益'}
          </h2>
          <p className="text-slate-600 text-center mb-12">
            {activeTab === 'pay-per-use'
              ? '所有套餐积分永久有效，无过期时间'
              : '会员享受专属权益，积分使用更优惠'}
          </p>

          {/* 套餐卡片网格 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`pricing-card card-hover bg-white rounded-2xl border mt-4 flex flex-col ${
                  activePlan === plan.id
                    ? 'border-[#2563EB] border-2 shadow-lg ring-4 ring-blue-100'
                    : plan.featured
                      ? 'border-2 border-[#059669]'
                      : 'border-slate-200'
                } p-6 cursor-pointer transition-all duration-250 overflow-visible`}
                onClick={() => setActivePlan(plan.id)}
              >
                {/* 特色标签 */}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className={`px-5 py-1.5 rounded-full text-sm font-bold shadow-md ${
                      plan.featured
                        ? 'bg-gradient-to-r from-[#F59E0B] to-[#EF4444] text-white'
                        : 'bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] text-white'
                    }`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* 套餐标题 */}
                <div className="text-center mb-6 pt-3">
                  <h3 className="font-bold text-xl text-[#1E3A5F] mb-1">{plan.title}</h3>
                  <p className="text-sm text-slate-600">{plan.subtitle}</p>
                </div>

                {/* 价格信息 */}
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-[#1E3A5F]">
                    {plan.price > 0 ? formatPrice(plan.price) : '联系客服'}
                  </div>
                  {plan.points > 0 && (
                    <div className="text-slate-600 mt-1">
                      = {plan.points} 积分
                      {plan.bonus && (
                        <span className="text-xs text-green-600 ml-2">
                          (含赠送 {plan.bonus} 积分)
                        </span>
                      )}
                    </div>
                  )}
                  {plan.price > 0 && plan.points > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      平均单价: ¥{calculateUnitPrice(plan.price, plan.points, plan.bonus)}/积分
                    </div>
                  )}
                </div>

                {/* 套餐功能 - 自动填充空间 */}
                <ul className="space-y-3 mb-auto flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <svg className="w-5 h-5 text-[#059669] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* 按钮 - 固定在底部 */}
                <button className={`w-full py-3 rounded-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-2 transition-colors mt-6 ${
                  activePlan === plan.id
                    ? 'btn-primary text-white'
                    : 'border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white'
                }`}>
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>

          {/* 自定义充值 */}
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-lg text-[#1E3A5F] mb-4">自定义充值金额</h3>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">¥</span>
                <input
                  type="number"
                  placeholder="输入金额"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus-ring"
                  min="1"
                />
              </div>
              <button
                onClick={() => router.push('/payment')}
                className="btn-primary px-8 py-3 text-white rounded-xl font-semibold focus-ring"
              >
                立即充值
              </button>
            </div>
            <p className="text-sm text-slate-600 mt-3">
              * 1元 = 10积分，自定义充值不享受额外赠送
            </p>
          </div>
        </div>
      </section>

      {/* 支付方式选择 */}
      <section className="py-16 bg-white section-bg-blobs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-8 text-center">选择支付方式</h2>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                id: 'wechat',
                name: '微信支付',
                description: '推荐使用',
                icon: (
                  <div className="w-12 h-12 rounded-xl bg-[#059669] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                    </svg>
                  </div>
                )
              },
              {
                id: 'alipay',
                name: '支付宝',
                description: '快捷支付',
                icon: (
                  <div className="w-12 h-12 rounded-xl bg-[#2563EB] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.5 3h-15C3.12 3 2 4.12 2 5.5v13C2 19.88 3.12 21 4.5 21h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 4.12 20.88 3 19.5 3zm-7.5 8h-4v-2h4v2zm0 4h-4v-2h4v2zm6 0h-4v-2h4v2zm0-4h-4v-2h4v2z"/>
                    </svg>
                  </div>
                )
              },
              {
                id: 'transfer',
                name: '对公转账',
                description: '企业用户',
                icon: (
                  <div className="w-12 h-12 rounded-xl bg-[#7C3AED] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                    </svg>
                  </div>
                )
              }
            ].map((payment) => (
              <div
                key={payment.id}
                onClick={() => setSelectedPayment(payment.id)}
                className={`p-5 border-2 rounded-2xl flex items-center gap-4 cursor-pointer transition-colors focus-ring ${
                  selectedPayment === payment.id
                    ? 'border-[#059669] bg-green-50/50'
                    : 'border-slate-200 hover:border-[#2563EB]'
                }`}
              >
                {payment.icon}
                <div>
                  <div className="font-semibold text-[#1E3A5F]">{payment.name}</div>
                  <div className="text-sm text-slate-600">{payment.description}</div>
                </div>
                {selectedPayment === payment.id && (
                  <svg className="w-5 h-5 text-[#059669] ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 底部确认区域 */}
      <section className="py-16 section-bg-blobs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <div className="text-slate-600 text-sm mb-1">已选套餐</div>
                <div className="text-xl font-bold text-[#1E3A5F]">
                  {pricingPlans.find(plan => plan.id === activePlan)?.title}
                </div>
                <div className="text-slate-600 text-sm mt-1">
                  金额: {formatPrice(pricingPlans.find(plan => plan.id === activePlan)?.price || 0)}
                </div>
              </div>
              <button
                onClick={() => {
                  const plan = pricingPlans.find(p => p.id === activePlan);
                  router.push(`/payment?plan=${plan?.id || 2}&price=${plan?.price || 0}&points=${plan?.points || 0}`);
                }}
                className="btn-primary px-10 py-4 text-white rounded-xl font-bold text-lg hover:bg-green-600 transition-colors focus-ring shadow-xl"
              >
                确认支付
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 常见问题 FAQ */}
      <section className="py-16 bg-white section-bg-blobs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-10 text-center">常见问题</h2>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border border-slate-200 rounded-xl p-5">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between text-left focus-ring rounded"
                >
                  <span className="font-semibold text-[#1E3A5F]">{item.question}</span>
                  <svg className={`w-5 h-5 text-slate-600 transform transition-transform ${
                    openFaq === index ? 'rotate-180' : ''
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                <div className={`mt-4 pt-4 border-t border-slate-200 text-slate-600 ${
                  openFaq === index ? 'block' : 'hidden'
                }`}>
                  {item.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="py-16 bg-gradient-to-br from-[#059669] to-[#0D9488] section-bg-blobs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">注册即送 50 积分</h2>
          <p className="text-xl text-green-100 mb-10">立即注册，免费体验所有 AI 工具</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-10 py-4 bg-white text-[#059669] rounded-xl font-bold text-lg hover:bg-green-50 transition-colors shadow-xl focus-ring">
              立即免费注册
            </button>
            <button className="px-10 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors focus-ring">
              了解更多
            </button>
          </div>
        </div>
      </section>

      {/* 安全保障 */}
      <section className="py-16 section-bg-blobs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-10 text-center">安全保障与服务承诺</h2>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                title: '银行级加密',
                description: 'SSL 256位加密传输，保障您的支付安全',
                icon: (
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                  </div>
                )
              },
              {
                title: '即时到账',
                description: '支付成功后，积分即时到账，无需等待',
                icon: (
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                )
              },
              {
                title: '未用可退',
                description: '7天内未使用余额可申请退款，无后顾之忧',
                icon: (
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                )
              },
              {
                title: '专属客服',
                description: '7x24小时在线客服，随时解答您的疑问',
                icon: (
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                  </div>
                )
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                {item.icon}
                <h3 className="font-semibold text-lg text-[#1E3A5F] mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
