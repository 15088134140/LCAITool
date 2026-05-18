'use client';

const voteTools = [
  {
    id: 1,
    name: 'AI视频脚本生成器',
    description: '自动生成短视频、宣传片、广告片专业脚本',
    votes: 328,
    target: 500,
    percentage: 66,
    avatars: [10, 11, 12, 13],
  },
  {
    id: 2,
    name: 'AI播客节目生成器',
    description: '输入主题，自动生成对话稿+配音+背景音乐',
    votes: 256,
    target: 500,
    percentage: 51,
    avatars: [20, 21, 22],
  },
  {
    id: 3,
    name: 'AI简历优化大师',
    description: '智能分析简历，优化内容+排版，提高通过率',
    votes: 189,
    target: 500,
    percentage: 38,
    avatars: [30, 31],
  },
  {
    id: 4,
    name: 'AI菜谱创意生成',
    description: '输入可用食材，智能生成创意菜谱+步骤图',
    votes: 156,
    target: 500,
    percentage: 31,
    avatars: [40, 41],
  },
  {
    id: 5,
    name: 'AI旅行规划助手',
    description: '一键生成个性化旅行攻略+预算+行程表',
    votes: 142,
    target: 500,
    percentage: 28,
    avatars: [50, 51],
  },
  {
    id: 6,
    name: 'AI表情包制作器',
    description: '输入文字或上传图片，生成定制表情包',
    votes: 98,
    target: 500,
    percentage: 20,
    avatars: [60],
  },
];

export function VoteSection() {
  return (
    <section id="vote" className="py-16 lg:py-20 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] section-bg-blobs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">参与产品共建 · 投票你期待的工具</h2>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">你的声音决定开发优先级，高票工具优先安排开发，采纳创意获得积分奖励</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {voteTools.map((tool) => (
            <div key={tool.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-2">{tool.name}</h3>
              <p className="text-blue-100 text-sm mb-4">{tool.description}</p>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-blue-100 mb-2">
                  <span>{tool.votes} / {tool.target} 票</span>
                  <span>{tool.percentage}%</span>
                </div>
                <div className="progress-bar bg-white/20">
                  <div className="progress-fill" style={{ width: `${tool.percentage}%` }}></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="avatar-stack flex">
                  {tool.avatars.map((avatar, idx) => (
                    <img
                      key={idx}
                      src={`https://i.pravatar.cc/32?img=${avatar}`}
                      className="w-6 h-6 rounded-full"
                      alt="投票用户"
                    />
                  ))}
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs text-white ml-[-8px]">+</span>
                </div>
                <a href="/vote" className="px-4 py-2 bg-white text-[#1E3A5F] rounded-lg font-semibold hover:bg-blue-50 transition-colors focus-ring inline-block text-center">投票</a>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10 space-x-4">
          <button className="px-6 py-3 border border-white/30 text-white rounded-xl font-medium hover:bg-white/10 transition-colors focus-ring">查看全部 30+ 构思工具 →</button>
          <button className="px-6 py-3 bg-white text-[#1E3A5F] rounded-xl font-semibold hover:bg-blue-50 transition-colors focus-ring">💡 提交我的工具创意</button>
        </div>
      </div>
    </section>
  );
}
