'use client';

interface Demo {
  title?: string;
  description?: string;
  image?: string;
}

interface ToolDemosProps {
  demos?: Demo[];
}

export function ToolDemos({ demos }: ToolDemosProps) {
  const defaultDemos: Demo[] = [
    {
      title: '精美绘本示例1',
      description: 'AI生成的高质量儿童绘本，包含多页精美插图',
      image: '/images/tool-illustration.png',
    },
    {
      title: '精美绘本示例2',
      description: '不同艺术风格的AI绘本作品展示',
      image: '/images/tool-education.png',
    },
    {
      title: '精美绘本示例3',
      description: '专业配音的有声绘本示例',
      image: '/images/tool-content.png',
    },
    {
      title: '精美绘本示例4',
      description: '完整的可下载源文件包展示',
      image: '/images/tool-illustration.png',
    },
  ];

  const displayDemos = demos?.length ? demos : defaultDemos;

  return (
    <section>
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
          <span className="text-white text-2xl">🎨</span>
        </div>
        <h2 className="text-3xl font-bold text-[#1E3A5F]">成品效果展示</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {displayDemos.map((demo, index) => (
          <div
            key={index}
            className="gallery-img bg-white rounded-2xl p-6 border border-[#E4E7EB]"
          >
            <div className="aspect-[4/3] rounded-xl overflow-hidden mb-4">
              <img
                src={demo.image || `https://picsum.photos/600/450?random=${index}`}
                alt={demo.title || `示例${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-semibold text-lg text-[#1E3A5F] mb-2">
              {demo.title || `精美作品示例${index + 1}`}
            </h3>
            <p className="text-[#64748B]">
              {demo.description || 'AI生成的高质量专业作品'}
            </p>
          </div>
        ))}
      </div>

      <div className="text-center mt-10">
        <button className="px-6 py-3 border-2 border-[#1E3A5F] text-[#1E3A5F] rounded-xl font-semibold hover:bg-[#1E3A5F] hover:text-white transition-colors focus-ring">
          查看更多示例 →
        </button>
      </div>
    </section>
  );
}
