'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { authApi } from '@/lib/api';

export default function SecurityPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('password');

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Phone change form state
  const [phoneForm, setPhoneForm] = useState({
    new_phone: '',
    code: '',
  });
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPhoneForm(prev => ({ ...prev, [name]: value }));
  };

  const sendSmsCode = async () => {
    if (!phoneForm.new_phone) {
      setErrorMessage('请输入新手机号');
      return;
    }

    try {
      await authApi.sendSmsCode(phoneForm.new_phone);
      setCountdown(60);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setSuccessMessage('验证码已发送');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || '发送失败');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setErrorMessage('两次输入的密码不一致');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      setErrorMessage('密码长度至少6位');
      return;
    }

    setPasswordLoading(true);
    try {
      await authApi.changePassword(passwordForm.old_password, passwordForm.new_password);
      setSuccessMessage('密码修改成功！');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || '密码修改失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!phoneForm.new_phone || !phoneForm.code) {
      setErrorMessage('请填写完整信息');
      return;
    }

    setPhoneLoading(true);
    try {
      await authApi.changePhone(phoneForm.new_phone, phoneForm.code);
      setSuccessMessage('手机号修改成功！');
      setPhoneForm({ new_phone: '', code: '' });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || '手机号修改失败');
    } finally {
      setPhoneLoading(false);
    }
  };

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
              <h1 className="text-xl font-bold text-gray-900">账号安全</h1>
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

        {/* Tabs */}
        <div className="flex gap-4 mb-6 bg-white p-2 rounded-xl border border-gray-200">
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
              activeTab === 'password'
                ? 'bg-[#1E3A5F] text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            修改密码
          </button>
          <button
            onClick={() => setActiveTab('phone')}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all ${
              activeTab === 'phone'
                ? 'bg-[#1E3A5F] text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            更换手机号
          </button>
        </div>

        {/* Password Form */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">修改密码</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
                <input
                  type="password"
                  name="old_password"
                  value={passwordForm.old_password}
                  onChange={handlePasswordChange}
                  placeholder="请输入当前密码"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                <input
                  type="password"
                  name="new_password"
                  value={passwordForm.new_password}
                  onChange={handlePasswordChange}
                  placeholder="请输入新密码（至少6位）"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwordForm.confirm_password}
                  onChange={handlePasswordChange}
                  placeholder="请再次输入新密码"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-3 bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordLoading ? '修改中...' : '确认修改密码'}
                </button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">密码安全建议：</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>密码长度至少6位，建议包含大小写字母和数字</li>
                    <li>不要使用与其他网站相同的密码</li>
                    <li>定期更换密码，提高账户安全性</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phone Change Form */}
        {activeTab === 'phone' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">更换手机号</h2>

            {/* Current Phone Display */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">当前绑定手机号</p>
                  <p className="font-semibold text-gray-900">{user?.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') || '未绑定'}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">新手机号</label>
                <input
                  type="tel"
                  name="new_phone"
                  value={phoneForm.new_phone}
                  onChange={handlePhoneChange}
                  placeholder="请输入新手机号"
                  maxLength={11}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">验证码</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    name="code"
                    value={phoneForm.code}
                    onChange={handlePhoneChange}
                    placeholder="请输入验证码"
                    maxLength={6}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={sendSmsCode}
                    disabled={countdown > 0}
                    className={`px-6 py-3 rounded-xl font-medium transition-all ${
                      countdown > 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-[#1E3A5F] text-white hover:bg-[#2563EB]'
                    }`}
                  >
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={phoneLoading}
                  className="w-full py-3 bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {phoneLoading ? '更换中...' : '确认更换手机号'}
                </button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-yellow-50 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <div className="text-sm text-yellow-700">
                  <p className="font-medium mb-1">温馨提示：</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>更换手机号需要验证新手机号的所有权</li>
                    <li>验证码有效期为5分钟，请尽快填写</li>
                    <li>更换成功后，下次登录请使用新手机号</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login Devices Section - Coming Soon */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">登录设备管理</h3>
                <p className="text-sm text-gray-500">查看和管理您的登录设备</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
              即将上线
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
