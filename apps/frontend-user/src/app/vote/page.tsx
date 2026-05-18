'use client';

import { useState } from 'react';

const votingTools = [
  {
    id: 1,
    title: 'AI视频脚本生成器',
    category: '内容创作',
    categoryColor: 'green',
    description: '自动生成短视频、宣传片、广告片专业脚本。支持多种风格、时长、平台定制，包含分镜建议和配乐推荐。',
    votes: 328,
    goal: 500,
    percentage: 66,
    avatars: [1, 2, 3, 4, 5],
  },
  {
    id: 2,
    title: 'AI播客节目生成器',
    category: '视频音频',
    categoryColor: 'blue',
    description: '输入主题，自动生成对话稿+多角色配音+背景音乐。支持访谈、故事、知识分享等多种播客类型。',
    votes: 256,
    goal: 500,
    percentage: 51,
    avatars: [10, 11, 12],
  },
  {
    id: 3,
    title: 'AI简历优化大师',
    category: '办公效率',
    categoryColor: 'purple',
    description: '智能分析简历，优化内容描述、排版格式，针对不同岗位定制优化，提供面试问题预测和回答建议。',
    votes: 189,
    goal: 500,
    percentage: 38,
    avatars: [20, 21],
  },
  {
    id: 4,
    title: 'AI菜谱创意生成',
    category: '内容创作',
    categoryColor: 'amber',
    description: '输入可用食材，智能生成创意菜谱，附带详细步骤、营养分析和高清美食图片，支持家常/餐厅等风格。',
    votes: 156,
    goal: 500,
    percentage: 31,
    avatars: [30, 31],
  },
  {
    id: 5,
    title: 'AI旅行规划助手',
    category: '办公效率',
    categoryColor: 'teal',
    description: '一键生成个性化旅行攻略，包含行程安排、预算规划、景点推荐、交通住宿建议，可导出详细PDF。',
    votes: 142,
    goal: 500,
    percentage: 28,
    avatars: [40, 41],
  },
  {
    id: 6,
    title: 'AI表情包制作器',
    category: '设计工具',
    categoryColor: 'rose',
    description: '输入文字或上传图片，一键生成定制表情包。支持多种风格，自动添加文字效果和热门梗。',
    votes: 98,
    goal: 500,
    percentage: 20,
    avatars: [50],
  },
];

const categoryColors: Record<string, { bg: string; text: string; fill: string }> = {
  green: { bg: 'bg-green-100', text: 'text-[#059669]', fill: 'progress-fill' },
  blue: { bg: 'bg-blue-100', text: 'text-[#2563EB]', fill: 'progress-fill-2' },
  purple: { bg: 'bg-purple-100', text: 'text-[#7C3AED]', fill: 'progress-fill-3' },
  amber: { bg: 'bg-amber-100', text: 'text-[#D97706]', fill: 'progress-fill' },
  teal: { bg: 'bg-teal-100', text: 'text-[#0D9488]', fill: 'progress-fill-2' },
  rose: { bg: 'bg-rose-100', text: 'text-[#E11D48]', fill: 'progress-fill-3' },
};

export default function VotePage() {
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [votedIds, setVotedIds] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);

  const handleVote = (id: number) => {
    if (!votedIds.includes(id)) {
      setVotedIds([...votedIds, id]);
    }
  };

  const categories = ['全部', '内容创作', '设计工具', '视频音频', '办公效率'];

  return (
    <>
      {/* Hero Section */}
      <section className="py-16 lg:py-24 section-bg-blobs bg-gradient-to-br from-[#1E3A5F] to-[#2563EB]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">参与产品共建</h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            你的声音决定开发优先级！投票支持你想要的工具，或提交你的创意，共同打造最实用的AI工具箱。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <button
              onClick={() => setShowModal(true)}
              className="px-8 py-4 bg-white text-[#1E3A5F] rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-xl focus-ring"
            >
              💡 提交我的创意
            </button>
            <button className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors focus-ring">
              查看我的投票 ({votedIds.length})
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-white">32</div>
              <div className="text-blue-200 text-sm">构思中工具</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">8,542</div>
              <div className="text-blue-200 text-sm">累计投票数</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">15</div>
              <div className="text-blue-200 text-sm">已上线工具</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 border-b border-[#E4E7EB] bg-white section-bg-blobs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#64748B] font-medium">分类：</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-ring ${
                    selectedCategory === cat
                      ? 'bg-[#1E3A5F] text-white'
                      : 'text-[#64748B] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#64748B] font-medium">排序：</span>
              <select className="px-4 py-2 border border-[#E4E7EB] rounded-lg text-sm focus-ring">
                <option>票数最高</option>
                <option>最新发布</option>
                <option>即将达成</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Voting Cards Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-8 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#059669]"></span>
            热门构思工具
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {votingTools.map((tool) => {
              const colors = categoryColors[tool.categoryColor];
              const hasVoted = votedIds.includes(tool.id);

              return (
                <div
                  key={tool.id}
                  className="card-hover bg-white rounded-2xl border border-[#E4E7EB] p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-bold text-xl text-[#1E3A5F]">{tool.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors?.bg || 'bg-blue-100'} ${colors?.text || 'text-[#2563EB]'}`}>
                      {tool.category}
                    </span>
                  </div>
                  <p className="text-[#64748B] mb-4 leading-relaxed">{tool.description}</p>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-[#1E3A5F]">{tool.votes} / {tool.goal} 票</span>
                      <span className={`font-semibold ${colors?.text || 'text-[#2563EB]'}`}>{tool.percentage}%</span>
                    </div>
                    <div className="progress-bar h-2.5">
                      <div
                        className={colors?.fill || 'progress-fill-2'}
                        style={{ width: `${tool.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="avatar-stack flex items-center">
                      {tool.avatars.map((avatar, i) => (
                        <img
                          key={i}
                          src={`https://i.pravatar.cc/32?img=${avatar}`}
                          className="w-8 h-8 rounded-full border-2 border-white"
                          alt="投票用户"
                          style={{ marginLeft: i > 0 ? '-10px' : '0' }}
                        />
                      ))}
                      <span
                        className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-xs text-[#64748B]"
                        style={{ marginLeft: '-10px' }}
                      >
                        +{tool.votes - tool.avatars.length}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleVote(tool.id)}
                    disabled={hasVoted}
                    className={`w-full py-3 rounded-xl font-semibold transition-colors focus-ring ${
                      hasVoted
                        ? 'bg-[#059669] text-white cursor-default'
                        : 'bg-[#1E3A5F] text-white hover:bg-[#2563EB]'
                    }`}
                  >
                    {hasVoted ? '✓ 已投票' : '为它投票'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Submit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#1E3A5F]">提交您的创意</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center focus-ring"
              >
                ✕
              </button>
            </div>
            <form className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#1E3A5F] mb-2">工具名称</label>
                <input
                  type="text"
                  placeholder="例如：AIXX生成器"
                  className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E3A5F] mb-2">工具描述</label>
                <textarea
                  rows={4}
                  placeholder="简单描述这个工具的功能和用途..."
                  className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E3A5F] mb-2">您的联系方式</label>
                <input
                  type="text"
                  placeholder="手机号或邮箱（选填，用于通知采纳结果）"
                  className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  alert('提交成功！感谢您的参与！');
                }}
                className="btn-primary w-full py-3 text-white rounded-xl font-semibold focus-ring"
              >
                提交创意
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
