'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { authApi } from '@/lib/api';

interface PointsTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export default function PointsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [filter, page]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await authApi.getPointsHistory({ type: filter, page });
      if (page === 1) {
        setTransactions(response.items || []);
      } else {
        setTransactions(prev => [...prev, ...(response.items || [])]);
      }
      setHasMore(response.has_more || false);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: 'income' | 'expense') => {
    if (type === 'income') {
      return (
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/>
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/user-center" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">积分明细</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] rounded-2xl p-6 text-white mb-6 shadow-xl shadow-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">当前积分余额</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{user?.points || 0}</span>
                <span className="text-blue-200 text-sm">积分</span>
              </div>
            </div>
            <Link
              href="#recharge"
              className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl font-medium hover:bg-white/20 transition-all"
            >
              立即充值
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 gap-6">
            <div>
              <p className="text-blue-200 text-sm mb-1">累计获取</p>
              <p className="text-xl font-semibold">+170</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm mb-1">累计消耗</p>
              <p className="text-xl font-semibold">-47</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 mb-6 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {[
              { key: 'all', label: '全部' },
              { key: 'income', label: '收入' },
              { key: 'expense', label: '支出' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setFilter(tab.key as any);
                  setPage(1);
                  setTransactions([]);
                }}
                className={`flex-1 py-4 text-sm font-medium transition-all relative ${
                  filter === tab.key
                    ? 'text-[#1E3A5F]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {filter === tab.key && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#1E3A5F] rounded-full"/>
                )}
              </button>
            ))}
          </div>

          {/* Transaction List */}
          <div className="divide-y divide-gray-100">
            {loading && page === 1 ? (
              <div className="p-8 text-center">
                <svg className="w-8 h-8 mx-auto mb-4 text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <p className="text-gray-500">加载中...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p className="text-gray-500">暂无积分记录</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  {getTypeIcon(transaction.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
                    <p className="text-sm text-gray-500">{transaction.created_at}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{transaction.amount}
                    </p>
                    <p className="text-xs text-gray-400">余额: {transaction.balance_after}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="p-4 text-center border-t border-gray-100">
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-[#1E3A5F] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {loading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
        </div>

        {/* Recharge Packages Section */}
        <div id="recharge" className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">充值套餐</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Package 1 */}
            <div className="relative p-4 border-2 border-gray-200 rounded-xl hover:border-[#2563EB] transition-all cursor-pointer group">
              <div className="absolute top-0 right-0 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-bl-lg rounded-tr-lg">
                推荐
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#1E3A5F]">100</p>
                <p className="text-sm text-gray-500 mb-2">积分</p>
                <p className="text-xl font-bold text-[#059669]">¥10.00</p>
                <p className="text-xs text-gray-400">约 ¥0.1/积分</p>
              </div>
            </div>

            {/* Package 2 */}
            <div className="relative p-4 border-2 border-gray-200 rounded-xl hover:border-[#2563EB] transition-all cursor-pointer group">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#1E3A5F]">500</p>
                <p className="text-sm text-gray-500 mb-2">积分</p>
                <p className="text-xl font-bold text-[#059669]">¥45.00</p>
                <p className="text-xs text-gray-400">约 ¥0.09/积分 省¥5</p>
              </div>
            </div>

            {/* Package 3 */}
            <div className="relative p-4 border-2 border-gray-200 rounded-xl hover:border-[#2563EB] transition-all cursor-pointer group">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#1E3A5F]">1000</p>
                <p className="text-sm text-gray-500 mb-2">积分</p>
                <p className="text-xl font-bold text-[#059669]">¥85.00</p>
                <p className="text-xs text-gray-400">约 ¥0.085/积分 省¥15</p>
              </div>
            </div>

            {/* Package 4 */}
            <div className="relative p-4 border-2 border-gray-200 rounded-xl hover:border-[#2563EB] transition-all cursor-pointer group">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#1E3A5F]">2000</p>
                <p className="text-sm text-gray-500 mb-2">积分</p>
                <p className="text-xl font-bold text-[#059669]">¥160.00</p>
                <p className="text-xs text-gray-400">约 ¥0.08/积分 省¥40</p>
              </div>
            </div>
          </div>

          <button
            className="w-full py-3 bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all"
          >
            确认充值
          </button>
        </div>

        {/* Points Info */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            积分说明
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"/>
              <p>1元人民币 = 10积分，积分不可逆向兑换为人民币</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"/>
              <p>积分永久有效，可用于购买平台内所有AI工具服务</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"/>
              <p>完成实名认证、邀请好友等活动可获得额外积分奖励</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mt-1.5 flex-shrink-0"/>
              <p>充值后未使用的积分，可在购买后7天内申请退款</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
