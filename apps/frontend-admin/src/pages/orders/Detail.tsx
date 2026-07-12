import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Copy,
  CreditCard,
  User,
  Calendar,
  Clock,
  FileText,
  Undo2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { orderApi, Order } from '@/api/user';
import {
  formatDate,
  formatPhone,
  formatMoney,
  getOrderStatusInfo,
  getPaymentProviderText,
  getRandomColor,
  copyToClipboard,
} from '@/utils';
import { toast } from '@/components/ui/Toast';

// Modal组件
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
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  </div>
);

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrentPageTitle('订单详情');
    setBreadcrumbs([
      { label: '首页', path: '/dashboard' },
      { label: '订单管理', path: '/orders' },
      { label: '订单详情' },
    ]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  useEffect(() => {
    if (id) {
      loadOrderDetail();
    }
  }, [id]);

  const loadOrderDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await orderApi.getDetail(id);
      setOrder(data);
    } catch (err) {
      console.error('加载订单详情失败:', err);
      toast.error('加载订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadOrderDetail();
  };

  const handleCopy = async (text: string, name: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(`${name}已复制`);
    }
  };

  const handleRefund = async () => {
    if (!id || !refundReason.trim()) {
      toast.error('请填写退款原因');
      return;
    }
    setSubmitting(true);
    try {
      await orderApi.refund(id, refundReason);
      setShowRefundModal(false);
      setRefundReason('');
      toast.success('退款申请已提交');
      loadOrderDetail();
    } catch (err: any) {
      console.error('退款失败:', err);
      toast.error(err.message || '退款失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">订单不存在</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-4 text-[#1E3A5F] hover:underline"
        >
          返回订单列表
        </button>
      </div>
    );
  }

  const statusInfo = getOrderStatusInfo(order.status);
  const canRefund = order.status === 'paid';

  return (
    <div className="space-y-6">
      {/* 顶部导航和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">订单详情</h1>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        {canRefund && (
          <button
            onClick={() => setShowRefundModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            退款
          </button>
        )}
      </div>

      {/* 订单状态卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: statusInfo.bgColor }}
            >
              {order.status === 'paid' || order.status === 'refunded' ? (
                <CheckCircle2 className="w-6 h-6" style={{ color: statusInfo.color }} />
              ) : order.status === 'failed' ? (
                <XCircle className="w-6 h-6" style={{ color: statusInfo.color }} />
              ) : (
                <Clock className="w-6 h-6" style={{ color: statusInfo.color }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-800">{statusInfo.label}</span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ color: statusInfo.color, backgroundColor: statusInfo.bgColor }}
                >
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {order.status === 'paid' && '订单支付成功，积分已到账'}
                {order.status === 'pending' && '等待用户支付'}
                {order.status === 'refunded' && '订单已退款'}
                {order.status === 'failed' && '支付失败'}
                {order.status === 'expired' && '订单已过期'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：订单信息和支付信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 订单信息 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              订单信息
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">订单号</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-800 font-mono">{order.order_no}</span>
                    <button
                      onClick={() => handleCopy(order.order_no, '订单号')}
                      className="p-1 rounded hover:bg-gray-100"
                      title="复制"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">订单ID</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-800 font-mono text-sm">{order.id}</span>
                    <button
                      onClick={() => handleCopy(order.id, '订单ID')}
                      className="p-1 rounded hover:bg-gray-100"
                      title="复制"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">创建时间</label>
                  <div className="flex items-center gap-2 mt-1 text-gray-800">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDate(order.created_at)}
                  </div>
                </div>
                {order.paid_at && (
                  <div>
                    <label className="text-sm text-gray-500">支付时间</label>
                    <div className="flex items-center gap-2 mt-1 text-gray-800">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatDate(order.paid_at)}
                    </div>
                  </div>
                )}
                {order.third_party_order_no && (
                  <div>
                    <label className="text-sm text-gray-500">第三方订单号</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-800 font-mono text-sm">
                        {order.third_party_order_no}
                      </span>
                      <button
                        onClick={() => handleCopy(order.third_party_order_no!, '第三方订单号')}
                        className="p-1 rounded hover:bg-gray-100"
                        title="复制"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {order.remark && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="text-sm text-gray-500">备注</label>
                  <p className="text-gray-800 mt-1">{order.remark}</p>
                </div>
              )}
            </div>
          </div>

          {/* 支付信息 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-500" />
              支付信息
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">支付方式</span>
                <span className="text-gray-800">{getPaymentProviderText(order.payment_provider)}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">支付金额</span>
                <span className="text-xl font-semibold text-gray-800">
                  ¥{formatMoney(order.pay_amount)}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-2">积分详情</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">基础积分</span>
                    <span className="text-gray-800">{order.base_points}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">赠送积分</span>
                    <span className="text-green-600">+{order.bonus_points}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-800 font-medium">总计</span>
                    <span className="text-[#1E3A5F] font-semibold">{order.total_points} 积分</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：用户信息 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              用户信息
            </h2>
            {order.user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {order.user.avatar ? (
                    <img
                      src={order.user.avatar}
                      alt="头像"
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-medium"
                      style={{ backgroundColor: getRandomColor(order.user.nickname || order.user.id) }}
                    >
                      {(order.user.nickname || 'U')?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-800">{order.user.nickname || '用户'}</div>
                    <div className="text-sm text-gray-500">
                      {order.user.phone ? formatPhone(order.user.phone) : '-'}
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">用户ID</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-800 font-mono text-sm">{order.user?.id}</span>
                      <button
                        onClick={() => handleCopy(order.user?.id || '', '用户ID')}
                        className="p-1 rounded hover:bg-gray-100"
                        title="复制"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={() => navigate(`/users/${order.user?.id}`)}
                    className="text-[#1E3A5F] hover:underline text-sm"
                  >
                    查看用户详情 →
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>用户信息不可用</p>
              </div>
            )}
          </div>

          {/* 更多信息 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">更多信息</h2>
            <div className="space-y-3">
              {order.client_ip && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">客户端IP</span>
                  <span className="text-gray-800 text-sm font-mono">{order.client_ip}</span>
                </div>
              )}
              {order.device_info && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">设备信息</span>
                  <span className="text-gray-800 text-sm">{order.device_info}</span>
                </div>
              )}
              {order.reconciliation_status && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">对账状态</span>
                  <span className="text-gray-800 text-sm">
                    {order.reconciliation_status === 'matched' ? '已对账' : '待对账'}
                  </span>
                </div>
              )}
              {order.reconciled_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">对账时间</span>
                  <span className="text-gray-800 text-sm">{formatDate(order.reconciled_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 退款弹窗 */}
      {showRefundModal && (
        <Modal title="订单退款" onClose={() => setShowRefundModal(false)}>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                确定要对该订单进行退款操作吗？退款后积分将从用户账户中扣除。
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">退款原因</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="请输入退款原因"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleRefund}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? '提交中...' : '确认退款'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OrderDetail;
