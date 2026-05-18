'use client';

import React, { useState } from 'react';

const UserCenter: React.FC = () => {
  const [activeNav, setActiveNav] = useState('overview');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sticky top-24">
            {/* User Info */}
            <div className="text-center mb-6 pb-6 border-b border-[#E2E8F0]">
              <img
                src="https://i.pravatar.cc/80?img=68"
                className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-[#E2E8F0]"
                alt="用户头像"
              />
              <h3 className="font-bold text-lg text-[#1E3A5F]">张小明</h3>
              <span className="badge badge-success">已认证</span>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-[#059669]">156</span>
                <span className="text-sm text-[#64748B]">积分余额</span>
              </div>
              <button className="btn-primary w-full mt-4 py-2 text-white font-semibold rounded-lg text-sm focus-ring">
                充值
              </button>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1">
              <div
                className={`nav-item ${activeNav === 'overview' ? 'active' : ''} flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm cursor-pointer`}
                onClick={() => setActiveNav('overview')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                </svg>
                概览
              </div>
              <div
                className={`nav-item ${activeNav === 'works' ? 'active' : ''} flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-[#64748B] cursor-pointer`}
                onClick={() => setActiveNav('works')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                我的作品
              </div>
              <div
                className={`nav-item ${activeNav === 'tasks' ? 'active' : ''} flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-[#64748B] cursor-pointer`}
                onClick={() => setActiveNav('tasks')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                </svg>
                任务记录
              </div>
              <div
                className={`nav-item ${activeNav === 'orders' ? 'active' : ''} flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-[#64748B] cursor-pointer`}
                onClick={() => setActiveNav('orders')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                积分明细
              </div>
              <div
                className={`nav-item ${activeNav === 'packages' ? 'active' : ''} flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-[#64748B] cursor-pointer`}
                onClick={() => setActiveNav('packages')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                </svg>
                充值套餐
              </div>
              <div
                className={`nav-item ${activeNav === 'settings' ? 'active' : ''} flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-[#64748B] cursor-pointer`}
                onClick={() => setActiveNav('settings')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                账号设置
              </div>
              <div
                className={`nav-item ${activeNav === 'verification' ? 'active' : ''} flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-[#64748B] cursor-pointer`}
                onClick={() => setActiveNav('verification')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                实名认证
              </div>
              <div
                className={`nav-item ${activeNav === 'notifications' ? 'active' : ''} flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm text-[#64748B] cursor-pointer`}
                onClick={() => setActiveNav('notifications')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                消息通知
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {activeNav === 'overview' && (
            <>
              {/* Welcome Header Card */}
              <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] rounded-2xl p-6 text-white mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">欢迎回来，张小明！</h2>
                    <p className="text-blue-100">今天是你使用灵创AI的第 128 天</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/30 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-blue-100">今日使用</div>
                        <div className="text-lg font-bold">2 次</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* 积分余额卡片 */}
                <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB]">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-sm text-[#64748B] mb-1">积分余额</div>
                      <div className="text-3xl font-bold text-[#1E3A5F]">1,280</div>
                    </div>
                    <button className="btn-primary px-4 py-2 text-white text-sm font-medium rounded-lg">
                      立即充值
                    </button>
                  </div>
                  <div className="text-xs text-[#64748B]">最近充值: 2024-05-15</div>
                </div>

                {/* 已完成任务卡片 */}
                <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB]">
                  <div className="text-sm text-[#64748B] mb-2">已完成任务</div>
                  <div className="text-3xl font-bold text-[#1E3A5F]">28</div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#64748B]">本月任务完成进度</span>
                      <span className="text-[#059669]">75%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                </div>

                {/* 收藏工具卡片 */}
                <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB]">
                  <div className="text-sm text-[#64748B] mb-2">收藏工具</div>
                  <div className="text-3xl font-bold text-[#1E3A5F]">12</div>
                  <div className="mt-4 text-xs text-[#64748B]">
                    去工具中心发现更多
                  </div>
                </div>
              </div>

              {/* Recent Tools */}
              <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB] mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-xl text-[#1E3A5F]">最近使用工具</h2>
                  <button className="text-[#2563EB] hover:text-[#1E3A5F] text-sm font-medium focus-ring">
                    查看全部
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Tool Card 1 */}
                  <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                      </svg>
                    </div>
                    <h3 className="font-semibold text-[#1E3A5F] mb-1">AI有声绘本生成专家</h3>
                    <p className="text-xs text-[#64748B] mb-3">上次使用: 2024-01-15</p>
                    <button className="w-full py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">
                      再次使用
                    </button>
                  </div>

                  {/* Tool Card 2 */}
                  <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                      </svg>
                    </div>
                    <h3 className="font-semibold text-[#1E3A5F] mb-1">AI电商详情页生成器</h3>
                    <p className="text-xs text-[#64748B] mb-3">上次使用: 2024-01-14</p>
                    <button className="w-full py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">
                      再次使用
                    </button>
                  </div>

                  {/* Tool Card 3 */}
                  <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </div>
                    <h3 className="font-semibold text-[#1E3A5F] mb-1">AI营销文案生成器</h3>
                    <p className="text-xs text-[#64748B] mb-3">上次使用: 2024-01-13</p>
                    <button className="w-full py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">
                      再次使用
                    </button>
                  </div>
                </div>
              </div>

              {/* In Progress Tasks */}
              <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB]">
                <h2 className="font-bold text-xl text-[#1E3A5F] mb-6">进行中的任务</h2>
                <div className="space-y-4">
                  {/* Task 1 */}
                  <div className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-xl">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#1E3A5F] truncate">太空冒险记 - 儿童有声绘本</h3>
                      <p className="text-sm text-[#64748B]">AI有声绘本生成专家 · 12页</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#64748B]">正在生成插图...</span>
                          <span className="text-[#2563EB]">65%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: '65%' }}></div>
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-processing flex-shrink-0">生成中</span>
                  </div>

                  {/* Task 2 */}
                  <div className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-xl">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#1E3A5F] truncate">儿童智能手表详情页</h3>
                      <p className="text-sm text-[#64748B]">AI电商详情页生成器 · 15张图</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#64748B]">任务排队中...</span>
                          <span className="text-[#D97706]">排队中</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: '15%' }}></div>
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-warning flex-shrink-0">排队中</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeNav === 'works' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB]">
              <h2 className="font-bold text-xl text-[#1E3A5F] mb-6">我的作品</h2>
              <div className="text-center py-12 text-[#64748B]">
                <svg className="w-16 h-16 mx-auto mb-4 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3 className="text-lg font-medium text-[#1E3A5F] mb-2">作品列表正在加载中...</h3>
                <p className="text-sm">请稍候，我们正在为您准备内容</p>
              </div>
            </div>
          )}

          {activeNav === 'tasks' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB]">
              <h2 className="font-bold text-xl text-[#1E3A5F] mb-6">任务记录</h2>
              <div className="text-center py-12 text-[#64748B]">
                <svg className="w-16 h-16 mx-auto mb-4 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                </svg>
                <h3 className="text-lg font-medium text-[#1E3A5F] mb-2">任务记录正在加载中...</h3>
                <p className="text-sm">请稍候，我们正在为您准备内容</p>
              </div>
            </div>
          )}

          {activeNav === 'orders' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB]">
              <h2 className="font-bold text-xl text-[#1E3A5F] mb-6">积分明细</h2>
              <div className="text-center py-12 text-[#64748B]">
                <svg className="w-16 h-16 mx-auto mb-4 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 className="text-lg font-medium text-[#1E3A5F] mb-2">积分明细正在加载中...</h3>
                <p className="text-sm">请稍候，我们正在为您准备内容</p>
              </div>
            </div>
          )}

          {activeNav === 'packages' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB]">
              <h2 className="font-bold text-xl text-[#1E3A5F] mb-6">充值套餐</h2>
              <div className="text-center py-12 text-[#64748B]">
                <svg className="w-16 h-16 mx-auto mb-4 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                </svg>
                <h3 className="text-lg font-medium text-[#1E3A5F] mb-2">充值套餐正在加载中...</h3>
                <p className="text-sm">请稍候，我们正在为您准备内容</p>
              </div>
            </div>
          )}

          {activeNav === 'settings' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB]">
              <h2 className="font-bold text-xl text-[#1E3A5F] mb-6">账号设置</h2>
              <div className="text-center py-12 text-[#64748B]">
                <svg className="w-16 h-16 mx-auto mb-4 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <h3 className="text-lg font-medium text-[#1E3A5F] mb-2">账号设置正在加载中...</h3>
                <p className="text-sm">请稍候，我们正在为您准备内容</p>
              </div>
            </div>
          )}

          {activeNav === 'verification' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB]">
              <h2 className="font-bold text-xl text-[#1E3A5F] mb-6">实名认证</h2>
              <div className="text-center py-12 text-[#64748B]">
                <svg className="w-16 h-16 mx-auto mb-4 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                <h3 className="text-lg font-medium text-[#1E3A5F] mb-2">实名认证正在加载中...</h3>
                <p className="text-sm">请稍候，我们正在为您准备内容</p>
              </div>
            </div>
          )}

          {activeNav === 'notifications' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EB]">
              <h2 className="font-bold text-xl text-[#1E3A5F] mb-6">消息通知</h2>
              <div className="text-center py-12 text-[#64748B]">
                <svg className="w-16 h-16 mx-auto mb-4 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                <h3 className="text-lg font-medium text-[#1E3A5F] mb-2">消息通知正在加载中...</h3>
                <p className="text-sm">请稍候，我们正在为您准备内容</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCenter;