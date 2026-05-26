'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { userApi } from '@/lib/api';
import { API_BASE_URL } from '@/lib/api/client';

export default function VerificationPage() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [verifyBonus, setVerifyBonus] = useState(50);

  useEffect(() => {
    fetch(`${API_BASE_URL}/public/config?keys=verify_bonus_points`)
      .then(res => res.json())
      .then(data => {
        if (data && data.verify_bonus_points != null) {
          setVerifyBonus(Number(data.verify_bonus_points));
        }
      })
      .catch(() => {});
  }, []);

  const [formData, setFormData] = useState({
    real_name: '',
    id_card: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateIdCard = (idCard: string): boolean => {
    // Basic validation for Chinese ID card
    const regex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    return regex.test(idCard);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.real_name.trim()) {
      setErrorMessage('请输入真实姓名');
      return;
    }

    if (formData.real_name.length < 2) {
      setErrorMessage('姓名至少需要2个字符');
      return;
    }

    if (!formData.id_card.trim()) {
      setErrorMessage('请输入身份证号');
      return;
    }

    if (!validateIdCard(formData.id_card)) {
      setErrorMessage('身份证号格式不正确');
      return;
    }

    setLoading(true);
    try {
      const res = await userApi.submitRealNameVerification({
        real_name: formData.real_name,
        id_card_number: formData.id_card,
      });
      updateUser({ id_card_verified: true, real_name: formData.real_name, ...(res.id_card_number ? { id_card_number: res.id_card_number } : {}) });
      setSuccessMessage('实名认证提交成功！');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || '认证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // If already verified, show success state
  if (user?.id_card_verified) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/user-center" className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </Link>
                <h1 className="text-xl font-bold text-gray-900">实名认证</h1>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">已完成实名认证</h2>
            <p className="text-gray-500 mb-8">您的账号已通过实名认证，可使用全部功能</p>

            {/* Verified Info Card */}
            <div className="max-w-md mx-auto bg-gray-50 rounded-xl p-6 text-left">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">真实姓名</span>
                  <span className="font-medium text-gray-900">{user.real_name || formData.real_name || '已认证'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">身份证号</span>
                  <span className="font-medium text-gray-900 font-mono">
                    {user.id_card_number || ''}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">认证状态</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    已认证
                  </span>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">{verifyBonus}积分奖励</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">更高安全等级</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">全部功能</p>
              </div>
            </div>

            <Link
              href="/user-center"
              className="inline-block mt-8 px-8 py-3 bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
            >
              返回个人中心
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/user-center" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">实名认证</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
              </svg>
              {successMessage}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Benefits Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">为什么需要实名认证？</h3>
              <p className="text-sm text-gray-600">
                根据国家相关法律法规要求，网络服务使用者需进行实名认证。完成认证后，您将获得 {verifyBonus} 积分奖励，并解锁全部工具功能。
              </p>
            </div>
          </div>
        </div>

        {/* Verification Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">填写身份信息</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Real Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                真实姓名
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="real_name"
                value={formData.real_name}
                onChange={handleInputChange}
                placeholder="请输入身份证上的真实姓名"
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all"
              />
              <p className="mt-1 text-xs text-gray-500">请输入与身份证一致的真实姓名</p>
            </div>

            {/* ID Card */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                身份证号
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="id_card"
                value={formData.id_card}
                onChange={handleInputChange}
                placeholder="请输入18位身份证号码"
                maxLength={18}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all font-mono"
              />
              <p className="mt-1 text-xs text-gray-500">请输入18位有效身份证号码</p>
            </div>

            {/* Privacy Notice */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-700 mb-1">隐私保护承诺</p>
                  <p>您的身份信息仅用于实名认证验证，我们将严格保护您的个人信息安全，采用加密存储，不会将您的信息用于任何其他用途。</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    认证中...
                  </span>
                ) : '提交认证'}
              </button>
            </div>
          </form>
        </div>

        {/* FAQ Section */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">常见问题</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 text-sm mb-1">Q: 认证失败怎么办？</h4>
              <p className="text-sm text-gray-600">A: 请检查姓名和身份证号是否输入正确，确保与身份证信息一致。如多次失败，请联系客服处理。</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm mb-1">Q: 一个身份证可以认证几个账号？</h4>
              <p className="text-sm text-gray-600">A: 一个身份证仅可认证一个账号，且认证后无法解绑，请谨慎操作。</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm mb-1">Q: 实名认证需要多长时间审核通过？</h4>
              <p className="text-sm text-gray-600">A: 系统将自动核验您的身份信息，通常在提交后即时完成认证。</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
