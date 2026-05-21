'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { paymentApi } from '@/lib/api/modules/payment';
import { RechargePackageCard } from '@/components/payment/RechargePackageCard';
import type { RechargePackage, Order } from '@/lib/api/types';

// Mock data for MVP - in real app this would come from API
const MOCK_PACKAGES: RechargePackage[] = [
  {
    id: '1',
    name: '入门套餐',
    description: '适合初次体验',
    original_price: 30,
    sale_price: 30,
    base_points: 300,
    bonus_points: 20,
    bonus_percentage: 6.67,
    is_popular: false,
    sort_order: 1,
    is_active: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    id: '2',
    name: '进阶套餐',
    description: '最受欢迎选择',
    original_price: 120,
    sale_price: 100,
    base_points: 1000,
    bonus_points: 100,
    bonus_percentage: 10,
    is_popular: true,
    sort_order: 2,
    is_active: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    id: '3',
    name: '专业套餐',
    description: '深度用户首选',
    original_price: 380,
    sale_price: 300,
    base_points: 3000,
    bonus_points: 400,
    bonus_percentage: 13.33,
    is_popular: false,
    sort_order: 3,
    is_active: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    id: '4',
    name: '企业套餐',
    description: '团队/企业使用',
    original_price: 1280,
    sale_price: 1000,
    base_points: 10000,
    bonus_points: 2000,
    bonus_percentage: 20,
    is_popular: false,
    sort_order: 4,
    is_active: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
];

// Payment result page component
const PaymentResultPage: React.FC<{
  order: Order | null;
  isSuccess: boolean;
  onBack: () => void;
}> = ({ order, isSuccess, onBack }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navigation */}
      <nav className="bg-white border-b border-[#E4E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center">
                  <span className="text-white font-bold text-lg">AI</span>
                </div>
                <span className="font-bold text-xl text-[#1E3A5F]">灵创AI</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Result content */}
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-[#E4E7EB] p-8 text-center shadow-sm">
          {isSuccess ? (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">充值成功</h1>
              <p className="text-[#64748B] mb-6">您的积分已到账</p>
              {order && (
                <div className="bg-[#F8FAFC] rounded-xl p-4 mb-6 text-left">
                  <div className="flex justify-between mb-2">
                    <span className="text-[#64748B]">订单号</span>
                    <span className="font-medium text-[#1E3A5F]">{order.order_no}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[#64748B]">支付金额</span>
                    <span className="font-bold text-[#059669]">¥{order.pay_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">到账积分</span>
                    <span className="font-bold text-[#1E3A5F]">{order.total_points} 积分</span>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={onBack}
                  className="flex-1 py-3 border border-[#E4E7EB] text-[#1E3A5F] rounded-xl font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  继续充值
                </button>
                <Link
                  href="/user-center/points"
                  className="flex-1 py-3 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-xl font-medium shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all"
                >
                  查看积分
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#DC2626] to-[#EF4444] flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">充值失败</h1>
              <p className="text-[#64748B] mb-8">请稍后重试或联系客服</p>
              <div className="flex gap-3">
                <Link
                  href="/"
                  className="flex-1 py-3 border border-[#E4E7EB] text-[#1E3A5F] rounded-xl font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  返回首页
                </Link>
                <button
                  onClick={onBack}
                  className="flex-1 py-3 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-xl font-medium shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all"
                >
                  重新支付
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Main payment page component
const PaymentPage: React.FC = () => {
  const router = useRouter();
  const { user, refreshUserBalance } = useUserStore();

  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    isSuccess: boolean;
    order: Order | null;
  }>({ isSuccess: false, order: null });

  // Load packages
  useEffect(() => {
    const loadPackages = async () => {
      try {
        const data = await paymentApi.getRechargePackages();
        setPackages(data);
        if (data.length > 0) {
          const popular = data.find(p => p.is_popular) || data[0];
          setSelectedPackage(popular);
        }
      } catch (error) {
        console.error('Failed to load packages:', error);
        setPackages(MOCK_PACKAGES);
        const popular = MOCK_PACKAGES.find(p => p.is_popular) || MOCK_PACKAGES[0];
        setSelectedPackage(popular);
      }
    };
    loadPackages();
  }, []);

  // Handle payment
  const handlePayment = async () => {
    if (!selectedPackage) return;

    setIsLoading(true);
    try {
      // Create order
      const response = await paymentApi.createOrder({
        package_id: selectedPackage.id,
        payment_provider: 'simulated',
      });

      // Simulate payment for MVP
      const paidOrder = await paymentApi.simulatePayment(response.order.id);

      // Refresh user balance
      await refreshUserBalance();

      // Show success result
      setPaymentResult({ isSuccess: true, order: paidOrder });
      setShowResult(true);
    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentResult({ isSuccess: false, order: null });
      setShowResult(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset payment flow
  const handleResetPayment = () => {
    setShowResult(false);
    setPaymentResult({ isSuccess: false, order: null });
  };

  // Show result page if payment completed
  if (showResult) {
    return (
      <PaymentResultPage
        isSuccess={paymentResult.isSuccess}
        order={paymentResult.order}
        onBack={handleResetPayment}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] page-bg-animated">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E4E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center">
                  <span className="text-white font-bold text-lg">AI</span>
                </div>
                <span className="font-bold text-xl text-[#1E3A5F]">灵创AI</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/user-center"
                className="text-[#64748B] hover:text-[#1E3A5F] font-medium transition-colors"
              >
                个人中心
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Test environment banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 text-sm text-amber-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>模拟支付测试环境 - 点击支付即视为成功，不会真实扣款</span>
          </div>
        </div>
      </div>

      {/* Hero section */}
      <section className="gradient-bg py-16 lg:py-20 section-bg-blobs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">简单透明的定价</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            按次付费，无订阅压力。充值即享额外积分赠送，用多少充多少，灵活方便。
          </p>

          {/* Current balance */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto">
            <div className="text-blue-100 text-sm mb-2">当前积分余额</div>
            <div className="text-5xl font-bold text-white mb-4">{user?.balance || 0}</div>
            <Link
              href="/user-center/points"
              className="inline-flex items-center gap-2 text-blue-100 hover:text-white transition-colors"
            >
              <span>查看积分明细</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Package selection */}
      <section className="py-16 section-bg-blobs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1E3A5F] mb-3 text-center">选择充值套餐</h2>
          <p className="text-[#64748B] text-center mb-12">所有套餐积分永久有效，无过期时间</p>

          {/* Package grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {packages.map((pkg) => (
              <RechargePackageCard
                key={pkg.id}
                pkg={pkg}
                isSelected={selectedPackage?.id === pkg.id}
                onSelect={setSelectedPackage}
              />
            ))}
          </div>

          {/* Payment button */}
          <div className="max-w-md mx-auto">
            <button
              onClick={handlePayment}
              disabled={isLoading || !selectedPackage}
              className="w-full py-4 bg-gradient-to-r from-[#059669] to-[#10B981] text-white text-lg font-semibold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  处理中...
                </span>
              ) : selectedPackage ? (
                `立即支付 ¥${selectedPackage.sale_price.toFixed(2)}`
              ) : (
                '请选择套餐'
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Security and guarantee */}
      <section className="py-16 bg-white section-bg-blobs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-10 text-center">安全保障与服务承诺</h2>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg text-[#1E3A5F] mb-2">银行级加密</h3>
              <p className="text-[#64748B] text-sm">SSL 256位加密传输，保障您的支付安全</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg text-[#1E3A5F] mb-2">即时到账</h3>
              <p className="text-[#64748B] text-sm">支付成功后，积分即时到账，无需等待</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg text-[#1E3A5F] mb-2">未用可退</h3>
              <p className="text-[#64748B] text-sm">7天内未使用余额可申请退款，无后顾之忧</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg text-[#1E3A5F] mb-2">专属客服</h3>
              <p className="text-[#64748B] text-sm">7x24小时在线客服，随时解答您的疑问</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 section-bg-blobs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-10 text-center">常见问题</h2>

          <div className="space-y-4">
            <div className="bg-white border border-[#E4E7EB] rounded-xl p-5">
              <h3 className="font-semibold text-[#1E3A5F] mb-2">积分有有效期吗？</h3>
              <p className="text-[#64748B]">积分永久有效，无过期时间。您可以根据使用需求灵活充值，用多少充多少。</p>
            </div>

            <div className="bg-white border border-[#E4E7EB] rounded-xl p-5">
              <h3 className="font-semibold text-[#1E3A5F] mb-2">充值后可以开发票吗？</h3>
              <p className="text-[#64748B]">可以。充值成功后可在个人中心申请开具发票，支持增值税普通发票和专用发票。</p>
            </div>

            <div className="bg-white border border-[#E4E7EB] rounded-xl p-5">
              <h3 className="font-semibold text-[#1E3A5F] mb-2">可以申请退款吗？</h3>
              <p className="text-[#64748B]">充值后7天内，如未使用任何积分，可申请全额退款。已使用部分按实际消费结算。</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-blue-200 text-sm">
            © 2024 灵创AI工具箱. 保留所有权利。
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PaymentPage;
