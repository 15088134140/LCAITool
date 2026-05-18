'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function VerificationPage() {
  const [isVerified, setIsVerified] = useState(false);

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen">
      {/* Navigation */}
      <nav className="bg-white border-b border-[#E4E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <span className="font-bold text-xl text-[#1E3A5F]">灵创AI</span>
            </Link>
            <div>
              <Link href="/user-center" className="text-[#2563EB] font-medium hover:text-[#1E3A5F] transition-colors focus-ring rounded">
                返回个人中心
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Section */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-[#1E3A5F] mb-3">实名认证</h1>
            <p className="text-[#64748B]">根据国家相关法律法规，使用AI生成服务需要完成实名认证</p>
          </div>

          {/* Benefits Card */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-[#065F46] text-lg">认证即送 20 积分</h3>
                <p className="text-[#047857]">完成实名认证后，积分将自动发放到您的账户</p>
              </div>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-10">
            <div className="flex items-center">
              <div className={`step-indicator ${isVerified ? 'completed' : 'active'} w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm`}>1</div>
              <div className={`step-line ${isVerified ? 'completed' : ''} w-16 h-1 mx-2 bg-[#E4E7EB] rounded`}></div>
              <div className={`step-indicator ${isVerified ? 'active' : ''} w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-[#94A3B8] bg-[#E4E7EB]`}>{isVerified ? '2' : '2'}</div>
              <div className={`step-line w-16 h-1 mx-2 bg-[#E4E7EB] rounded`}></div>
              <div className="step-indicator w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-[#94A3B8] bg-[#E4E7EB]">3</div>
            </div>
          </div>
          <div className="flex justify-center text-sm text-[#64748B] mb-10">
            <span className="w-24 text-center">填写信息</span>
            <span className="w-24 text-center mx-8">上传证件</span>
            <span className="w-24 text-center">完成认证</span>
          </div>

          {/* Verification Form */}
          <div className="bg-white rounded-2xl border border-[#E4E7EB] p-8">
            {isVerified ? (
              // Verified State
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">实名认证成功</h2>
                <p className="text-[#64748B] mb-8">恭喜您已完成实名认证，现在可以使用所有AI工具功能</p>

                <div className="bg-gray-50 rounded-xl p-6 text-left">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[#64748B]">认证状态</span>
                    <span className="px-3 py-1 bg-green-100 text-[#059669] rounded-full text-sm font-medium">已认证</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[#64748B]">认证时间</span>
                    <span className="text-[#1E3A5F]">2024年5月18日 14:30</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[#64748B]">真实姓名</span>
                    <span className="text-[#1E3A5F]">张**</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#64748B]">身份证号</span>
                    <span className="text-[#1E3A5F]">110***********1234</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsVerified(false)}
                  className="mt-8 text-[#2563EB] hover:text-[#1E3A5F] font-medium transition-colors"
                >
                  修改认证信息
                </button>
              </div>
            ) : (
              // Verification Form
              <form className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                    真实姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入您的真实姓名"
                    className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
                  />
                </div>

                {/* ID Number */}
                <div>
                  <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                    身份证号码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入18位身份证号码"
                    className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
                    maxLength={18}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                    手机号码 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="tel"
                      placeholder="请输入手机号"
                      className="input-field flex-1 px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
                      maxLength={11}
                    />
                    <button
                      type="button"
                      className="px-5 py-3 bg-[#F1F5F9] text-[#2563EB] rounded-xl font-medium hover:bg-[#E2E8F0] transition-colors whitespace-nowrap focus-ring"
                    >
                      获取验证码
                    </button>
                  </div>
                </div>

                {/* Verification Code */}
                <div>
                  <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                    短信验证码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入6位验证码"
                    className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
                    maxLength={6}
                  />
                </div>

                {/* ID Upload */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                      身份证人像面 <span className="text-red-500">*</span>
                    </label>
                    <div className="upload-area rounded-xl p-6 text-center cursor-pointer focus-ring">
                      <svg className="w-10 h-10 mx-auto text-[#94A3B8] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <p className="text-sm text-[#64748B]">点击上传人像面照片</p>
                      <p className="text-xs text-[#94A3B8] mt-1">支持 JPG、PNG，最大 5MB</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                      身份证国徽面 <span className="text-red-500">*</span>
                    </label>
                    <div className="upload-area rounded-xl p-6 text-center cursor-pointer focus-ring">
                      <svg className="w-10 h-10 mx-auto text-[#94A3B8] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <p className="text-sm text-[#64748B]">点击上传国徽面照片</p>
                      <p className="text-xs text-[#94A3B8] mt-1">支持 JPG、PNG，最大 5MB</p>
                    </div>
                  </div>
                </div>

                {/* Agreement */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 mt-0.5 rounded border-[#E4E7EB] text-[#2563EB] focus:ring-[#2563EB] focus:ring-offset-0"/>
                  <span className="text-sm text-[#64748B]">
                    我已阅读并同意
                    <Link href="#" className="text-[#2563EB] hover:underline">《实名认证服务协议》</Link>
                    和
                    <Link href="#" className="text-[#2563EB] hover:underline">《用户信息授权书》</Link>
                  </span>
                </label>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={() => setIsVerified(true)}
                  className="btn-primary w-full py-3 px-6 text-white font-semibold rounded-xl focus-ring"
                >
                  提交认证
                </button>
              </form>
            )}
          </div>

          {/* Security Tips */}
          <div className="mt-8 bg-white rounded-2xl border border-[#E4E7EB] p-6">
            <h3 className="font-bold text-[#1E3A5F] mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              安全保障
            </h3>
            <ul className="space-y-3 text-sm text-[#64748B]">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#059669] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span>您的身份信息将通过 AES-256 加密存储，严格保密</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#059669] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span>身份信息仅用于实名认证，绝不会用于其他用途</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#059669] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span>认证审核通常在 1-5 分钟内完成，最长不超过 24 小时</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#059669] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span>如遇问题，请联系客服：400-123-4567</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <span className="font-bold text-xl">灵创AI工具箱</span>
            </div>
            <p className="text-blue-200 text-sm">© 2024 灵创AI. 保留所有权利。</p>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx>{`
        .step-indicator.active { background: #2563EB; color: white; }
        .step-indicator.completed { background: #059669; color: white; }
        .step-line.completed { background: #059669; }
        .upload-area { border: 2px dashed #E4E7EB; transition: all 0.2s ease; }
        .upload-area:hover { border-color: #2563EB; background: #F0F7FF; }
        .input-field { transition: all 0.2s ease; border: 1px solid #E4E7EB; }
        .input-field:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
      `}</style>
    </div>
  );
}
