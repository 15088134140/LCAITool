import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, X, CheckCircle2, XCircle } from 'lucide-react';
import { useAppStore } from '@/store';
import { userApi, Verification } from '@/api/user';
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
          <X size={18} className="text-gray-500" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const VerificationManagement = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [verifyAction, setVerifyAction] = useState<'approve' | 'reject'>('approve');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrentPageTitle('实名认证审核');
    setBreadcrumbs([
      { label: '首页', path: '/dashboard' },
      { label: '用户管理' },
      { label: '实名认证审核' },
    ]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  useEffect(() => {
    loadVerifications();
  }, [page, statusFilter]);

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const status = statusFilter === '' ? undefined : statusFilter === 'verified';
      const data = await userApi.getVerifications(page, pageSize, status);
      setVerifications(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('加载认证列表失败:', err);
      toast.error('加载认证列表失败');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const openVerifyModal = (verification: Verification, action: 'approve' | 'reject') => {
    setSelectedVerification(verification);
    setVerifyAction(action);
    setRejectReason('');
    setShowVerifyModal(true);
  };

  const handleVerify = async () => {
    if (!selectedVerification) return;
    setSubmitting(true);
    try {
      if (verifyAction === 'approve') {
        await userApi.approveVerification(selectedVerification.user_id);
        toast.success('实名认证审核通过');
      } else {
        await userApi.rejectVerification(selectedVerification.user_id, rejectReason);
        toast.success('实名认证已驳回');
      }
      setShowVerifyModal(false);
      setRejectReason('');
      setSelectedVerification(null);
      loadVerifications();
    } catch (err: any) {
      console.error('审核失败:', err);
      toast.error(err.message || '审核失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* 状态筛选 */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
            >
              <option value="">全部</option>
              <option value="verified">已认证</option>
              <option value="unverified">未认证</option>
            </select>

            <span className="text-sm text-gray-500">
              共 {total} 条记录
            </span>
          </div>
        </div>
      </div>

      {/* 认证列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">用户昵称</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">真实姓名</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">手机号</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">认证状态</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : verifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                verifications.map((verification) => (
                  <tr key={verification.user_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white font-medium">
                          {(verification.nickname || 'U')?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800">
                          {verification.nickname || '未设置昵称'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {verification.real_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {verification.phone || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          verification.id_card_verified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {verification.id_card_verified ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        {verification.id_card_verified ? '已认证' : '未认证'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {!verification.id_card_verified && verification.real_name && (
                          <button
                            onClick={() => openVerifyModal(verification, 'approve')}
                            className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                          >
                            通过
                          </button>
                        )}
                        {!verification.id_card_verified && verification.real_name && (
                          <button
                            onClick={() => openVerifyModal(verification, 'reject')}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            驳回
                          </button>
                        )}
                        {verification.id_card_verified && (
                          <span className="text-sm text-gray-400">已处理</span>
                        )}
                        {!verification.real_name && !verification.id_card_verified && (
                          <span className="text-sm text-gray-400">未提交</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (page > 3) {
                    pageNum = page - 2 + i;
                  }
                  if (page > totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  }
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-9 h-9 rounded-lg font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-[#1E3A5F] text-white'
                        : 'border border-gray-300 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 审核弹窗 */}
      {showVerifyModal && selectedVerification && (
        <Modal
          title={verifyAction === 'approve' ? '审核通过' : '驳回认证'}
          onClose={() => {
            setShowVerifyModal(false);
            setSelectedVerification(null);
          }}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                用户：<span className="font-medium text-gray-800">{selectedVerification.nickname}</span>
              </p>
              {selectedVerification.real_name && (
                <p className="text-sm text-gray-600 mt-1">
                  姓名：<span className="font-medium text-gray-800">{selectedVerification.real_name}</span>
                </p>
              )}
            </div>

            {verifyAction === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  驳回原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="请输入驳回原因"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
                  required
                />
              </div>
            )}

            {verifyAction === 'approve' ? (
              <p className="text-sm text-gray-600">确认通过该用户的实名认证申请吗？</p>
            ) : (
              <p className="text-sm text-gray-600">确认驳回该用户的实名认证申请吗？</p>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowVerifyModal(false);
                  setSelectedVerification(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleVerify}
                className={`px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
                  verifyAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={submitting}
              >
                {submitting
                  ? '提交中...'
                  : verifyAction === 'approve'
                  ? '确认通过'
                  : '确认驳回'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default VerificationManagement;
