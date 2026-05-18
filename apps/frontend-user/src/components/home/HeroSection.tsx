export function HeroSection() {

  return (
    <section className="py-16 lg:py-24 section-bg-blobs hero-enhanced">
      <div className="section-glow"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              灵创AI工具箱
              <span className="gradient-text block mt-2">专业场景AI工具集合平台</span>
            </h1>
            <p className="text-lg sm:text-xl text-[#475569] mb-8 leading-relaxed">
              无需AI专业知识，简单几步，获得专业级可商用的完整成果。让每一个创意都能通过AI高效实现。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <a href="/register" className="btn-primary px-8 py-4 text-white font-semibold rounded-xl text-lg focus-ring inline-block text-center">
                立即免费体验
              </a>
              <a href="/tools" className="btn-secondary px-8 py-4 text-[#1E3A5F] font-semibold rounded-xl text-lg focus-ring inline-block text-center">
                浏览全部工具
              </a>
            </div>

            {/* Five Value Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="value-card p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-sm text-[#1E3A5F]">场景深耕</h3>
              </div>
              <div className="value-card p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-green-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-sm text-[#1E3A5F]">成果完整</h3>
              </div>
              <div className="value-card p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-amber-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-sm text-[#1E3A5F]">按量付费</h3>
              </div>
              <div className="value-card p-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-rose-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#E11D48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-sm text-[#1E3A5F]">持续迭代</h3>
              </div>
              <div className="value-card p-4 text-center col-span-2 sm:col-span-1">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-purple-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-sm text-[#1E3A5F]">用户共建</h3>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="hero-image overflow-hidden">
              <img src="/images/hero-banner.png"
                   alt="AI 创作成果展示"
                   className="w-full h-auto object-cover"
                   loading="eager" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-[#E4E7EB]">
              <div className="flex items-center gap-3">
                <div className="avatar-stack flex">
                  <img src="https://i.pravatar.cc/40?img=1" className="w-8 h-8 rounded-full" alt="用户头像" />
                  <img src="https://i.pravatar.cc/40?img=2" className="w-8 h-8 rounded-full" alt="用户头像" />
                  <img src="https://i.pravatar.cc/40?img=3" className="w-8 h-8 rounded-full" alt="用户头像" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#1E3A5F]">10,000+ 活跃用户</div>
                  <div className="text-xs text-[#64748B]">今日新增 328 人</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
