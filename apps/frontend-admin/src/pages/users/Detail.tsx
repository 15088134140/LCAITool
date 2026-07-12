import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Coins,
  UserX,
  UserCheck,
  Copy,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { userApi, User, PointTransaction } from '@/api/user';
import {
  formatDate,
  formatPhone,
  getRandomColor,
  getUserStatusInfo,
  getVerificationStatusInfo,
  getTransactionTypeText,
  copyToClipboard,
} from '@/utils';
import { Button } from '@lcaitool/ui';
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

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'points' | 'works'>('info');

  // 弹窗状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    email: '',
  });
  const [pointsData, setPointsData] = useState({
    points: 0,
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrentPageTitle('用户详情');
    setBreadcrumbs([
      { label: '首页', path: '/dashboard' },
      { label: '用户管理', path: '/users' },
      { label: '用户详情' },
    ]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  useEffect(() => {
    if (id) {
      loadUserDetail();
    }
  }, [id]);

  const loadUserDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await userApi.getDetail(id);
      setUser(data);
      setFormData({
        nickname: data.nickname || '',
        phone: data.phone || '',
        email: data.email || '',
      });
    } catch (err) {
      console.error('加载用户详情失败:', err);
      toast.error('加载用户详情失败');
    } finally {
      setLoading(false);
    }
  };

  const loadPointHistory = async (page: number = 1) => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const data = await userApi.getPointHistory(id, page, 10);
      if (page === 1) {
        setPointHistory(data.items);
      } else {
        setPointHistory(prev => [...prev, ...data.items]);
      }
      setHasMoreHistory(data.items.length === 10 && data.page * 10 < data.total);
      setHistoryPage(page);
    } catch (err) {
      console.error('加载积分历史失败:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'points' && pointHistory.length === 0) {
      loadPointHistory(1);
    }
  }, [activeTab]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    setSubmitting(true);
    try {
      await userApi.update({
        id,
        nickname: formData.nickname,
        phone: formData.phone,
        email: formData.email,
      });
      setShowEditModal(false);
      toast.success('更新成功');
      loadUserDetail();
    } catch (err: any) {
      console.error('更新用户失败:', err);
      toast.error(err.message || '更新用户失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    setSubmitting(true);
    try {
      await userApi.adjustPoints({
        userId: id,
        points: pointsData.points,
        reason: pointsData.reason,
      });
      setShowPointsModal(false);
      setPointsData({ points: 0, reason: '' });
      toast.success('积分调整成功');
      loadUserDetail();
      if (activeTab === 'points') {
        loadPointHistory(1);
      }
    } catch (err: any) {
      console.error('调整积分失败:', err);
      toast.error(err.message || '调整积分失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!id || !user) return;
    try {
      const newStatus = user.status === 1 ? 'disabled' : 'active';
      await userApi.toggleStatus(id, newStatus);
      toast.success(user.status === 1 ? '用户已禁用' : '用户已启用');
      loadUserDetail();
    } catch (err: any) {
      console.error('切换用户状态失败:', err);
      toast.error(err.message || '操作失败');
    }
  };

  const handleCopyId = async () => {
    if (id) {
      const success = await copyToClipboard(id);
      if (success) {
        toast.success('已复制到剪贴板');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">用户不存在</p>
        <button
          onClick={() => navigate('/users')}
          className="mt-4 text-[#1E3A5F] hover:underline"
        >
          返回用户列表
        </button>
      </div>
    );
  }

  const statusInfo = getUserStatusInfo(user.status);
  const verificationInfo = getVerificationStatusInfo(user.id_card_verified);

  return (
    <div className="space-y-6">
      {/* 顶部导航和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/users')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">用户详情</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            编辑资料
          </button>
          <button
            onClick={() => setShowPointsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg hover:from-[#047857] hover:to-[#059669] transition-all"
          >
            <Coins className="w-4 h-4" />
            调整积分
          </button>
          <button
            onClick={handleToggleStatus}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              user.status === 1
                ? 'border border-red-300 text-red-600 hover:bg-red-50'
                : 'border border-green-300 text-green-600 hover:bg-green-50'
            }`}
          >
            {user.status === 1 ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            {user.status === 1 ? '禁用用户' : '启用用户'}
          </button>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-6">
          {/* 头像和基本信息 */}
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-medium"
              style={{ backgroundColor: getRandomColor(user.nickname || user.id) }}
            >
              {(user.nickname || 'U')?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                {user.nickname || '未设置昵称'}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ color: statusInfo.color, backgroundColor: statusInfo.bgColor }}
                >
                  {statusInfo.label}
                </span>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{ color: verificationInfo.color, backgroundColor: verificationInfo.bgColor }}
                >
                  {verificationInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* 积分显示 */}
          <div className="ml-auto text-right">
            <div className="text-3xl font-bold text-[#1E3A5F]">{user.balance}</div>
            <div className="text-sm text-gray-500">可用积分</div>
          </div>
        </div>

        {/* 详细信息 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-sm text-gray-500">用户ID</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-800 font-mono text-sm">{user.id}</span>
              <button
                onClick={handleCopyId}
                className="p-1 rounded hover:bg-gray-100"
                title="复制"
              >
                <Copy className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-500">手机号</label>
            <p className="text-gray-800 mt-1">{formatPhone(user.phone || '') || '未绑定'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">邮箱</label>
            <p className="text-gray-800 mt-1">{user.email || '未绑定'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">真实姓名</label>
            <p className="text-gray-800 mt-1">{user.real_name || '未认证'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">注册时间</label>
            <p className="text-gray-800 mt-1">{formatDate(user.created_at)}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">更新时间</label>
            <p className="text-gray-800 mt-1">{formatDate(user.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <div className="flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'info'
                  ? 'text-[#1E3A5F] border-b-2 border-[#1E3A5F]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                账户信息
              </div>
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'points'
                  ? 'text-[#1E3A5F] border-b-2 border-[#1E3A5F]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                积分记录
              </div>
            </button>
            <button
              onClick={() => setActiveTab('works')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'works'
                  ? 'text-[#1E3A5F] border-b-2 border-[#1E3A5F]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                作品记录
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">账户状态</div>
                      <div className="font-medium text-gray-800">{statusInfo.label}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">认证状态</div>
                      <div className="font-medium text-gray-800">{verificationInfo.label}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center py-8 text-gray-500">
                更多账户信息功能开发中...
              </div>
            </div>
          )}

          {activeTab === 'points' && (
            <div>
              {pointHistory.length === 0 && !historyLoading ? (
                <div className="text-center py-8 text-gray-500">
                  暂无积分记录
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">时间</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">类型</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">变更积分</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">变更后余额</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">原因</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">操作者</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pointHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {formatDate(item.created_at)}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-800">
                                {getTransactionTypeText(item.type)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-sm font-medium ${
                                item.amount >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {item.amount >= 0 ? '+' : ''}{item.amount}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-800">
                              {item.balance_after}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.reason || '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {item.operator || '系统'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {hasMoreHistory && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => loadPointHistory(historyPage + 1)}
                        disabled={historyLoading}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {historyLoading ? '加载中...' : '加载更多'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'works' && (
            <div className="text-center py-8 text-gray-500">
              作品记录功能开发中...
            </div>
          )}
        </div>
      </div>

      {/* 编辑用户弹窗 */}
      {showEditModal && (
        <Modal title="编辑用户" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="请输入昵称"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入手机号"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="请输入邮箱"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                取消
              </button>
              <Button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg"
                disabled={submitting}
              >
                {submitting ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 调整积分弹窗 */}
      {showPointsModal && (
        <Modal title="调整积分" onClose={() => setShowPointsModal(false)}>
          <form onSubmit={handleAdjustPoints} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">
                当前用户: <span className="font-medium text-gray-800">{user.nickname}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                当前积分: <span className="font-semibold text-[#1E3A5F]">{user.balance}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">调整积分</label>
              <p className="text-xs text-gray-500 mb-2">正数增加，负数扣除</p>
              <input
                type="number"
                value={pointsData.points}
                onChange={(e) => setPointsData({ ...pointsData, points: Number(e.target.value) })}
                placeholder="请输入积分数值"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">调整原因</label>
              <textarea
                value={pointsData.reason}
                onChange={(e) => setPointsData({ ...pointsData, reason: e.target.value })}
                placeholder="请输入调整原因"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowPointsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                取消
              </button>
              <Button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg"
                disabled={submitting}
              >
                {submitting ? '调整中...' : '确认调整'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default UserDetail;
