'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { feedbackApi } from '@/lib/api/modules/feedback';

const typeMapping: Record<string, string> = {
  '功能建议': 'feature',
  'Bug反馈': 'bug',
  '使用咨询': 'consult',
  '其他': 'other',
};

const faqItems = [
  {
    question: '如何获取积分？积分有什么用？',
    answer: `您可以通过以下方式获取积分：
• 充值购买：1元 = 10积分
• 新用户注册：赠送50积分
• 实名认证：额外赠送50积分
• 每日签到：1-5积分不等
• 邀请好友：双方各得10积分
• 提交反馈被采纳：20-100积分

积分可用于调用平台上的所有AI工具，不同工具消耗的积分数不同。`,
  },
  {
    question: '生成的成果可以用于商业用途吗？',
    answer: '是的，您通过灵创AI生成的所有成果（包括图片、文案、音频、视频等）都拥有完整的商用版权。您可以自由用于个人或商业项目，无需额外付费或标注来源。',
  },
  {
    question: '生成失败会扣费吗？如何申请退款？',
    answer: '如果生成过程中出现失败、超时或效果严重不符合预期的情况，系统将自动全额退款，积分会即时返还到您的账户。如果您对生成结果不满意，可以在24小时内通过"我的成果"页面申请退款，我们会在1-2个工作日内审核处理。',
  },
  {
    question: '为什么需要实名认证？不认证可以使用吗？',
    answer: '根据国家相关法律法规，使用生成式AI服务需要完成实名认证。这既是合规要求，也是为了防止滥用，保障所有用户的使用体验。未认证用户可以浏览工具详情、查看演示案例，但无法实际调用工具生成成果。完成认证还可获得50积分奖励。',
  },
  {
    question: '生成的成果会保存多久？可以重新下载吗？',
    answer: '您的所有生成成果将永久保存在"我的成果"中，可以随时查看、下载或基于现有成果进行迭代优化。我们承诺不会删除用户的任何成果数据。',
  },
  {
    question: '如何提交工具建议？有什么奖励？',
    answer: '您可以在"用户共创"页面提交您想要的工具想法。我们会定期评估用户的建议，优先开发高票需求。如果您的工具建议被采纳并上线，将获得200积分奖励，并在工具页面标注您为"创意贡献者"。',
  },
];

const feedbackTypes = [
  { label: '功能建议', icon: '💡' },
  { label: 'Bug反馈', icon: '🐛' },
  { label: '使用咨询', icon: '❓' },
  { label: '其他', icon: '📝' },
];

