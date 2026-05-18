'use client';

import React, { useState } from 'react';

const OrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">消费明细</h1>
          <p className="text-[#64748B]">查看您的所有充值和消费记录</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-[#E4E7EB] p-6">
            <div className="text-sm text-[#64748B] mb-1">账户余额</div>
            <div className="text-3xl font-bold text-[#1E3A5F]">156</div>
            <div className="text-xs text-[#94A3B8] mt-1">积分</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E7EB] p-6">
            <div className="text-sm text-[#64748B] mb-1">累计充值</div>
            <div className="text-3xl font-bold text-[#059669]">500</div>
            <div className="text-xs text-[#94A3B8] mt-1">积分</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E7EB] p-6">
            <div className="text-sm text-[#64748B] mb-1">累计消费</div>
            <div className="text-3xl font-bold text-[#DC2626]">344</div>
            <div className="text-xs text-[#94A3B8] mt-1">积分</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E4E7EB] p-6">
            <div className="text-sm text-[#64748B] mb-1">本月消费</div>
            <div className="text-3xl font-bold text-[#1E3A5F]">88</div>
            <div className="text-xs text-[#94A3B8] mt-1">积分</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2 bg-white rounded-xl p-2 border border-[#E4E7EB]">
            <button
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''} px-4 py-2 rounded-lg font-medium text-sm focus-ring`}
              onClick={() => setActiveTab('all')}
            >
              全部
            </button>
            <button
              className={`tab-btn ${activeTab === 'recharge' ? 'active' : ''} px-4 py-2 rounded-lg font-medium text-sm text-[#64748B] focus-ring`}
              onClick={() => setActiveTab('recharge')}
            >
              充值
            </button>
            <button
              className={`tab-btn ${activeTab === 'expense' ? 'active' : ''} px-4 py-2 rounded-lg font-medium text-sm text-[#64748B] focus-ring`}
              onClick={() => setActiveTab('expense')}
            >
              消费
            </button>
            <button
              className={`tab-btn ${activeTab === 'refund' ? 'active' : ''} px-4 py-2 rounded-lg font-medium text-sm text-[#64748B] focus-ring`}
              onClick={() => setActiveTab('refund')}
            >
              退款
            </button>
          </div>
          <div className="flex items-center gap-3">
            <select className="px-4 py-2 bg-white border border-[#E4E7EB] rounded-lg text-sm text-[#64748B] focus-ring">
              <option>全部时间</option>
              <option>今天</option>
              <option>最近7天</option>
              <option>最近30天</option>
              <option>本月</option>
              <option>上月</option>
              <option>自定义</option>
            </select>
            <button className="btn-primary px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2 focus-ring">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              导出Excel
            </button>
          </div>
        </div>

        {/* Order List */}
        <div className="bg-white rounded-2xl border border-[#E4E7EB] overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-6 gap-4 px-6 py-4 bg-[#F8FAFC] border-b border-[#E4E7EB] text-sm font-medium text-[#64748B]">
            <div>订单时间</div>
            <div>订单类型</div>
            <div>详情</div>
            <div>金额</div>
            <div>状态</div>
            <div>操作</div>
          </div>

          {/* Order Items */}
          <div className="divide-y divide-[#E4E7EB]">
            {/* Order Item 1 */}
            <div className="px-6 py-4">
              <div className="md:hidden space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">2024-01-15 14:32:18</span>
                  <span className="px-2 py-1 rounded text-xs font-medium status-success">成功</span>
                </div>
                <div className="font-medium text-[#1E3A5F]">AI有声绘本生成专家</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">消费</span>
                  <span className="font-semibold type-expense">- 12 积分</span>
                </div>
                <button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button>
              </div>
              <div className="hidden md:grid grid-cols-6 gap-4 items-center">
                <div className="text-sm text-[#64748B]">2024-01-15 14:32:18</div>
                <div><span className="px-2 py-1 bg-red-50 text-[#DC2626] rounded text-xs font-medium">消费</span></div>
                <div className="font-medium text-[#1E3A5F]">AI有声绘本生成专家</div>
                <div className="font-semibold type-expense">- 12 积分</div>
                <div><span className="px-2 py-1 rounded text-xs font-medium status-success">成功</span></div>
                <div><button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button></div>
              </div>
            </div>

            {/* Order Item 2 */}
            <div className="px-6 py-4">
              <div className="md:hidden space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">2024-01-15 10:15:42</span>
                  <span className="px-2 py-1 rounded text-xs font-medium status-success">成功</span>
                </div>
                <div className="font-medium text-[#1E3A5F]">微信充值</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">充值</span>
                  <span className="font-semibold type-income">+ 100 积分</span>
                </div>
                <button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button>
              </div>
              <div className="hidden md:grid grid-cols-6 gap-4 items-center">
                <div className="text-sm text-[#64748B]">2024-01-15 10:15:42</div>
                <div><span className="px-2 py-1 bg-green-50 text-[#059669] rounded text-xs font-medium">充值</span></div>
                <div className="font-medium text-[#1E3A5F]">微信充值</div>
                <div className="font-semibold type-income">+ 100 积分</div>
                <div><span className="px-2 py-1 rounded text-xs font-medium status-success">成功</span></div>
                <div><button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button></div>
              </div>
            </div>

            {/* Order Item 3 */}
            <div className="px-6 py-4">
              <div className="md:hidden space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">2024-01-14 18:45:33</span>
                  <span className="px-2 py-1 rounded text-xs font-medium status-success">成功</span>
                </div>
                <div className="font-medium text-[#1E3A5F]">AI电商商品详情页生成器</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">消费</span>
                  <span className="font-semibold type-expense">- 18 积分</span>
                </div>
                <button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button>
              </div>
              <div className="hidden md:grid grid-cols-6 gap-4 items-center">
                <div className="text-sm text-[#64748B]">2024-01-14 18:45:33</div>
                <div><span className="px-2 py-1 bg-red-50 text-[#DC2626] rounded text-xs font-medium">消费</span></div>
                <div className="font-medium text-[#1E3A5F]">AI电商商品详情页生成器</div>
                <div className="font-semibold type-expense">- 18 积分</div>
                <div><span className="px-2 py-1 rounded text-xs font-medium status-success">成功</span></div>
                <div><button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button></div>
              </div>
            </div>

            {/* Order Item 4 */}
            <div className="px-6 py-4">
              <div className="md:hidden space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">2024-01-14 09:22:15</span>
                  <span className="px-2 py-1 rounded text-xs font-medium status-success">成功</span>
                </div>
                <div className="font-medium text-[#1E3A5F]">每日签到奖励</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">奖励</span>
                  <span className="font-semibold type-income">+ 1 积分</span>
                </div>
                <button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button>
              </div>
              <div className="hidden md:grid grid-cols-6 gap-4 items-center">
                <div className="text-sm text-[#64748B]">2024-01-14 09:22:15</div>
                <div><span className="px-2 py-1 bg-purple-50 text-[#7C3AED] rounded text-xs font-medium">奖励</span></div>
                <div className="font-medium text-[#1E3A5F]">每日签到奖励</div>
                <div className="font-semibold type-income">+ 1 积分</div>
                <div><span className="px-2 py-1 rounded text-xs font-medium status-success">成功</span></div>
                <div><button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button></div>
              </div>
            </div>

            {/* Order Item 5 */}
            <div className="px-6 py-4">
              <div className="md:hidden space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">2024-01-13 16:08:47</span>
                  <span className="px-2 py-1 rounded text-xs font-medium status-pending">处理中</span>
                </div>
                <div className="font-medium text-[#1E3A5F]">AI营销文案生成器</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">消费</span>
                  <span className="font-semibold type-expense">- 5 积分</span>
                </div>
                <button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button>
              </div>
              <div className="hidden md:grid grid-cols-6 gap-4 items-center">
                <div className="text-sm text-[#64748B]">2024-01-13 16:08:47</div>
                <div><span className="px-2 py-1 bg-red-50 text-[#DC2626] rounded text-xs font-medium">消费</span></div>
                <div className="font-medium text-[#1E3A5F]">AI营销文案生成器</div>
                <div className="font-semibold type-expense">- 5 积分</div>
                <div><span className="px-2 py-1 rounded text-xs font-medium status-pending">处理中</span></div>
                <div><button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button></div>
              </div>
            </div>

            {/* Order Item 6 */}
            <div className="px-6 py-4">
              <div className="md:hidden space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">2024-01-12 11:30:22</span>
                  <span className="px-2 py-1 rounded text-xs font-medium status-success">成功</span>
                </div>
                <div className="font-medium text-[#1E3A5F]">实名认证奖励</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">奖励</span>
                  <span className="font-semibold type-income">+ 20 积分</span>
                </div>
                <button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button>
              </div>
              <div className="hidden md:grid grid-cols-6 gap-4 items-center">
                <div className="text-sm text-[#64748B]">2024-01-12 11:30:22</div>
                <div><span className="px-2 py-1 bg-purple-50 text-[#7C3AED] rounded text-xs font-medium">奖励</span></div>
                <div className="font-medium text-[#1E3A5F]">实名认证奖励</div>
                <div className="font-semibold type-income">+ 20 积分</div>
                <div><span className="px-2 py-1 rounded text-xs font-medium status-success">成功</span></div>
                <div><button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button></div>
              </div>
            </div>

            {/* Order Item 7 */}
            <div className="px-6 py-4">
              <div className="md:hidden space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">2024-01-11 20:15:33</span>
                  <span className="px-2 py-1 rounded text-xs font-medium status-failed">失败</span>
                </div>
                <div className="font-medium text-[#1E3A5F]">AI头像生成器</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#64748B]">消费</span>
                  <span className="font-semibold type-income">+ 6 积分（退款）</span>
                </div>
                <button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button>
              </div>
              <div className="hidden md:grid grid-cols-6 gap-4 items-center">
                <div className="text-sm text-[#64748B]">2024-01-11 20:15:33</div>
                <div><span className="px-2 py-1 bg-blue-50 text-[#2563EB] rounded text-xs font-medium">退款</span></div>
                <div className="font-medium text-[#1E3A5F]">AI头像生成器（生成失败退款）</div>
                <div className="font-semibold type-income">+ 6 积分</div>
                <div><span className="px-2 py-1 rounded text-xs font-medium status-failed">失败</span></div>
                <div><button className="text-sm text-[#2563EB] hover:underline focus-ring rounded">查看详情</button></div>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <div className="px-6 py-6 border-t border-[#E4E7EB]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-[#64748B]">
                共 <span className="font-medium text-[#1E3A5F]">42</span> 条记录，第 <span className="font-medium text-[#1E3A5F]">1</span>/<span className="font-medium text-[#1E3A5F]">6</span> 页
              </div>
              <div className="flex items-center gap-2">
                <button className="w-9 h-9 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors disabled:opacity-50 focus-ring" disabled>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>
                <button className="w-9 h-9 rounded-lg bg-[#2563EB] text-white font-medium text-sm focus-ring">1</button>
                <button className="w-9 h-9 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors text-sm focus-ring">2</button>
                <button className="w-9 h-9 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors text-sm focus-ring">3</button>
                <span className="text-[#94A3B8]">...</span>
                <button className="w-9 h-9 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors text-sm focus-ring">6</button>
                <button className="w-9 h-9 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;