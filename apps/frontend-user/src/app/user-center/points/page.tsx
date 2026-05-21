'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/store/userStore';
import { userApi } from '@/lib/api/modules/user';
import type { PointTransaction, TransactionType } from '@/lib/api/types';

// Filter options
type FilterType = 'all' | 'income' | 'expense';

const PointsPage: React.FC = () => {
  const { user } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Map transaction type for display
  const getTransactionTypeDisplay = (type: TransactionType): {
    label: string;
    colorClass: string;
    bgClass: string;
  } => {
    switch (type) {
      case 'recharge':
        return { label: '充值', colorClass: 'text-[#059669]', bgClass: 'bg-green-50' };
      case 'consume':
        return { label: '消费', colorClass: 'text-[#DC2626]', bgClass: 'bg-red-50' };
      case 'refund':
        return { label: '退款', colorClass: 'text-[#2563EB]', bgClass: 'bg-blue-50' };
      case 'adjust':
        return { label: '调整', colorClass: 'text-[#7C3AED]', bgClass: 'bg-purple-50' };
      case 'freeze':
        return { label: '冻结', colorClass: 'text-[#F59E0B]', bgClass: 'bg-amber-50' };
      case 'unfreeze':
        return { label: '解冻', colorClass: 'text-[#10B981]', bgClass: 'bg-emerald-50' };
      default:
        return { label: '其他', colorClass: 'text-[#64748B]', bgClass: 'bg-gray-50' };
    }
  };

  // Get type icon
  const getTypeIcon = (type: TransactionType, amount: number) => {
    const isIncome = amount > 0;
    if (isIncome) {
      return (
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
        </svg>
      </div>
    );
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Load transactions
  const loadTransactions = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;

      // Map filter to API type
      let typeFilter: TransactionType | undefined;
      if (filter === 'income') {
        // For MVP, we'll handle this by filtering client-side
      } else if (filter === 'expense') {
        // For MVP, we'll handle this by filtering client-side
      }

      const response = await userApi.getTransactions({
        page: currentPage,
        page_size: 20,
      });

      if (reset) {
        setTransactions(response.items);
      } else {
        setTransactions(prev => [...prev, ...response.items]);
      }
      setHasMore(response.items.length === 20);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      // Mock data for MVP
      const mockTransactions: PointTransaction[] = [
        {
          id: '1',
          user_id: user?.id || '',
          amount: 1000,
          type: 'recharge',
          reason: '套餐充值',
          balance_before: 0,
          balance_after: 1000,
          created_at: Date.now() - 3600000,
          updated_at: Date.now() - 3600000,
        },
        {
          id: '2',
          user_id: user?.id || '',
          amount: -12,
          type: 'consume',
          reason: 'AI有声绘本生成专家',
          balance_before: 1000,
          balance_after: 988,
          created_at: Date.now() - 7200000,
          updated_at: Date.now() - 7200000,
        },
        {
          id: '3',
          user_id: user?.id || '',
          amount: -18,
          type: 'consume',
          reason: 'AI电商商品详情页生成器',
          balance_before: 988,
          balance_after: 970,
          created_at: Date.now() - 86400000,
          updated_at: Date.now() - 86400000,
        },
        {
          id: '4',
          user_id: user?.id || '',
          amount: 20,
          type: 'adjust',
          reason: '实名认证奖励',
          balance_before: 970,
          balance_after: 990,
          created_at: Date.now() - 172800000,
          updated_at: Date.now() - 172800000,
        },
      ];
      setTransactions(mockTransactions);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, filter, user?.id]);

  // Initial load
  useEffect(() => {
    setPage(1);
    loadTransactions(true);
  }, [filter]);

  // Load more
  const loadMore = () => {
    setPage(p => p + 1);
  };

  // Filter transactions client-side for MVP
  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'income') return t.amount > 0;
    if (filter === 'expense') return t.amount < 0;
    return true;
  });

  // Calculate stats
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = Math.abs(transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navigation */}
      <nav className="bg-white border-b border-[#E4E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/user-center" className="text-[#64748B] hover:text-[#1E3A5F] transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-[#1E3A5F]">积分明细</h1>
            </div>
            <Link
              href="/payment"
              className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-medium rounded-lg hover:shadow-md transition-all"
            >
              去充值
            </Link>
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
                <span className="text-4xl font-bold">{user?.balance || 0}</span>
                <span className="text-blue-200 text-sm">积分</span>
              </div>
            </div>
            <Link
              href="/payment"
              className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl font-medium hover:bg-white/20 transition-all"
            >
              立即充值
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 gap-6">
            <div>
              <p className="text-blue-200 text-sm mb-1">累计获取</p>
              <p className="text-xl font-semibold">+{totalIncome}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm mb-1">累计消耗</p>
              <p className="text-xl font-semibold">-{totalExpense}</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl border border-[#E4E7EB] mb-6 overflow-hidden">
          <div className="flex border-b border-[#F8FAFC]">
            {[
              { key: 'all' as FilterType, label: '全部' },
              { key: 'income' as FilterType, label: '收入' },
              { key: 'expense' as FilterType, label: '支出' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setFilter(tab.key);
                  setPage(1);
                }}
                className={`flex-1 py-4 text-sm font-medium transition-all relative ${
                  filter === tab.key
                    ? 'text-[#1E3A5F]'
                    : 'text-[#64748B] hover:text-[#1E3A5F]'
                }`}
              >
                {tab.label}
                {filter === tab.key && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#1E3A5F] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Transaction List */}
          <div className="divide-y divide-[#F8FAFC]">
            {loading && page === 1 ? (
              <div className="p-8 text-center">
                <svg className="w-8 h-8 mx-auto mb-4 text-[#E4E7EB] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-[#64748B]">加载中...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-[#E4E7EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-[#64748B]">暂无积分记录</p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => {
                const typeDisplay = getTransactionTypeDisplay(transaction.type);
                return (
                  <div key={transaction.id} className="p-4 flex items-center gap-4 hover:bg-[#F8FAFC] transition-colors">
                    {getTypeIcon(transaction.type, transaction.amount)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[#1E3A5F] truncate">
                          {transaction.reason || typeDisplay.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeDisplay.bgClass} ${typeDisplay.colorClass}`}>
                          {typeDisplay.label}
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B]">{formatDate(transaction.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${
                        transaction.amount > 0 ? 'text-[#059669]' : 'text-[#DC2626]'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </p>
                      <p className="text-xs text-[#94A3B8]">余额: {transaction.balance_after}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Load More */}
          {hasMore && filteredTransactions.length > 0 && (
            <div className="p-4 text-center border-t border-[#F8FAFC]">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-[#1E3A5F] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {loading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
        </div>

        {/* Points Info */}
        <div className="bg-white rounded-2xl border border-[#E4E7EB] p-6">
          <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            积分说明
          </h3>
          <div className="space-y-3 text-sm text-[#64748B]">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-[#E4E7EB] rounded-full mt-1.5 flex-shrink-0" />
              <p>1元人民币 = 10积分，积分不可逆向兑换为人民币</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-[#E4E7EB] rounded-full mt-1.5 flex-shrink-0" />
              <p>积分永久有效，可用于购买平台内所有AI工具服务</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-[#E4E7EB] rounded-full mt-1.5 flex-shrink-0" />
              <p>完成实名认证、邀请好友等活动可获得额外积分奖励</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-[#E4E7EB] rounded-full mt-1.5 flex-shrink-0" />
              <p>充值后未使用的积分，可在购买后7天内申请退款</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PointsPage;
