'use client';

const stats = [
  { value: '10,000+', label: '注册用户', color: '#1E3A5F' },
  { value: '50,000+', label: '作品产出', color: '#059669' },
  { value: '98%', label: '任务成功率', color: '#2563EB' },
  { value: '4.9', label: '平均评分', color: '#F59E0B' },
];

const testimonials = [
  {
    id: 1,
    name: '张小美的绘本馆',
    role: '绘本创作者',
    avatar: 68,
    rating: 5,
    content: '用AI绘本工具做了一套儿童绘本，质量超出预期，插图精美，配音专业，已经在我的网店销售了！节省了大量时间和成本。',
    tool: 'AI有声绘本生成专家',
  },
  {
    id: 2,
    name: '李明 - 电商卖家',
    role: '淘宝店铺运营',
    avatar: 69,
    rating: 5,
    content: '上新速度提升了10倍！以前做一套详情页要找摄影师、设计师，花几千块。现在10分钟搞定，质量一点不输专业设计。',
    tool: 'AI电商商品详情页生成器',
  },
  {
    id: 3,
    name: '王老师 - 教育博主',
    role: '知识付费创作者',
    avatar: 70,
    rating: 5,
    content: '课程产出效率大大提高！以前做一套有声课程要2周，现在用AI一天搞定，文案+配音+配图全套输出，学员反馈质量非常好。',
    tool: 'AI有声绘本生成专家 + AI文案大师',
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[...Array(rating)].map((_, idx) => (
        <svg
          key={idx}
          className="w-5 h-5 text-[#F59E0B]"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
        </svg>
      ))}
    </div>
  );
}

export function StatsAndTestimonials() {
  return (
    <section id="cases" className="py-16 lg:py-20 bg-white section-bg-blobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4">看看其他用户用灵创AI做出了什么</h2>
          <p className="text-lg text-[#64748B]">已有 10,000+ 用户在灵创AI产出了 50,000+ 个专业作品</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center p-6 bg-[#F8FAFC] rounded-2xl">
              <div className="text-3xl sm:text-4xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[#64748B] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-2xl p-6 border border-[#E4E7EB] card-hover">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={`https://i.pravatar.cc/48?img=${testimonial.avatar}`}
                  className="w-12 h-12 rounded-full"
                  alt="用户头像"
                />
                <div>
                  <div className="font-semibold text-[#1E3A5F]">{testimonial.name}</div>
                  <div className="text-sm text-[#64748B]">{testimonial.role}</div>
                </div>
              </div>
              <StarRating rating={testimonial.rating} />
              <p className="text-[#475569] leading-relaxed mt-4">"{testimonial.content}"</p>
              <div className="mt-4 text-sm text-[#059669] font-medium">使用工具：{testimonial.tool}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
