interface Step {
  step: number;
  color: string;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    step: 1,
    color: 'from-blue-500 to-blue-600',
    title: '填写信息',
    description: '输入主题或粘贴内容，选择艺术风格、音色、页数等参数。',
  },
  {
    step: 2,
    color: 'from-green-500 to-emerald-600',
    title: '智能生成',
    description: 'AI自动创作内容，生成全部插图，制作专业配音，添加背景音乐和音效。',
  },
  {
    step: 3,
    color: 'from-purple-500 to-violet-600',
    title: '下载交付',
    description: '预览生成效果，可在线试听观看，一键打包下载所有源文件。',
  },
];

const progressSteps = [
  { title: '故事内容创作', progress: 100 },
  { title: '插图生成 (10/10)', progress: 100 },
  { title: '配音合成', progress: 100 },
];

export function ToolHowTo() {
  return (
    <section className="pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <span className="text-white text-2xl">📋</span>
          </div>
          <h2 className="text-3xl font-bold text-brand-dark">三步完成创作</h2>
        </div>

        {/* Step Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step) => (
            <div
              key={step.step}
              className="bg-white rounded-2xl p-8 border border-gray-200 text-center"
            >
              <div
                className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-2xl font-bold`}
              >
                {step.step}
              </div>
              <h3 className="font-semibold text-xl text-brand-dark mb-3">{step.title}</h3>
              <p className="text-gray-500">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Progress Example */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <h3 className="font-semibold text-xl text-brand-dark mb-6">生成进度示例</h3>
          <div className="space-y-6">
            {progressSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#059669]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-[#1E3A5F]">{step.title}</span>
                    <span className="text-sm text-[#059669]">{step.progress}%</span>
                  </div>
                  <div className="h-2 bg-[#E4E7EB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#059669] rounded-full"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
