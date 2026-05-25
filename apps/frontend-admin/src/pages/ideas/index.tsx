import { useEffect, useState } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  ThumbsUp,
  Eye,
  CheckCircle2,
  XCircle,
  Hammer,
  Undo2,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { ideasApi, AdminIdea } from '@/api/ideas';
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
  pending: '待审核',
  reviewing: '审核中',
  approved: '已通过',
  rejected: '已拒绝',
  implemented: '已实现',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewing: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  implemented: 'bg-purple-100 text-purple-700',
};

const IdeasPage = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();
  const [ideas, setIdeas] = useState<AdminIdea[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // 弹窗状态
  const [selectedIdea, setSelectedIdea] = useState<AdminIdea | null>(null);
  const [detailModal, setDetailModal] = useState<AdminIdea | null>(null);
  const [actionModal, setActionModal] = useState<{
    idea: AdminIdea;
    action: 'approve' | 'reject' | 'implement' | 'unapprove';
  } | null>(null);
  const [remarkText, setRemarkText] = useState('');

  useEffect(() => {
    setCurrentPageTitle('构思审核');
    setBreadcrumbs([
      { label: '首页', path: '/dashboard' },
      { label: '内容管理' },
      { label: '构思审核' },
    ]);
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (searchKeyword) params.keyword = searchKeyword;
      const res = await ideasApi.getList(params);
      setIdeas(res.items || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error('获取构思列表失败:', error);
      toast.error('获取构思列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, statusFilter, searchKeyword]);

  const handleSearch = () => {
    setPage(1);
    setSearchKeyword(keyword);
  };

  const handleAction = async () => {
    if (!actionModal) return;
    const { idea, action } = actionModal;
    try {
      if (action === 'approve') {
        await ideasApi.approve(idea.id, remarkText || undefined);
        toast.success('构思已审核通过');
      } else if (action === 'reject') {
        if (!remarkText.trim()) {
          toast.warning('请输入驳回原因');
          return;
        }
        await ideasApi.reject(idea.id, remarkText.trim());
        toast.success('构思已驳回');
      } else if (action === 'implement') {
        await ideasApi.implement(idea.id);
        toast.success('构思已标记为已实现');
      } else if (action === 'unapprove') {
        await ideasApi.unapprove(idea.id, remarkText || undefined);
        toast.success('构思已弃审，回退到待审核');
      }
      setActionModal(null);
      setRemarkText('');
      fetchList();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // 判断哪些操作按钮可用
  const canApprove = (status: string) => status === 'pending' || status === 'reviewing';
  const canReject = (status: string) => status === 'pending' || status === 'reviewing';
  const canImplement = (status: string) => status === 'approved';
  const canUnapprove = (status: string) => status === 'approved' || status === 'rejected' || status === 'implemented';

  return (
    <div>
      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索构思标题..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">全部状态</option>
            <option value="pending">待审核</option>
            <option value="reviewing">审核中</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
            <option value="implemented">已实现</option>
          </select>
          <Button onClick={handleSearch} className="btn-primary px-4 py-2 text-white rounded-lg text-sm">
            搜索
          </Button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">标题</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">用户</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">分类</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">投票数</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">状态</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">提交时间</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">加载中...</td>
                </tr>
              ) : ideas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">暂无数据</td>
                </tr>
              ) : (
                ideas.map((idea) => (
                  <tr
                    key={idea.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setDetailModal(idea)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-800 line-clamp-1">
                        {idea.title}
                      </span>
                      {idea.description && (
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{idea.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{idea.user_nickname}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{idea.category || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <ThumbsUp size={14} className="text-blue-500" />
                        <span>{idea.vote_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[idea.status] || statusColors.pending}`}>
                        {statusLabels[idea.status] || idea.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{formatDate(idea.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canApprove(idea.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionModal({ idea, action: 'approve' });
                              setRemarkText('');
                            }}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                            title="审核通过"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {canReject(idea.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionModal({ idea, action: 'reject' });
                              setRemarkText('');
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            title="驳回"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        {canImplement(idea.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionModal({ idea, action: 'implement' });
                            }}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"
                            title="标记已实现"
                          >
                            <Hammer size={16} />
                          </button>
                        )}
                        {canUnapprove(idea.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionModal({ idea, action: 'unapprove' });
                              setRemarkText('');
                            }}
                            className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 transition-colors"
                            title="弃审"
                          >
                            <Undo2 size={16} />
                          </button>
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

      {/* 详情弹窗 */}
      {detailModal && (
        <Modal title="构思详情" onClose={() => setDetailModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">状态</label>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[detailModal.status] || statusColors.pending}`}>
                {statusLabels[detailModal.status] || detailModal.status}
              </span>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">标题</label>
              <p className="text-sm font-medium text-gray-800">{detailModal.title}</p>
            </div>
            {detailModal.description && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">描述</label>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{detailModal.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">分类</label>
                <p className="text-sm text-gray-800">{detailModal.category || '-'}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">提交人</label>
                <p className="text-sm text-gray-800">{detailModal.user_nickname}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">投票数</label>
                <p className="text-sm font-medium text-blue-600">{detailModal.vote_count}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">浏览数</label>
                <p className="text-sm text-gray-800">{detailModal.view_count}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">提交时间</label>
              <p className="text-sm text-gray-800">{formatDate(detailModal.created_at)}</p>
            </div>
            {detailModal.tags && detailModal.tags.length > 0 && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">标签</label>
                <div className="flex flex-wrap gap-1">
                  {detailModal.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {detailModal.admin_remark && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">管理员备注</label>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{detailModal.admin_remark}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 操作确认弹窗 */}
      {actionModal && (
        <Modal
          title={
            actionModal.action === 'approve'
              ? '审核通过构思'
              : actionModal.action === 'reject'
              ? '驳回构思'
              : actionModal.action === 'implement'
              ? '标记为已实现'
              : '弃审构思'
          }
          onClose={() => { setActionModal(null); setRemarkText(''); }}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                构思：<span className="font-medium text-gray-800">{actionModal.idea.title}</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                用户：<span className="font-medium text-gray-800">{actionModal.idea.user_nickname}</span>
              </p>
            </div>

            {actionModal.action === 'approve' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注（可选）</label>
                <textarea
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  placeholder="审核备注..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            )}

            {actionModal.action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">驳回原因 *</label>
                <textarea
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  placeholder="请输入驳回原因..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  required
                />
              </div>
            )}

            {actionModal.action === 'implement' && (
              <p className="text-sm text-gray-600">
                确认将该构思标记为「已实现」？
              </p>
            )}

            {actionModal.action === 'unapprove' && (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  确认弃审该构思？弃审后将回退到「待审核」状态，需重新审核。
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注（可选）</label>
                  <textarea
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                    placeholder="弃审原因..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setActionModal(null); setRemarkText(''); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleAction}
                className={`px-4 py-2 text-sm text-white rounded-lg ${
                  actionModal.action === 'approve'
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : actionModal.action === 'reject'
                    ? 'bg-red-500 hover:bg-red-600'
                    : actionModal.action === 'implement'
                    ? 'bg-purple-500 hover:bg-purple-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {actionModal.action === 'approve'
                  ? '确认通过'
                  : actionModal.action === 'reject'
                  ? '确认驳回'
                  : actionModal.action === 'implement'
                  ? '确认标记'
                  : '确认弃审'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default IdeasPage;
