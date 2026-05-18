'use client';

const services = [
  {
    id: 1,
    title: '工具个人定制',
    description: '针对您的个性化需求，单独定制改造专属工具，仅您可见。支持微调训练、专属风格、定制输出格式。',
    buttonText: '咨询详情',
    gradient: 'from-[#1E3A5F] to-[#2563EB]',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    ),
  },
  {
    id: 2,
    title: '企业级系统定制',
    description: '完整智能体应用系统开发，深度满足业务场景需求。从需求分析到上线部署，全流程专业服务。',
    buttonText: '获取方案',
    gradient: 'from-[#059669] to-[#10B981]',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
      </svg>
    ),
  },
  {
    id: 3,
    title: '私有化部署',
    description: '数据敏感型企业适用，完整系统部署在您的内网，数据100%留存在本地。支持国产信创环境适配。',
    buttonText: '了解详情',
    gradient: 'from-[#7C3AED] to-[#8B5CF6]',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
      </svg>
    ),
  },
  {
    id: 4,
    title: '系统对接集成',
    description: '对接OA、ERP、邮箱等现有系统，打造自动化工作流。提供标准API接口和专业技术支持团队。',
    buttonText: '联系我们',
    gradient: 'from-[#F59E0B] to-[#F97316]',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
    ),
  },
];

export function EnterpriseServices() {
  return (
    <section id="services" className="py-16 lg:py-20 section-bg-blobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4">需要更多定制化服务？</h2>
          <p className="text-lg text-[#64748B]">我们为你提供专业的企业级解决方案</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {services.map((service) => (
            <div key={service.id} className="service-card card-hover">
              <div className="flex items-start gap-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center flex-shrink-0`}>
                  {service.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">{service.title}</h3>
                  <p className="text-[#64748B] mb-4">{service.description}</p>
                  <button className="px-5 py-2.5 border-2 border-[#1E3A5F] text-[#1E3A5F] rounded-xl font-semibold hover:bg-[#1E3A5F] hover:text-white transition-colors focus-ring">{service.buttonText}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
