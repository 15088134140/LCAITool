'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { authApi } from '@/lib/api';
import { userApi } from '@/lib/api/modules/user';
import { toolApi } from '@/lib/api/modules/tool';
import { taskApi } from '@/lib/api/modules/task';
import { workApi } from '@/lib/api/modules/work';
import { getFirstImage } from '@/lib/utils/image';
import { API_BASE_URL, tokenStorage } from '@/lib/api/client';
import CheckinModal from '@/components/checkin/CheckinModal';
import InvitePanel from '@/components/invite/InvitePanel';
import type { UserStats, ToolRecentItem, Task as TaskType, Work } from '@/lib/api/types';

const formatRelativeTime = (timestamp: number | string | null | undefined): string => {
  if (!timestamp) return '未知';
  const now = Date.now();
  let t = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  // 后端时间戳为秒级，转毫秒
  if (t < 1e12) t *= 1000;
  const diff = now - t;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(t).toLocaleDateString('zh-CN');
};

export default function UserCenterPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, refreshBalance } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentTools, setRecentTools] = useState<ToolRecentItem[]>([]);
  const [pendingTasks, setPendingTasks] = useState<TaskType[]>([]);
  const [latestWorks, setLatestWorks] = useState<Work[]>([]);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setLoading(false);
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshBalance();
    }
  }, [isAuthenticated, refreshBalance]);

  // Load all dashboard data
  useEffect(() => {
    if (!isAuthenticated) return;

    setDataLoading(true);
    Promise.all([
      userApi.getStats(),
      toolApi.getRecentTools(),
      taskApi.getTasks({ page: 1, page_size: 10 }),
      workApi.getWorks({ page: 1, page_size: 3 }),
      toolApi.getFavorites(1, 1),
    ])
      .then(([statsData, toolsData, tasksData, worksData, favData]) => {
        setStats(statsData);
        setRecentTools(toolsData);
        // Filter pending/running tasks
        const active = (tasksData.items || []).filter(
          t => t.status === 'pending' || t.status === 'running'
        );
        setPendingTasks(active);
        setLatestWorks(worksData.items || []);
        setFavoriteCount(favData.total || 0);
      })
      .catch(err => {
        console.error('Failed to load user center data:', err);
      })
      .finally(() => {
        setDataLoading(false);
      });
  }, [isAuthenticated]);

  // 下载作品 ZIP（带 Token 认证）
  const handleDownloadWork = async (workId: string) => {
    try {
      const token = tokenStorage.getToken();
      const response = await fetch(
        `${API_BASE_URL}/works/${workId}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('下载失败');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work_${workId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('下载失败:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-[#1E3A5F] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">个人中心</h1>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* User Profile Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center overflow-hidden">
                  <span className="text-3xl font-bold text-white">
                    {user?.nickname?.charAt?.(0) || 'U'}
                  </span>
                </div>
                <h3 className="mt-4 font-bold text-lg text-gray-900">
                  {user?.nickname || '用户'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {user?.phone?.replace?.(/(\d{3})\d{4}(\d{4})/, '$1****$2') || '未绑定手机号'}
                </p>

                {/* Verification Badge */}
                <div className="mt-3 flex justify-center">
                  {user?.id_card_verified ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      已认证
                    </span>
                  ) : (
                    <Link
                      href="/user-center/verification"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium hover:bg-yellow-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      去认证
                    </Link>
                  )}
                </div>

                {/* Points Display */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-xs text-gray-500">积分余额</p>
                      <p className="text-2xl font-bold text-[#1E3A5F]">{user?.balance ?? 0}</p>
                    </div>
                    <Link
                      href="/pricing"
                      className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white text-sm font-medium rounded-lg shadow-md shadow-green-500/20 hover:shadow-lg transition-all"
                    >
                      充值
                    </Link>
                  </div>
                  <button
                    onClick={() => setShowCheckin(true)}
                    className="mt-3 w-full py-2 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white text-sm font-medium rounded-lg shadow-md shadow-blue-500/20 hover:shadow-lg transition-all"
                  >
                    每日签到
                  </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Menu - 分组设计 */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {/* 分组1: 创作管理 */}
              <div className="px-6 pt-5 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">创作管理</p>
              </div>
              <nav className="divide-y divide-gray-50">
                <Link href="/works" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">我的作品</p>
                    <p className="text-xs text-gray-500">管理创作的成果</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link href="/orders" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">订单记录</p>
                    <p className="text-xs text-gray-500">充值、消费明细</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </nav>

              {/* 分组2: 互动中心 */}
              <div className="px-6 pt-5 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">互动中心</p>
              </div>
              <nav className="divide-y divide-gray-50">
                <Link href="/user-center/favorites" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                    <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">我的收藏</p>
                    <p className="text-xs text-gray-500">收藏的工具</p>
                  </div>
                  <span className="text-xs text-gray-400">{favoriteCount}个</span>
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <button onClick={() => setShowInvite(true)} className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group w-full text-left">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">邀请好友</p>
                    <p className="text-xs text-gray-500">分享得积分奖励</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <Link href="/feedback" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">帮助与反馈</p>
                    <p className="text-xs text-gray-500">常见问题、联系客服</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </nav>

              {/* 分组3: 账户设置 */}
              <div className="px-6 pt-5 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">账户设置</p>
              </div>
              <nav className="divide-y divide-gray-50">
                <Link href="/user-center/profile" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">个人信息</p>
                    <p className="text-xs text-gray-500">头像、昵称、邮箱</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link href="/user-center/security" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">账号安全</p>
                    <p className="text-xs text-gray-500">密码、手机号</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link href="/user-center/verification" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">实名认证</p>
                    <p className="text-xs text-gray-500">身份信息认证</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link href="/user-center/points" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">积分明细</p>
                    <p className="text-xs text-gray-500">收支记录、充值</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">欢迎回来，{user?.nickname || '用户'}！</h2>
                  <p className="text-blue-100">
                    今天是使用灵创AI的第 <strong>{stats?.days_used ?? '-'}</strong> 天
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-blue-200">今日使用</p>
                      <p className="text-xl font-bold">{stats?.today_count ?? 0} 次</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">作品总数</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">{stats?.total_works ?? '-'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">累计消费</p>
                    <p className="text-2xl font-bold text-[#1E3A5F]">{stats?.total_consumed ?? '-'}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">积分</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">奖励积分</p>
                    <p className="text-2xl font-bold text-[#7C3AED]">{stats?.reward_points ?? '-'}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">累计获得</p>
              </div>
            </div>

            {/* 进行中的任务 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-xl text-gray-900">进行中的任务</h2>
                {pendingTasks.length > 3 && (
                  <Link href="/works" className="text-[#2563EB] hover:text-[#1E3A5F] text-sm font-medium transition-colors">
                    查看全部
                  </Link>
                )}
              </div>
              {dataLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-[#1E3A5F] border-t-transparent rounded-full mx-auto" />
                </div>
              ) : pendingTasks.length > 0 ? (
                <div className="space-y-4">
                  {pendingTasks.slice(0, 3).map(task => {
                    return (
                      <div key={task.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900 truncate">{task.task_type || '未命名任务'}</h3>
                              <p className="text-sm text-gray-500">{task.tool_name || ''}</p>
                            </div>
                            <span className={`px-3 py-1 text-sm font-medium rounded-full flex-shrink-0 ml-2 ${task.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {task.status === 'running' ? '生成中' : '排队中'}
                            </span>
                          </div>
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-500">{task.progress_message || ''}</span>
                              <span className="text-[#2563EB] font-medium">{task.progress ?? 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-gradient-to-r from-[#2563EB] to-[#3B82F6] h-full rounded-full" style={{ width: `${task.progress ?? 0}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">暂无进行中的任务</p>
              )}
            </div>

            {/* 最新作品 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-xl text-gray-900">最新作品</h2>
                <Link href="/works" className="text-[#2563EB] hover:text-[#1E3A5F] text-sm font-medium transition-colors">
                  查看全部
                </Link>
              </div>
              {dataLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-[#1E3A5F] border-t-transparent rounded-full mx-auto" />
                </div>
              ) : latestWorks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {latestWorks.map(work => {
                    const coverImage = getFirstImage(work.cover_image);
                    return (
                      <div key={work.id} className="card-hover rounded-xl border border-gray-200 overflow-hidden group" style={{ transition: 'all 0.25s ease-out' }}>
                        <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                          <Link href={`/works/detail/${work.id}`} className="block w-full h-full">
                            {coverImage ? (
                              <img src={coverImage} alt={work.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                              </div>
                            )}
                          </Link>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3 gap-2">
                            <Link href={`/works/detail/${work.id}`} className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-medium hover:bg-gray-100">
                              查看
                            </Link>
                            <button onClick={() => handleDownloadWork(work.id)} className="px-3 py-1.5 bg-[#059669] text-white rounded-lg text-xs font-medium hover:bg-[#047857]">
                              下载
                            </button>
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{work.title || '未命名作品'}</h3>
                          <p className="text-xs text-gray-500">{work.tool_name || ''} · {formatRelativeTime(work.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">暂无作品</p>
              )}
            </div>

            {/* 最近使用工具 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-xl text-gray-900">最近使用工具</h2>
                <Link href="/tools" className="text-[#2563EB] hover:text-[#1E3A5F] text-sm font-medium transition-colors">
                  浏览全部
                </Link>
              </div>
              {dataLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-[#1E3A5F] border-t-transparent rounded-full mx-auto" />
                </div>
              ) : recentTools.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentTools.map(tool => {
                    const coverImage = getFirstImage(tool.cover_image);
                    return (
                      <div key={tool.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
                            {coverImage ? (
                              <img src={coverImage} alt={tool.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm truncate">{tool.name}</h3>
                            <p className="text-xs text-gray-500">已使用 {tool.use_count} 次 · {formatRelativeTime(tool.last_used_at)}</p>
                          </div>
                        </div>
                        <Link href={`/tools/${tool.id}`} className="block w-full py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-center text-gray-700 hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-blue-50 transition-all">
                          使用
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">暂无使用记录</p>
              )}
            </div>

            {/* 我的收藏 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-xl text-gray-900">我的收藏</h2>
                <Link href="/user-center/favorites" className="text-[#2563EB] hover:text-[#1E3A5F] text-sm font-medium transition-colors">
                  查看全部
                </Link>
              </div>
              {dataLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-[#1E3A5F] border-t-transparent rounded-full mx-auto" />
                </div>
              ) : (
                <FavoritesPreview />
              )}
            </div>
          </div>
        </div>
      </main>

      <CheckinModal isOpen={showCheckin} onClose={() => setShowCheckin(false)} />
      <InvitePanel isOpen={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  );
}

/* Favorites Preview - 单独提取为子组件以独立获取数据 */
function FavoritesPreview() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    toolApi.getFavorites(1, 3).then(res => {
      setFavorites(res.items || []);
    }).catch(() => {
      // ignore
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-[#1E3A5F] border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return <p className="text-center text-gray-400 py-8">暂无收藏</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {favorites.map((fav: any) => {
        const coverImage = getFirstImage(fav.cover_image);
        return (
          <div key={fav.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-pink-200 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-pink-400 to-rose-500">
                {coverImage ? (
                  <img src={coverImage} alt={fav.name || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{fav.name || '未知工具'}</h3>
                <p className="text-xs text-gray-500">收藏于 {formatRelativeTime(fav.created_at)}</p>
              </div>
            </div>
            <Link href={`/tools/${fav.id}`} className="block w-full py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-center text-pink-600 hover:border-pink-300 hover:bg-pink-50 transition-all">
              立即使用
            </Link>
          </div>
        );
      })}
    </div>
  );
}
