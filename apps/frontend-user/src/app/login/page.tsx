'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showWeChatModal, setShowWeChatModal] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [modalState, setModalState] = useState<'qr' | 'scanning' | 'success'>('qr');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  // If already authenticated, redirect to user center
  if (isAuthenticated) {
    router.push('/user-center');
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call login API
      const tokens = await authApi.login(formData.username, formData.password);

      // Fetch current user info using the new token
      const user = await authApi.getCurrentUser(tokens.access_token);

      login(tokens, user as any);
      router.push('/user-center');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  // Password visibility toggle
  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  // WeChat login modal handlers
  const openWeChatLogin = () => {
    setShowWeChatModal(true);
    setModalState('qr');
    setCountdown(60);
    startCountdown();
    simulateScan();
  };

  const closeWeChatLogin = () => {
    setShowWeChatModal(false);
  };

  const startCountdown = () => {
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

  const refreshQRCode = () => {
    setCountdown(60);
    startCountdown();
  };

  const simulateScan = () => {
    setTimeout(() => {
      setModalState('scanning');
      setTimeout(() => {
        closeWeChatLogin();
        setError('微信登录功能暂未开放，请使用账号密码登录');
      }, 2000);
    }, 3000);
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
              <Link href="/register" className="text-blue-200 font-medium hover:text-white transition-colors focus:outline-none">
                没有账号？去注册
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
          {/* Left Panel - Hero Section */}
          <div className="hidden lg:flex lg:w-1/2 relative">
            <div className="flex flex-col justify-center py-20 w-full lg:pr-12">
              {/* Logo & Brand */}
              <div className="mb-16">
                <div className="flex items-center gap-4 mb-8">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400/60 to-cyan-400/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <span className="text-white font-bold text-2xl">AI</span>
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl opacity-20 blur-md"></div>
                  </div>
                  <span className="text-white font-bold text-2xl tracking-tight">灵创AI</span>
                </div>

                <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
                  释放创意<br/>
                  <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-200 bg-clip-text text-transparent">
                    赋能每一个灵感
                  </span>
                </h1>
                <p className="text-blue-200/70 text-lg max-w-sm leading-relaxed">
                  借助AI的力量，让创作变得简单而有趣。从绘本到插画，一键实现你的创意想法。
                </p>
              </div>

              {/* Feature List */}
              <div className="space-y-6 mb-16">
                <div className="flex items-center gap-5 group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all duration-300">
                    <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-lg">智能AI绘画</h3>
                    <p className="text-blue-300/50 text-sm">专业级插图作品，多风格选择</p>
                  </div>
                </div>

                <div className="flex items-center gap-5 group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all duration-300">
                    <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-lg">有声绘本生成</h3>
                    <p className="text-blue-300/50 text-sm">文字到绘本的全智能创作流程</p>
                  </div>
                </div>

                <div className="flex items-center gap-5 group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all duration-300">
                    <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-lg">专业语音合成</h3>
                    <p className="text-blue-300/50 text-sm">多音色AI配音，自然流畅</p>
                  </div>
                </div>
              </div>

              {/* Stats with Separator */}
              <div className="flex items-center gap-10 pt-8 border-t border-white/10">
                <div>
                  <div className="text-3xl font-bold text-white">50<span className="text-blue-300">万+</span></div>
                  <div className="text-blue-300/50 text-sm mt-1">活跃用户</div>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div>
                  <div className="text-3xl font-bold text-white">200<span className="text-cyan-300">万+</span></div>
                  <div className="text-blue-300/50 text-sm mt-1">作品生成</div>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div>
                  <div className="text-3xl font-bold text-white">99.9<span className="text-blue-300">%</span></div>
                  <div className="text-blue-300/50 text-sm mt-1">服务可用</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Login Form */}
          <div className="w-full lg:w-1/2 flex items-center lg:justify-end justify-center py-12">
            <div className="w-full max-w-md">
              {/* Mobile Header */}
              <div className="lg:hidden text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">AI</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">欢迎回来</h1>
                <p className="text-blue-200/70">登录您的灵创AI账号，继续创作之旅</p>
              </div>

              {/* Glassmorphism Login Card */}
              <div className="bg-white/8 backdrop-blur-2xl rounded-3xl border border-white/15 p-8 shadow-2xl shadow-black/10">
                {/* Desktop Header */}
                <div className="hidden lg:block text-center mb-8">
                  <h1 className="text-2xl font-bold text-white mb-2">欢迎回来</h1>
                  <p className="text-blue-200/60">登录您的灵创AI账号，继续创作之旅</p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {error}
                    </div>
                  </div>
                )}

                {/* Social Login */}
                <div className="space-y-3 mb-8">
                  <button
                    onClick={openWeChatLogin}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-white bg-white/10 border border-white/15 hover:bg-white/15 hover:border-white/25 transition-all duration-200 focus:ring-2 focus:ring-white/20 focus:outline-none"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z"/>
                    </svg>
                    使用微信登录
                  </button>
                  <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-white bg-white/10 border border-white/15 hover:bg-white/15 hover:border-white/25 transition-all duration-200 focus:ring-2 focus:ring-white/20 focus:outline-none">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.63 10.92c.01-.15.02-.3.02-.46 0-4.47-3.58-8.1-8-8.1-3.75 0-6.92 2.56-7.76 6.06 3.4.44 6.36 1.77 8.66 3.7.28-.03.56-.05.85-.05 2.43 0 4.61.83 6.23 2.21v-.36z"/>
                    </svg>
                    使用 QQ 登录
                  </button>
                </div>

                {/* Divider */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/15"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 text-blue-200/60 bg-transparent">或使用账号密码登录</span>
                  </div>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">手机号 / 邮箱</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="请输入手机号或邮箱"
                      autoComplete="username"
                      className="w-full px-4 py-3 rounded-xl text-slate-800 placeholder-slate-400 bg-white/90 border border-white/15 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">密码</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="请输入密码"
                        autoComplete="current-password"
                        className="w-full px-4 py-3 rounded-xl text-slate-800 placeholder-slate-400 bg-white/90 border border-white/15 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 focus:outline-none transition-all duration-200 pr-12"
                      />
                      <button
                        type="button"
                        onClick={togglePassword}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 focus:outline-none transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/8 text-blue-400 focus:ring-blue-400/30 focus:ring-offset-0 focus:outline-none"/>
                      <span className="text-sm text-blue-200/60">记住我</span>
                    </label>
                    <Link href="#" className="text-sm text-blue-300 hover:text-blue-200 font-medium transition-colors focus:outline-none">
                      忘记密码？
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 text-white font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 focus:ring-2 focus:ring-blue-400/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        登录中...
                      </span>
                    ) : '登录'}
                  </button>
                </form>

                {/* Agreement */}
                <p className="mt-6 text-center text-xs text-blue-200/40">
                  登录即表示您同意
                  <Link href="#" className="text-blue-300 hover:text-blue-200 hover:underline">用户协议</Link>
                  和
                  <Link href="#" className="text-blue-300 hover:text-blue-200 hover:underline">隐私政策</Link>
                </p>
              </div>

              {/* Register CTA */}
              <div className="mt-8 text-center">
                <p className="text-blue-200/60">
                  还没有账号？
                  <Link href="/register" className="text-blue-300 font-semibold hover:text-blue-200 transition-colors focus:outline-none">立即注册</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* WeChat Login Modal */}
      {showWeChatModal && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={closeWeChatLogin}></div>

          {/* Modal Content */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/15 max-w-sm w-full overflow-hidden shadow-2xl shadow-black/20">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-6 py-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z"/>
                    </svg>
                    <h3 className="text-white font-bold text-lg">微信扫码登录</h3>
                  </div>
                  <button
                    onClick={closeWeChatLogin}
                    className="text-white/60 hover:text-white transition-colors focus:outline-none rounded-full p-1"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* QR Code Section */}
              {modalState === 'qr' && (
                <div className="p-8 text-center">
                  {/* QR Code Container */}
                  <div className="relative inline-block mb-6">
                    <div className="w-48 h-48 bg-white/90 rounded-xl p-3 relative overflow-hidden">
                      {/* Simulated QR Code Pattern */}
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        <rect fill="#fff" width="200" height="200"/>
                        <g fill="#0F172A">
                          <rect x="10" y="10" width="50" height="50" fill="#fff" stroke="#0F172A" strokeWidth="4"/>
                          <rect x="20" y="20" width="30" height="30"/>
                          <rect x="28" y="28" width="14" height="14" fill="#fff"/>
                          <rect x="140" y="10" width="50" height="50" fill="#fff" stroke="#0F172A" strokeWidth="4"/>
                          <rect x="150" y="20" width="30" height="30"/>
                          <rect x="158" y="28" width="14" height="14" fill="#fff"/>
                          <rect x="10" y="140" width="50" height="50" fill="#fff" stroke="#0F172A" strokeWidth="4"/>
                          <rect x="20" y="150" width="30" height="30"/>
                          <rect x="28" y="158" width="14" height="14" fill="#fff"/>
                        </g>
                        <g fill="#0F172A">
                          <rect x="80" y="10" width="10" height="10"/>
                          <rect x="100" y="10" width="10" height="10"/>
                          <rect x="80" y="30" width="10" height="10"/>
                          <rect x="110" y="80" width="10" height="10"/>
                          <rect x="130" y="80" width="10" height="10"/>
                          <rect x="110" y="100" width="10" height="10"/>
                          <rect x="130" y="100" width="10" height="10"/>
                          <rect x="80" y="110" width="10" height="10"/>
                          <rect x="80" y="130" width="10" height="10"/>
                          <rect x="100" y="130" width="10" height="10"/>
                          <rect x="140" y="140" width="10" height="10"/>
                          <rect x="160" y="140" width="10" height="10"/>
                          <rect x="140" y="160" width="10" height="10"/>
                          <rect x="80" y="160" width="10" height="10"/>
                          <rect x="100" y="160" width="10" height="10"/>
                        </g>
                        <rect x="85" y="85" width="30" height="30" fill="#0F172A" rx="4"/>
                        <text x="100" y="105" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#10B981">AI</text>
                      </svg>
                      <div className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent qr-scan-line"></div>
                    </div>
                    <div className="absolute inset-0 border-2 border-green-400/30 rounded-xl pulse-ring"></div>
                  </div>

                  <p className="text-white font-medium mb-2">请使用微信扫描二维码登录</p>
                  <p className="text-blue-200/50 text-sm">扫码后请在手机上确认登录</p>

                  {/* Expire Countdown */}
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-center gap-2 text-sm text-blue-200/50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span>二维码将在 <span className="text-green-400 font-semibold">{countdown}</span> 秒后过期</span>
                    </div>
                    <button
                      onClick={refreshQRCode}
                      className="mt-3 text-blue-300 text-sm hover:text-blue-200 font-medium transition-colors focus:outline-none"
                    >
                      刷新二维码
                    </button>
                  </div>
                </div>
              )}

              {/* Scanning Success State */}
              {modalState === 'scanning' && (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 border border-green-400/30">
                    <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <h4 className="text-white font-bold text-lg mb-2">扫码成功！</h4>
                  <p className="text-blue-200/50">请在手机上确认登录</p>
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              )}

              {/* Logged In State */}
              {modalState === 'success' && (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <h4 className="text-white font-bold text-lg mb-2">登录成功！</h4>
                  <p className="text-blue-200/50 mb-6">欢迎回来，即将跳转到首页...</p>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full animate-[progress_2s_ease-in-out]" style={{ width: '100%' }}></div>
                  </div>
                </div>
              )}

              {/* Footer Tips */}
              <div className="bg-white/5 px-6 py-4 border-t border-white/10">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-200/40 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div className="text-xs text-blue-200/40">
                    <p className="font-medium text-blue-200/60 mb-1">温馨提示：</p>
                    <p>• 请使用微信App扫码，不支持微信电脑版扫码</p>
                    <p>• 如扫码失败，请点击刷新二维码重试</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
        @keyframes qr-scan-line {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes progress {
          from { width: 0; }
          to { width: 100%; }
        }
        .qr-scan-line {
          animation: qr-scan-line 2s linear infinite;
        }
        .pulse-ring {
          animation: pulse-ring 1.5s ease-out infinite;
        }
        .float-animation {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
