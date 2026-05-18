interface Step {
  step: number;
  title: string;
  description: string;
}

const steps: Step[] = [
  { step: 1, title: '填写参数', description: '根据提示填写生成所需的各项参数' },
  { step: 2, title: '确认费用', description: '系统自动计算费用，确认后开始生成' },
  { step: 3, title: '下载成果', description: '生成完成后即可下载使用' },
];

export function ToolHowTo() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
          使用步骤
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.step} className="relative">
              {/* 连接线 */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-gray-200 to-gray-200" />
              )}

              <div className="step-card text-center relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-brand-dark to-brand-light rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
