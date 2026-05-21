'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/store/userStore';
import { paymentApi } from '@/lib/api/modules/payment';
import type { Order, OrderStatus } from '@/lib/api/types';

// Filter types
type FilterType = 'all' | 'recharge' | 'expense' | 'refund';

// Format order status
const getStatusDisplay = (status: OrderStatus): {
  label: string;
  class: string;
} => {
  switch (status) {
    case 'pending':
      return { label: '处理中', class: 'bg-amber-50 text-[#F59E0B]' };
    case 'paid':
      return { label: '成功', class: 'bg-green-50 text-[#059669]' };
    case 'failed':
      return { label: '失败', class: 'bg-red-50 text-[#DC2626]' };
    case 'refunded':
      return { label: '已退款', class: 'bg-blue-50 text-[#2563EB]' };
    case 'expired':
      return { label: '已过期', class: 'bg-gray-50 text-[#64748B]' };
    default:
      return { label: '未知', class: 'bg-gray-50 text-[#64748B]' };
  }
};

const OrdersPage: React.FC = () => {
  const { user, refreshUserBalance } = useUserStore();
  const [activeTab, setActiveTab] = useState<FilterType>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

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

  // Load orders
  const loadOrders = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;

      const response = await paymentApi.getOrders(currentPage, 20);

      if (reset) {
        setOrders(response.items);
      } else {
        setOrders(prev => [...prev, ...response.items]);
      }
      setTotal(response.total);
      setHasMore(response.items.length === 20);
    } catch (error) {
      console.error('Failed to load orders:', error);
      // Mock data for MVP
      const mockOrders: Order[] = [
        {
          id: '1',
          user_id: user?.id || '',
          order_no: 'LC202401150001',
          pay_amount: 100,
          base_points: 1000,
          bonus_points: 100,
          total_points: 1100,
          payment_provider: 'wechat',
          status: 'paid',
          paid_at: Date.now() - 3600000,
          created_at: Date.now() - 3600000,
          updated_at: Date.now() - 3600000,
        },
        {
          id: '2',
          user_id: user?.id || '',
          order_no: 'LC202401150002',
          pay_amount: 0,
          base_points: 0,
          bonus_points: 0,
          total_points: 0,
          payment_provider: 'simulated',
          status: 'paid',
          remark: 'AI有声绘本生成专家消费',
          created_at: Date.now() - 7200000,
          updated_at: Date.now() - 7200000,
        },
        {
          id: '3',
          user_id: user?.id || '',
          order_no: 'LC202401140001',
          pay_amount: 0,
          base_points: 0,
          bonus_points: 0,
          total_points: 0,
          payment_provider: 'simulated',
          status: 'paid',
          remark: 'AI电商商品详情页生成器消费',
          created_at: Date.now() - 86400000,
          updated_at: Date.now() - 86400000,
        },
        {
          id: '4',
          user_id: user?.id || '',
          order_no: 'LC202401130001',
          pay_amount: 0,
          base_points: 0,
          bonus_points: 0,
          total_points: 0,
          payment_provider: 'simulated',
          status: 'pending',
          remark: 'AI营销文案生成器消费',
          created_at: Date.now() - 172800000,
          updated_at: Date.now() - 172800000,
        },
        {
          id: '5',
          user_id: user?.id || '',
          order_no: 'LC202401120001',
          pay_amount: 0,
          base_points: 0,
          bonus_points: 0,
          total_points: 0,
          payment_provider: 'simulated',
          status: 'failed',
          remark: 'AI头像生成器（已退款）',
          created_at: Date.now() - 259200000,
          updated_at: Date.now() - 259200000,
        },
      ];
      setOrders(mockOrders);
      setTotal(mockOrders.length);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, user?.id]);

  // Initial load
  useEffect(() => {
    setPage(1);
    loadOrders(true);
  }, [activeTab]);

  // Load more
  const loadMore = () => {
    setPage(p => p + 1);
  };

  // Filter orders for MVP (client-side)
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'recharge') return order.pay_amount > 0;
    if (activeTab === 'expense') return order.pay_amount === 0 && order.status !== 'refunded';
    if (activeTab === 'refund') return order.status === 'refunded';
    return true;
  });

  // Calculate stats from mock data for MVP
  const currentBalance = user?.balance || 156;
  const totalRecharge = orders
    .filter(o => o.pay_amount > 0)
    .reduce((sum, o) => sum + o.total_points, 0) || 500;
  const totalExpense = 344; // Mock value
  const monthlyExpense = 88; // Mock value

  return (
    <div className="min-h-screen bg-[#F8FAFC] page-bg-animated">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E4E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/user-center" className="text-[#64748B] hover:text-[#1E3A5F] transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-[#1E3A5F]">订单记录</h1>
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

      <main className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-[#E4E7EB] p-6">
              <div className="text-sm text-[#64748B] mb-1">账户余额</div>
              <div className="text-3xl font-bold text-[#1E3A5F]">{currentBalance}</div>
              <div className="text-xs text-[#94A3B8] mt-1">积分</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E4E7EB] p-6">
              <div className="text-sm text-[#64748B] mb-1">累计充值</div>
              <div className="text-3xl font-bold text-[#059669]">{totalRecharge}</div>
              <div className="text-xs text-[#94A3B8] mt-1">积分</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E4E7EB] p-6">
              <div className="text-sm text-[#64748B] mb-1">累计消费</div>
              <div className="text-3xl font-bold text-[#DC2626]">{totalExpense}</div>
              <div className="text-xs text-[#94A3B8] mt-1">积分</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E4E7EB] p-6">
              <div className="text-sm text-[#64748B] mb-1">本月消费</div>
              <div className="text-3xl font-bold text-[#1E3A5F]">{monthlyExpense}</div>
              <div className="text-xs text-[#94A3B8] mt-1">积分</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex gap-2 bg-white rounded-xl p-2 border border-[#E4E7EB]">
              {[
                { key: 'all' as FilterType, label: '全部' },
                { key: 'recharge' as FilterType, label: '充值' },
                { key: 'expense' as FilterType, label: '消费' },
                { key: 'refund' as FilterType, label: '退款' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    activeTab === tab.key
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#64748B] hover:bg-[#F8FAFC]'
                  }`}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setPage(1);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <select className="px-4 py-2 bg-white border border-[#E4E7EB] rounded-lg text-sm text-[#64748B]">
                <option>全部时间</option>
                <option>今天</option>
                <option>最近7天</option>
                <option>最近30天</option>
                <option>本月</option>
                <option>上月</option>
                <option>自定义</option>
              </select>
              <button className="btn-primary px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
              {loading && page === 1 ? (
                <div className="p-8 text-center">
                  <svg className="w-8 h-8 mx-auto mb-4 text-[#E4E7EB] animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-[#64748B]">加载中...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-[#E4E7EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-[#64748B]">暂无订单记录</p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const statusDisplay = getStatusDisplay(order.status);
                  const isRecharge = order.pay_amount > 0;
                  const orderTypeLabel = isRecharge ? '充值' : '消费';
                  const orderTypeClass = isRecharge
                    ? 'bg-green-50 text-[#059669]'
                    : 'bg-red-50 text-[#DC2626]';
                  const amountLabel = isRecharge
                    ? `+${order.total_points} 积分`
                    : order.remark?.includes('退款')
                    ? `+${order.total_points} 积分`
                    : `-${Math.abs(order.total_points || 12)} 积分`;
                  const amountClass = isRecharge || order.remark?.includes('退款')
                    ? 'type-income text-[#059669]'
                    : 'type-expense text-[#DC2626]';

                  return (
                    <div key={order.id} className="px-6 py-4">
                      {/* Mobile View */}
                      <div className="md:hidden space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#64748B]">{formatDate(order.created_at)}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusDisplay.class}`}>
                            {statusDisplay.label}
                          </span>
                        </div>
                        <div className="font-medium text-[#1E3A5F]">
                          {order.remark || (isRecharge ? '微信充值' : 'AI工具消费')}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#64748B]">{orderTypeLabel}</span>
                          <span className={`font-semibold ${amountClass}`}>{amountLabel}</span>
                        </div>
                        <button className="text-sm text-[#2563EB] hover:underline">查看详情</button>
                      </div>

                      {/* Desktop View */}
                      <div className="hidden md:grid grid-cols-6 gap-4 items-center">
                        <div className="text-sm text-[#64748B]">{formatDate(order.created_at)}</div>
                        <div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${orderTypeClass}`}>
                            {orderTypeLabel}
                          </span>
                        </div>
                        <div className="font-medium text-[#1E3A5F] truncate">
                          {order.remark || (isRecharge ? '微信充值' : 'AI工具消费')}
                        </div>
                        <div className={`font-semibold ${amountClass}`}>{amountLabel}</div>
                        <div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusDisplay.class}`}>
                            {statusDisplay.label}
                          </span>
                        </div>
                        <div>
                          <button className="text-sm text-[#2563EB] hover:underline">查看详情</button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {filteredOrders.length > 0 && (
              <div className="px-6 py-6 border-t border-[#E4E7EB]">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[#64748B]">
                    共 <span className="font-medium text-[#1E3A5F]">{total}</span> 条记录，第 <span className="font-medium text-[#1E3A5F]">{page}</span>/<span className="font-medium text-[#1E3A5F]">{Math.ceil(total / 20) || 1}</span> 页
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="w-9 h-9 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors disabled:opacity-50"
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button className="w-9 h-9 rounded-lg bg-[#2563EB] text-white font-medium text-sm">{page}</button>
                    {hasMore && (
                      <>
                        <button
                          className="w-9 h-9 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors text-sm"
                          onClick={() => setPage(p => p + 1)}
                        >
                          {page + 1}
                        </button>
                        <span className="text-[#94A3B8]">...</span>
                      </>
                    )}
                    <button
                      className="w-9 h-9 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                      disabled={!hasMore}
                      onClick={loadMore}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrdersPage;
