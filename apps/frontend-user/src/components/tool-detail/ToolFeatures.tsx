interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

const features: FeatureItem[] = [
  { icon: '🎨', title: 'AI智能生成', description: '基于先进的AI模型，一键生成高质量内容' },
  { icon: '⚡', title: '极速响应', description: '生成速度快，平均等待时间不超过30秒' },
  { icon: '📥', title: '可下载成品', description: '支持多种格式下载，直接用于商业用途' },
  { icon: '🔄', title: '版本迭代', description: '支持基于历史版本继续优化，保留创作痕迹' },
  { icon: '📊', title: '效果预览', description: '实时预览生成效果，满意后再确认下载' },
  { icon: '🛡️', title: '版权无忧', description: '生成内容版权归用户所有，可放心商用' },
];

export function ToolFeatures() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
          核心功能
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="feature-card">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
