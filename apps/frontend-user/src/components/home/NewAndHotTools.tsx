'use client';

export function NewAndHotTools() {
  const newTools = [
    {
      name: "AI社交媒体配图",
      description: "一键生成小红书、抖音、微博全套配图",
      usage: "128",
      price: 6,
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2"></path>
        </svg>
      ),
      gradient: "from-indigo-500 to-purple-600"
    },
    {
      name: "AI智能PPT生成器",
      description: "输入主题，自动生成完整PPT框架和内容",
      usage: "89",
      price: 10,
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
        </svg>
      ),
      gradient: "from-orange-500 to-red-500"
    },
    {
      name: "AI思维导图助手",
      description: "自动梳理思路，生成专业思维导图",
      usage: "56",
      price: 4,
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
      ),
      gradient: "from-teal-500 to-cyan-600"
    }
  ];

  const hotTools = [
    {
      rank: 1,
      name: "AI营销文案大师",
      rating: 4.9,
      usage: "1,234",
      color: "#EF4444"
    },
    {
      rank: 2,
      name: "AI有声绘本生成专家",
      rating: 4.8,
      usage: "987",
      color: "#F59E0B"
    },
    {
      rank: 3,
      name: "AI电商商品详情页生成器",
      rating: 4.9,
      usage: "756",
      color: "#059669"
    },
    {
      rank: 4,
      name: "AI头像生成器",
      rating: 4.7,
      usage: "623",
      color: "#64748B"
    },
    {
      rank: 5,
      name: "AI海报设计器",
      rating: 4.8,
      usage: "512",
      color: "#64748B"
    }
  ];

  return (
    <section className="py-16 lg:py-20 bg-white section-bg-blobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* New Tools */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <span className="new-badge text-sm px-3 py-1">NEW</span>
              <h2 className="text-2xl font-bold text-[#1E3A5F]">新品上架</h2>
            </div>
            <div className="space-y-4">
              {newTools.map((tool, index) => (
                <a
                  key={index}
                  href="/tools"
                  className="p-5 border border-[#E4E7EB] rounded-xl hover:border-[#2563EB] transition-colors block"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center flex-shrink-0`}>
                        {tool.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#1E3A5F]">{tool.name}</h3>
                        <p className="text-sm text-[#64748B] mt-1">{tool.description}</p>
                        <p className="text-xs text-[#059669] font-medium mt-2">今日已有 {tool.usage} 人使用</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#059669]">{tool.price} 积分</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Hot Tools */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <span className="hot-badge text-sm px-3 py-1">HOT</span>
              <h2 className="text-2xl font-bold text-[#1E3A5F]">热门工具</h2>
            </div>
            <div className="space-y-4">
              {hotTools.map((tool, index) => (
                <a
                  key={index}
                  href="/tools"
                  className="p-5 border border-[#E4E7EB] rounded-xl hover:border-[#2563EB] transition-colors block"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold" style={{ color: tool.color }}>#{tool.rank}</span>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                      <span className="text-sm font-medium">{tool.rating}</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-[#1E3A5F]">{tool.name}</h3>
                  <p className="text-sm text-[#64748B] mt-1">本周 {tool.usage} 次使用</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
