'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSendSms = () => {
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
  };

  return (
    <div className="text-white antialiased min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#2563EB]">
      {/* Navigation */}
      <nav className="relative z-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400/60 to-cyan-400/60 border border-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <span className="font-bold text-xl text-white">灵创AI</span>
            </Link>
            <div>
              <Link href="/login" className="text-blue-200 font-medium hover:text-white transition-colors focus:outline-none">
                已有账号？去登录
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-64px)] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-400/5 rounded-full blur-3xl"></div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid-bg" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-bg)"/>
          </svg>
        </div>

        {/* Floating Orbs */}
        <div className="absolute top-40 left-1/4 w-4 h-4 bg-cyan-400/40 rounded-full float-animation shadow-lg shadow-cyan-400/30"></div>
        <div className="absolute top-60 right-1/3 w-3 h-3 bg-blue-400/40 rounded-full float-animation" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 left-1/3 w-5 h-5 bg-white/20 rounded-full float-animation" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-cyan-300/30 rounded-full float-animation" style={{ animationDelay: '0.5s' }}></div>

        <div className="relative z-10 flex min-h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Left Panel - Benefits Section */}
          <div className="hidden lg:flex lg:w-1/2 relative">
            <div className="flex flex-col justify-center py-20 w-full lg:pr-12">
              {/* Headline */}
              <div className="mb-10">
                <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
                  开启您的<br/>
                  <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-200 bg-clip-text text-transparent">
                    AI创作之旅
                  </span>
                </h1>
                <p className="text-blue-200/70 text-lg max-w-sm leading-relaxed">
                  注册即送多重好礼，零成本体验专业AI工具，让创意不再受限
                </p>
              </div>

              {/* Benefit Cards */}
              <div className="space-y-4 mb-10">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400/40 to-blue-600/40 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-white">新用户注册礼包</h3>
                      <p className="text-blue-300 font-semibold text-lg">50 积分免费送</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400/40 to-emerald-600/40 flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-white">实名认证奖励</h3>
                      <p className="text-green-300 font-semibold text-lg">额外 +20 积分</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/40 to-orange-500/40 flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l7-11h-7z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-white">专属新手特权</h3>
                    <p className="text-amber-300 font-semibold text-lg">首单工具 5 折</p>
                  </div>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="pt-8 border-t border-white/10">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">50,000+</div>
                    <div className="text-sm text-blue-200/50">注册用户</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">4.9</div>
                    <div className="text-sm text-blue-200/50">用户评分</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">99.9%</div>
                    <div className="text-sm text-blue-200/50">服务可用性</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Registration Form */}
          <div className="w-full lg:w-1/2 flex items-center lg:justify-end justify-center py-12">
            <div className="w-full max-w-md">
              {/* Mobile Header */}
              <div className="lg:hidden text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">开启您的AI创作之旅</h1>
                <p className="text-blue-200/70">注册即送多重好礼</p>
              </div>

              {/* Glassmorphism Register Card */}
              <div className="bg-white/8 backdrop-blur-2xl rounded-2xl border border-white/15 p-8 shadow-2xl shadow-black/10">
                {/* Desktop Header */}
                <div className="hidden lg:block mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">创建账号</h2>
                  <p className="text-blue-200/60">只需30秒，开启AI创作</p>
                </div>

                <form className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">手机号码</label>
                    <input
                      type="tel"
                      placeholder="请输入手机号码"
                      autoComplete="off"
                      className="w-full h-12 px-4 rounded-xl text-slate-800 placeholder-slate-400 bg-white/90 border border-white/15 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">验证码</label>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="请输入验证码"
                          autoComplete="one-time-code"
                          className="w-full h-12 px-4 rounded-xl text-slate-800 placeholder-slate-400 bg-white/90 border border-white/15 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all duration-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendSms}
                        disabled={countdown > 0}
                        className="shrink-0 w-28 h-12 px-3 rounded-xl font-medium text-sm bg-white/10 border border-white/15 text-blue-200 hover:bg-white/15 hover:text-white transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {countdown > 0 ? `${countdown}s` : '获取验证码'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">设置密码</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="6-20位字母、数字或符号"
                        autoComplete="new-password"
                        className="w-full h-12 px-4 rounded-xl text-slate-800 placeholder-slate-400 bg-white/90 border border-white/15 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all duration-200 pr-12"
                      />
                      <button
                        type="button"
                        onClick={togglePassword}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 focus:outline-none transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-blue-200/40">密码长度6-20位，包含字母和数字</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">确认密码</label>
                    <input
                      type="password"
                      placeholder="请再次输入密码"
                      autoComplete="new-password"
                      className="w-full h-12 px-4 rounded-xl text-slate-800 placeholder-slate-400 bg-white/90 border border-white/15 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">昵称（选填）</label>
                    <input
                      type="text"
                      placeholder="给自己起个好听的名字"
                      autoComplete="off"
                      className="w-full h-12 px-4 rounded-xl text-slate-800 placeholder-slate-400 bg-white/90 border border-white/15 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 mt-0.5 rounded border-white/20 bg-white/8 text-blue-400 focus:ring-blue-400/30 focus:ring-offset-0 focus:outline-none"/>
                    <span className="text-sm text-blue-200/50">
                      我已阅读并同意
                      <Link href="#" className="text-blue-300 hover:text-blue-200 hover:underline">《用户协议》</Link>
                      和
                      <Link href="#" className="text-blue-300 hover:text-blue-200 hover:underline">《隐私政策》</Link>
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="w-full py-3 px-6 text-white font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 shadow-lg shadow-blue-500/25 hover:shadow-blue-400/30 transition-all duration-200 focus:ring-2 focus:ring-blue-400/30 focus:outline-none"
                  >
                    立即注册
                  </button>
                </form>

                {/* Mobile Benefits */}
                <div className="lg:hidden mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-around text-center">
                    <div>
                      <div className="text-lg font-bold text-blue-300">50积分</div>
                      <div className="text-xs text-blue-200/50">注册即送</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-300">+20积分</div>
                      <div className="text-xs text-blue-200/50">认证奖励</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-amber-300">5折</div>
                      <div className="text-xs text-blue-200/50">首单特惠</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 lg:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-blue-200/40 text-sm">© 2024 灵创AI工具箱. 保留所有权利。</p>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .float-animation {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
