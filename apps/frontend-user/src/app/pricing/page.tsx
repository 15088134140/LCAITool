'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import paymentApi from '@/lib/api/modules/payment';
import type { RechargePackage } from '@/lib/api/types';

interface CustomRechargeResult {
  success: boolean;
  order_no: string;
  pay_amount: number;
  total_points: number;
  balance: number;
  message: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: '积分有有效期吗？',
    answer: '积分永久有效，无过期时间。您可以根据使用需求灵活充值，用多少充多少。'
  },
  {
    question: '可以申请退款吗？',
    answer: '充值后7天内，如未使用任何积分，可申请全额退款。已使用部分按实际消费结算，剩余部分可退还。退款将在5个工作日内原路返回。'
  },
  {
    question: '企业发票怎么开？',
    answer: '可以开具增值税普通发票和专用发票。企业用户可通过个人中心申请，或联系客服获取详细发票信息。'
  },
  {
    question: '支付失败怎么办？',
    answer: '如果支付失败，请检查支付方式是否正常，或尝试其他支付方式。如遇到技术问题，可联系客服协助解决。'
  }
];

export default function PricingPage() {
  const router = useRouter();
  const { user, refreshUserBalance } = useUserStore();
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CustomRechargeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    refreshUserBalance();
    loadPackages();
  }, [refreshUserBalance]);

  const loadPackages = async () => {
    try {
      const data = await paymentApi.getRechargePackages(true);
      setPackages(data.items || []);
      const popular = data.items?.find(p => p.is_popular);
      if (popular) {
        setSelectedPackageId(popular.id);
      } else if (data.items?.length > 0) {
        setSelectedPackageId(data.items[0]!.id);
      }
    } catch (e) {
      console.error('加载充值档位失败', e);
    }
  };

  const selectedPackage = packages.find(p => p.id === selectedPackageId);
  const payAmount = selectedPackage
    ? selectedPackage.sale_price
    : (parseFloat(customAmount) || 0);
  const isValidAmount = payAmount >= 1;
  const isCustomSelected = selectedPackageId === null;

  const handleSelectPackage = (id: string) => {
    setSelectedPackageId(id);
    setCustomAmount('');
    setResult(null);
    setError(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setSelectedPackageId(null);
    setResult(null);
    setError(null);
  };

  const handlePay = async () => {
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      if (selectedPackage) {
        const order = await paymentApi.createOrder({
          recharge_package_id: selectedPackage.id,
          payment_provider: 'simulated' as any,
        });
        await paymentApi.simulatePayment(order.order_no);
        await refreshUserBalance();
        setResult({
          success: true,
          order_no: order.order_no,
          pay_amount: selectedPackage.sale_price,
          total_points: selectedPackage.base_points + selectedPackage.bonus_points,
          balance: user?.balance ?? 0,
          message: '充值成功',
        });
      } else if (payAmount > 0) {
        const res = await paymentApi.customRecharge(payAmount);
        await refreshUserBalance();
        setResult({
          success: true,
          order_no: res.order_no,
          pay_amount: res.pay_amount,
          total_points: res.total_points,
          balance: res.balance,
          message: res.message,
        });
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || '支付失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setCustomAmount('');
    const popular = packages.find(p => p.is_popular);
    setSelectedPackageId(popular?.id || packages[0]?.id || null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] py-16 lg:py-24 section-bg-blobs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">积分充值</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            按量付费，透明划算，无订阅负担，想用就用
          </p>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto">
            <div className="text-blue-100 text-sm mb-2">当前积分余额</div>
            <div className="text-5xl font-bold text-white mb-4">{user?.balance ?? 0}</div>
            <button
              onClick={() => router.push('/user-center/points')}
              className="w-full py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-colors"
            >
              积分明细
            </button>
          </div>
        </div>
      </section>

      {/* 充值档位选择 */}
      <section className="py-16 section-bg-blobs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1E3A5F] mb-3 text-center">选择充值档位</h2>
          <p className="text-slate-600 text-center mb-12">所有档位积分永久有效，无过期时间</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {packages.map((pkg) => {
              const totalPoints = pkg.base_points + pkg.bonus_points;
              const isSelected = selectedPackageId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  className={`relative card-hover bg-white rounded-2xl border p-6 cursor-pointer transition-all duration-250 flex flex-col ${
                    isSelected
                      ? 'border-[#2563EB] border-2 shadow-lg ring-4 ring-blue-100'
                      : 'border-slate-200'
                  }`}
                  onClick={() => handleSelectPackage(pkg.id)}
                >
                  {pkg.is_popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <span className="px-5 py-1.5 rounded-full text-sm font-bold shadow-md bg-gradient-to-r from-[#F59E0B] to-[#EF4444] text-white">
                        {pkg.name === '进阶档' ? '推荐' : '最划算'}
                      </span>
                    </div>
                  )}
                  <div className="text-center mb-6 pt-3">
                    <h3 className="font-bold text-xl text-[#1E3A5F] mb-1">{pkg.name}</h3>
                    <p className="text-sm text-slate-600">{pkg.description}</p>
                  </div>
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-[#1E3A5F]">
                      ¥{pkg.sale_price.toFixed(0)}
                    </div>
                    <div className="text-slate-600 mt-1">
                      = {totalPoints} 积分
                      {pkg.bonus_points > 0 && (
                        <span className="text-xs text-green-600 ml-2">
                          (含赠送 {pkg.bonus_points})
                        </span>
                      )}
                    </div>
                    {pkg.bonus_percentage > 0 && (
                      <div className="text-xs text-slate-500 mt-1">
                        额外赠送 {pkg.bonus_percentage}%
                      </div>
                    )}
                  </div>
                  <div className="flex-1" />
                  <button
                    className={`w-full py-3 rounded-xl font-semibold transition-colors mt-4 ${
                      isSelected
                        ? 'btn-primary text-white'
                        : 'border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white'
                    }`}
                  >
                    选择
                  </button>
                </div>
              );
            })}
          </div>

          {/* 自定义金额输入 */}
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 mb-8">
            <h3 className="font-bold text-lg text-[#1E3A5F] mb-4">自定义充值金额</h3>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">¥</span>
                <input
                  type="number"
                  placeholder="输入金额"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  min="1"
                  max="100000"
                />
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-3">
              * 1元 = 10积分，自定义充值不享受额外赠送
            </p>
            {isCustomSelected && customAmount && parseFloat(customAmount) >= 1 && (
              <p className="text-sm text-blue-600 mt-1 font-medium">
                到账积分：{Math.floor(parseFloat(customAmount) * 10)}
              </p>
            )}
          </div>

          {/* 确认支付 / 结果展示 */}
          <div className="max-w-2xl mx-auto">
            {result ? (
              <div className="bg-white rounded-2xl border border-green-200 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#1E3A5F] mb-2">充值成功</h3>
                <div className="text-slate-600 space-y-1 mb-6">
                  <p>订单号：{result.order_no}</p>
                  <p>充值金额：¥{result.pay_amount.toFixed(2)}</p>
                  <p>到账积分：{result.total_points}</p>
                  <p>当前余额：{result.balance} 积分</p>
                </div>
                <button
                  onClick={handleReset}
                  className="btn-primary px-8 py-3 text-white rounded-xl font-semibold"
                >
                  继续充值
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <button
                  onClick={handlePay}
                  disabled={!isValidAmount || loading}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all ${
                    isValidAmount && !loading
                      ? 'btn-primary text-white hover:shadow-2xl'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      处理中...
                    </span>
                  ) : (
                    `立即支付 ¥${payAmount.toFixed(selectedPackage ? 0 : 2)}`
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 安全保障 */}
      <section className="py-16 bg-white section-bg-blobs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-10 text-center">安全保障与服务承诺</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { title: '银行级加密', description: 'SSL 256位加密传输，保障您的支付安全', icon: '🔒' },
              { title: '即时到账', description: '支付成功后，积分即时到账，无需等待', icon: '⚡' },
              { title: '未用可退', description: '7天内未使用余额可申请退款，无后顾之忧', icon: '💰' },
              { title: '专属客服', description: '7x24小时在线客服，随时解答您的疑问', icon: '💬' }
            ].map((item, index) => (
              <div key={index} className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-lg text-[#1E3A5F] mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 常见问题 */}
      <section className="py-16 section-bg-blobs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-10 text-center">常见问题</h2>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border border-slate-200 rounded-xl p-5 bg-white">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-[#1E3A5F]">{item.question}</span>
                  <svg className={`w-5 h-5 text-slate-600 transform transition-transform ${
                    openFaq === index ? 'rotate-180' : ''
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
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
    </div>
  );
}
