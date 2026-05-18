'use client';

export function CTASection() {
  return (
    <section className="py-16 lg:py-20 bg-gradient-to-br from-[#059669] to-[#0D9488] section-bg-blobs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">开始你的AI创作之旅</h2>
        <p className="text-xl text-green-100 mb-10">注册即送体验积分，零成本体验完整AI工具能力</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/register"
            className="px-8 py-4 bg-white text-[#059669] rounded-xl font-bold text-lg hover:bg-green-50 transition-colors focus-ring shadow-xl inline-block text-center"
          >
            立即免费体验
          </a>
          <a
            href="/pricing"
            className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors focus-ring inline-block text-center"
          >
            查看工具定价
          </a>
        </div>
      </div>
    </section>
  );
}
