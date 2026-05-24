import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { refundsApi, RefundOrder } from '@/api/refunds';
import { formatDate } from '@/utils';
import { Button } from '@lcaitool/ui';
import { toast } from '@/components/ui/Toast';

// Modal 组件
const Modal = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const statusLabels: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  failed: '已失败',
  refunded: '已退款',
  expired: '已过期',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-blue-100 text-blue-700',
  expired: 'bg-gray-100 text-gray-600',
};

const paymentLabels: Record<string, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
  simulated: '模拟支付',
};

const paymentColors: Record<string, string> = {
  wechat: 'bg-green-100 text-green-700',
  alipay: 'bg-blue-100 text-blue-700',
  simulated: 'bg-gray-100 text-gray-600',
};

const RefundsPage = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();
  const [orders, setOrders] = useState<RefundOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [tab, setTab] = useState<'pending' | 'done'>('pending');
  const [loading, setLoading] = useState(false);

  // 退款确认弹窗
  const [refundModal, setRefundModal] = useState<RefundOrder | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setCurrentPageTitle('退款管理');
    setBreadcrumbs([
      { label: '首页', path: '/dashboard' },
      { label: '订单管理' },
      { label: '退款管理' },
    ]);
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await refundsApi.getList({ status: tab, page, page_size: pageSize });
      setOrders(res.items || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error('获取退款列表失败:', error);
      toast.error('获取退款列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    fetchList();
  }, [page, tab]);

  const handleRefund = async () => {
    if (!refundModal) return;
    setProcessing(true);
    try {
      const res = await refundsApi.process(refundModal.id);
      toast.success(`退款成功，已退还 ${res.refund_amount} 积分`);
      setRefundModal(null);
      fetchList();
    } catch (error: any) {
      toast.error(error.message || '退款处理失败');
    } finally {
      setProcessing(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Tab 切换 */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setTab('pending')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'pending'
              ? 'bg-[#1E3A5F] text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          待处理
        </button>
        <button
          onClick={() => setTab('done')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'done'
              ? 'bg-[#1E3A5F] text-white'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          已处理
        </button>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">订单号</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">用户</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">支付金额</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">积分</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">支付方式</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">状态</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">创建时间</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">加载中...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">暂无数据</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-gray-800">{order.order_no}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{order.user_nickname}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-800">
                        ¥{order.pay_amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{order.total_points}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${paymentColors[order.payment_provider] || paymentColors.simulated}`}>
                        {paymentLabels[order.payment_provider] || order.payment_provider}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status] || ''}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{formatDate(order.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tab === 'pending' && order.status === 'paid' && (
                        <button
                          onClick={() => setRefundModal(order)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <RotateCcw size={14} />
                          <span>退款</span>
                        </button>
                      )}
                      {tab === 'done' && (
                        <span className="inline-flex items-center gap-1 text-sm text-blue-600">
                          <CheckCircle size={14} />
                          已处理
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
            <span className="text-sm text-gray-500">
              共 {total} 条，第 {page}/{totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 退款确认弹窗 */}
      {refundModal && (
        <Modal title="确认退款" onClose={() => setRefundModal(null)}>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">订单号：</span>
                <span className="font-mono text-gray-800">{refundModal.order_no}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">用户：</span>
                <span className="text-gray-800">{refundModal.user_nickname}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">支付金额：</span>
                <span className="font-semibold text-gray-800">¥{refundModal.pay_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">退还积分：</span>
                <span className="font-semibold text-blue-600">{refundModal.total_points}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">支付方式：</span>
                <span className="text-gray-800">{paymentLabels[refundModal.payment_provider] || refundModal.payment_provider}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              确认将 <strong className="text-blue-600">{refundModal.total_points}</strong> 积分退还至用户账户，并标记订单为已退款？
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRefundModal(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                disabled={processing}
              >
                取消
              </button>
              <Button
                onClick={handleRefund}
                className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600"
                disabled={processing}
              >
                {processing ? '处理中...' : '确认退款'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RefundsPage;