export default function FeedbackPage() {
  const [activeTab, setActiveTab] = useState('faq');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    title: '',
    description: '',
    contact: '',
  });

  const handleSubmit = async () => {
    if (!selectedType) {
      toast.warning('请选择反馈类型');
      return;
    }
    if (!formData.title.trim()) {
      toast.warning('请输入反馈标题');
      return;
    }
    try {
      const apiType = typeMapping[selectedType] || 'other';
      await feedbackApi.create({
        type: apiType,
        title: formData.title.trim(),
        description: formData.description.trim() || '',
        contact: formData.contact.trim() || '',
      });
      toast.success('提交成功！我们会尽快处理您的反馈。');
      setFormData({ name: '', email: '', title: '', description: '', contact: '' });
      setSelectedType('');
    } catch (error) {
      toast.error('提交失败，请稍后重试');
    }
  };

  return (
    <>
      {/* Header Section */}
      <section className="bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-3">帮助与反馈</h1>
            <p className="text-blue-200 text-lg">有问题？我们随时为您解答</p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 bg-white rounded-xl p-2 border border-[#E4E7EB]">
            <button
              onClick={() => setActiveTab('faq')}
              className={`tab-btn flex-1 py-3 px-4 rounded-lg font-medium focus-ring ${
                activeTab === 'faq' ? 'active text-white' : 'text-[#64748B]'
              }`}
            >
              常见问题
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`tab-btn flex-1 py-3 px-4 rounded-lg font-medium focus-ring ${
                activeTab === 'feedback' ? 'active text-white' : 'text-[#64748B]'
              }`}
            >
              提交反馈
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`tab-btn flex-1 py-3 px-4 rounded-lg font-medium focus-ring ${
                activeTab === 'contact' ? 'active text-white' : 'text-[#64748B]'
              }`}
            >
              联系客服
            </button>
          </div>

          {/* FAQ Tab */}
          {activeTab === 'faq' && (
            <div>
              {/* Search FAQ */}
              <div className="mb-8">
                <div className="relative">
                  <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="搜索问题关键词..."
                    className="input-field w-full pl-12 pr-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
                  />
                </div>
              </div>

              {/* FAQ Categories */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium focus-ring">
                  全部问题
                </button>
                {['账号相关', '充值支付', '工具使用', '成果下载'].map((cat) => (
                  <button
                    key={cat}
                    className="px-4 py-2 bg-white border border-[#E4E7EB] text-[#64748B] rounded-lg text-sm font-medium hover:border-[#2563EB] transition-colors focus-ring"
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* FAQ List */}
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <div
                    key={index}
                    className={`faq-item bg-white rounded-xl overflow-hidden ${
                      activeFaq === index ? 'active' : ''
                    }`}
                  >
                    <button
                      onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left focus-ring"
                    >
                      <span className="font-semibold text-[#1E3A5F]">{item.question}</span>
                      <svg
                        className={`faq-icon w-5 h-5 text-[#64748B] ${
                          activeFaq === index ? 'rotate-180' : ''
                        } transition-transform duration-300`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    <div
                      className={`faq-content transition-all duration-300 ${
                        activeFaq === index ? 'max-h-96 pb-5' : 'max-h-0'
                      } overflow-hidden`}
                    >
                      <div className="px-6 text-[#64748B] whitespace-pre-line">
                        {item.answer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <div className="bg-white rounded-2xl border border-[#E4E7EB] p-8">
              <h2 className="text-xl font-bold text-[#1E3A5F] mb-6">提交您的反馈</h2>

              {/* Feedback Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#1E3A5F] mb-3">
                  反馈类型
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {feedbackTypes.map((type) => (
                    <button
                      key={type.label}
                      onClick={() => setSelectedType(type.label)}
                      className={`p-4 rounded-xl border-2 text-center transition-all focus-ring ${
                        selectedType === type.label
                          ? 'border-[#2563EB] bg-blue-50'
                          : 'border-[#E4E7EB] hover:border-[#2563EB]'
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.icon}</div>
                      <div className="text-sm font-medium text-[#1E3A5F]">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <form className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                      您的姓名
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="请输入姓名"
                      className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                      联系邮箱
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="请输入邮箱"
                      className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                    反馈标题
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="请简要描述您的问题或建议"
                    className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                    详细描述
                  </label>
                  <textarea
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="请详细描述您的问题或建议，如有相关截图也可以描述一下..."
                    className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                    联系电话（选填）
                  </label>
                  <input
                    type="tel"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="方便我们联系您了解详情"
                    className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn-primary w-full py-4 text-white rounded-xl font-semibold focus-ring"
                >
                  提交反馈
                </button>
              </form>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="bg-white rounded-2xl border border-[#E4E7EB] p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-[#1E3A5F] mb-4">在线客服</h3>
              <p className="text-[#64748B] mb-6 max-w-md mx-auto">
                我们的客服团队随时为您解答使用中遇到的任何问题，工作时间内一般5分钟内响应
              </p>
              <div className="space-y-4 text-sm text-[#64748B] mb-8">
                <p>🕐 工作时间：周一至周日 9:00 - 21:00</p>
                <p>📧 邮件支持：support@lingchuang.ai</p>
                <p>💬 官方微信：灵创AI助手</p>
              </div>
              <button className="btn-primary px-8 py-3 text-white rounded-xl font-semibold focus-ring">
                打开在线客服
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
