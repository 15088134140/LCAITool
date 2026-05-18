interface FeatureItem {
  icon: string;
  color: string;
  title: string;
  description: string;
}

interface ScenarioItem {
  icon: string;
  title: string;
  description: string;
}

const features: FeatureItem[] = [
  {
    icon: '⚡',
    color: 'from-blue-500 to-blue-600',
    title: '智能理解需求',
    description: 'AI智能分析您输入的内容，自动理解需求，精准匹配最佳创作方案。',
  },
  {
    icon: '🎨',
    color: 'from-green-500 to-emerald-600',
    title: '批量生成内容',
    description: '一次性生成所有页面内容，保持统一的艺术风格和质量标准，确保整体一致性。',
  },
  {
    icon: '🔊',
    color: 'from-amber-500 to-orange-600',
    title: '专业AI配音',
    description: '多种专业配音音色可选，支持多角色对话配音，自动添加背景音乐和音效。',
  },
  {
    icon: '📄',
    color: 'from-purple-500 to-violet-600',
    title: '完整源文件交付',
    description: '下载包包含高清插图、音频文件、完整提示词文档、可编辑工程模板。',
  },
  {
    icon: '✨',
    color: 'from-pink-500 to-rose-600',
    title: '10+艺术风格',
    description: '水彩、油画、卡通、手绘、扁平、国潮、3D、日系、欧美、复古等多种艺术风格。',
  },
  {
    icon: '⚡',
    color: 'from-cyan-500 to-teal-600',
    title: '高速生成',
    description: '平均2-5分钟完成整本生成，无需漫长等待，创作灵感即时转化为成品。',
  },
];

const scenarios: ScenarioItem[] = [
  { icon: '📚', title: '亲子阅读', description: '定制专属亲子故事' },
  { icon: '🏫', title: '教育机构', description: '制作教学辅助材料' },
  { icon: '💰', title: '商业变现', description: '创作内容出售获利' },
  { icon: '🎁', title: '礼品定制', description: '个性化礼物制作' },
];

export function ToolFeatures() {
  return (
    <section className="pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <span className="text-white text-2xl">🎨</span>
          </div>
          <h2 className="text-3xl font-bold text-brand-dark">功能介绍</h2>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-6 border border-gray-200 transition-all hover:border-blue-500 hover:shadow-lg"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}
              >
                <span className="text-white text-2xl">{feature.icon}</span>
              </div>
              <h3 className="font-semibold text-lg text-brand-dark mb-2">{feature.title}</h3>
              <p className="text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Scenarios */}
        <h3 className="text-xl font-bold text-brand-dark mb-6">适用场景</h3>
        <div className="grid md:grid-cols-4 gap-4">
          {scenarios.map((scenario) => (
            <div
              key={scenario.title}
              className="bg-white rounded-xl p-5 border border-gray-200 text-center"
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center">
                <span className="text-2xl">{scenario.icon}</span>
              </div>
              <h4 className="font-semibold text-brand-dark">{scenario.title}</h4>
              <p className="text-sm text-gray-500 mt-1">{scenario.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
