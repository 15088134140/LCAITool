import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { orderApi, Order, OrderListParams } from '@/api/user';
import {
  formatDate,
  formatPhone,
  formatMoney,
  getOrderStatusInfo,
  getPaymentProviderText,
  debounce,
} from '@/utils';
import { toast } from '@/components/ui/Toast';

const OrderList = () => {
  const navigate = useNavigate();
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // 搜索和筛选
  const [params, setParams] = useState<OrderListParams>({
    page: 1,
    pageSize: 20,
    keyword: '',
    status: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  useEffect(() => {
    setCurrentPageTitle('订单管理');
    setBreadcrumbs([
      { label: '首页', path: '/dashboard' },
      { label: '订单管理' },
      { label: '订单列表' },
    ]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  useEffect(() => {
    loadOrders();
  }, [params]);

  const debouncedSearch = debounce((value: string) => {
    setParams(prev => ({ ...prev, page: 1, keyword: value }));
  }, 300);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    debouncedSearch(e.target.value);
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await orderApi.getList(params);
      setOrders(data.list);
      setTotal(data.total);
    } catch (err) {
      console.error('加载订单列表失败:', err);
      toast.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof OrderListParams, value: any) => {
    setParams(prev => ({ ...prev, page: 1, [key]: value }));
  };

  const handleDateFilter = () => {
    const startDate = dateRange.start
      ? new Date(dateRange.start).getTime() / 1000
      : undefined;
    const endDate = dateRange.end
      ? new Date(dateRange.end + ' 23:59:59').getTime() / 1000
      : undefined;
    setParams(prev => ({
      ...prev,
      page: 1,
      startDate,
      endDate,
    }));
    setShowFilter(false);
  };

  const resetFilters = () => {
    setParams({
      page: 1,
      pageSize: 20,
      keyword: '',
      status: '',
    });
    setSearchInput('');
    setDateRange({ start: '', end: '' });
    setShowFilter(false);
  };

  const totalPages = Math.ceil(total / params.pageSize);
  const handlePageChange = (page: number) => {
    setParams(prev => ({ ...prev, page }));
  };

  const handleRefresh = () => {
    loadOrders();
  };

  const handleExport = () => {
    toast.info('导出功能开发中...');
  };

  return (
    <div className="space-y-6">
      {/* 顶部搜索和操作 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索订单号/用户昵称/手机号..."
                value={searchInput}
                onChange={handleSearchInput}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none w-80"
              />
            </div>

            {/* 状态筛选 */}
            <select
              value={params.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
            >
              <option value="">全部状态</option>
              <option value="pending">待支付</option>
              <option value="paid">已支付</option>
              <option value="failed">支付失败</option>
              <option value="refunded">已退款</option>
              <option value="expired">已过期</option>
            </select>

            {/* 高级筛选按钮 */}
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilter
                  ? 'border-[#1E3A5F] text-[#1E3A5F] bg-[#1E3A5F]/5'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              高级筛选
            </button>

            {/* 刷新按钮 */}
            <button
              onClick={handleRefresh}
              className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        </div>

        {/* 高级筛选展开区域 */}
        {showFilter && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-6 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  创建时间
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                  />
                  <span className="text-gray-500">至</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDateFilter}
                  className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#1E3A5F]/90 transition-colors"
                >
                  应用筛选
                </button>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  重置
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">全部订单</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{total}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">待支付</div>
          <div className="text-2xl font-bold text-[#F59E0B] mt-1">
            {orders.filter(o => o.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">已支付</div>
          <div className="text-2xl font-bold text-[#059669] mt-1">
            {orders.filter(o => o.status === 'paid').length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">已退款</div>
          <div className="text-2xl font-bold text-[#6B7280] mt-1">
            {orders.filter(o => o.status === 'refunded').length}
          </div>
        </div>
      </div>

      {/* 订单列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无订单数据</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">订单信息</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">用户信息</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">支付信息</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">积分</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">状态</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">创建时间</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const statusInfo = getOrderStatusInfo(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-800">{order.order_no}</div>
                          <div className="text-xs text-gray-500 mt-1">{order.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-800">{order.user_nickname || '-'}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {order.user_phone ? formatPhone(order.user_phone) : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-800">
                            ¥{formatMoney(order.pay_amount)}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {getPaymentProviderText(order.payment_provider)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-800">
                            <span className="font-medium">{order.total_points}</span>
                            <span className="text-gray-500 text-sm ml-1">积分</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            基础 {order.base_points} + 赠送 {order.bonus_points}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ color: statusInfo.color, backgroundColor: statusInfo.bgColor }}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => navigate(`/orders/${order.id}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                共 {total} 条记录，第 {params.page} / {totalPages || 1} 页
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(params.page - 1)}
                  disabled={params.page <= 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (params.page > 3) {
                      pageNum = params.page - 2 + i;
                    }
                    if (params.page > totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    }
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-9 h-9 rounded-lg font-medium transition-colors ${
                        params.page === pageNum
                          ? 'bg-[#1E3A5F] text-white'
                          : 'border border-gray-300 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(params.page + 1)}
                  disabled={params.page >= totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderList;
