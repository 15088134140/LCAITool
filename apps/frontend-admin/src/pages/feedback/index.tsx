import { useEffect, useState } from 'react';
import {
  Search,
  MessageSquare,
  Award,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { feedbackApi, AdminFeedback } from '@/api/feedback';
import { formatDate } from '@/utils';
import { Button, Pagination, Modal } from '@lcaitool/ui';
import { EmptyState, TableSkeleton } from '@/components/ui';
import { toast } from '@/components/ui/Toast';

// Modal 组件


const typeLabels: Record<string, string> = {
  feature: '功能建议',
  bug: 'Bug反馈',
  consult: '使用咨询',
  other: '其他',
};

const typeColors: Record<string, string> = {
  feature: 'bg-blue-100 text-blue-700',
  bug: 'bg-red-100 text-red-700',
  consult: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-700',
};

const statusLabels: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  adopted: '已采纳',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  adopted: 'bg-purple-100 text-purple-700',
};

const FeedbackPage = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();
  const [feedbacks, setFeedbacks] = useState<AdminFeedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // 回复弹窗
  const [replyModal, setReplyModal] = useState<{ id: string; title: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // 奖励弹窗
  const [rewardModal, setRewardModal] = useState<{ id: string; title: string } | null>(null);
  const [rewardPoints, setRewardPoints] = useState(20);

  // 详情弹窗
  const [detailModal, setDetailModal] = useState<AdminFeedback | null>(null);

  useEffect(() => {
    setCurrentPageTitle('反馈管理');
    setBreadcrumbs([
      { label: '首页', path: '/dashboard' },
      { label: '内容管理' },
      { label: '反馈管理' },
    ]);
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params: any = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (searchKeyword) params.keyword = searchKeyword;
      const res = await feedbackApi.getList(params);
      setFeedbacks(res.items || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error('获取反馈列表失败:', error);
      toast.error('获取反馈列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, pageSize, statusFilter, typeFilter, searchKeyword]);

  const handleSearch = () => {
    setPage(1);
    setSearchKeyword(keyword);
  };

  const handleReply = async () => {
    if (!replyModal || !replyContent.trim()) {
      toast.warning('请输入回复内容');
      return;
    }
    try {
      await feedbackApi.reply(replyModal.id, replyContent.trim());
      toast.success('回复成功');
      setReplyModal(null);
      setReplyContent('');
      fetchList();
    } catch (error) {
      toast.error('回复失败');
    }
  };

  const handleReward = async () => {
    if (!rewardModal || rewardPoints <= 0) {
      toast.warning('请输入有效的积分数量');
      return;
    }
    try {
      await feedbackApi.reward(rewardModal.id, rewardPoints);
      toast.success(`已奖励 ${rewardPoints} 积分`);
      setRewardModal(null);
      setRewardPoints(20);
      fetchList();
    } catch (error) {
      toast.error('奖励发放失败');
    }
  };

  return (
    <div>
      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索反馈标题..."
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
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="resolved">已解决</option>
            <option value="adopted">已采纳</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">全部类型</option>
            <option value="feature">功能建议</option>
            <option value="bug">Bug反馈</option>
            <option value="consult">使用咨询</option>
            <option value="other">其他</option>
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
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">标题</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">类型</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">用户</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">状态</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">提交时间</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={6} />
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="暂无反馈数据" />
                  </td>
                </tr>
              ) : (
                feedbacks.map((fb) => (
                  <tr
                    key={fb.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setDetailModal(fb)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-800 line-clamp-1">
                        {fb.title}
                      </span>
                      {fb.description && (
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{fb.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColors[fb.type] || typeColors.other}`}>
                        {typeLabels[fb.type] || fb.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{fb.user_nickname}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[fb.status] || statusColors.pending}`}>
                        {statusLabels[fb.status] || fb.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{formatDate(fb.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyModal({ id: fb.id, title: fb.title });
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                          title="回复"
                        >
                          <MessageSquare size={16} />
                        </button>
                        {fb.status !== 'adopted' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRewardModal({ id: fb.id, title: fb.title });
                            }}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500 transition-colors"
                            title="采纳并奖励"
                          >
                            <Award size={16} />
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
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {/* 详情弹窗 */}
      {detailModal && (
        <Modal title="反馈详情" onClose={() => setDetailModal(null)}>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-500">类型：</span>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColors[detailModal.type] || typeColors.other}`}>
                {typeLabels[detailModal.type] || detailModal.type}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-500">状态：</span>
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
                <label className="block text-sm text-gray-500 mb-1">详细描述</label>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{detailModal.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">用户</label>
                <p className="text-sm text-gray-800">{detailModal.user_nickname}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">提交时间</label>
                <p className="text-sm text-gray-800">{formatDate(detailModal.created_at)}</p>
              </div>
            </div>
            {detailModal.contact && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">联系方式</label>
                <p className="text-sm text-gray-800">{detailModal.contact}</p>
              </div>
            )}
            {detailModal.admin_reply && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">管理员回复</label>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{detailModal.admin_reply}</p>
              </div>
            )}
            {detailModal.reply_points && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">奖励积分</label>
                <p className="text-sm font-medium text-purple-600">{detailModal.reply_points} 积分</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 回复弹窗 */}
      {replyModal && (
        <Modal title={`回复反馈：${replyModal.title}`} onClose={() => { setReplyModal(null); setReplyContent(''); }}>
          <textarea
            rows={4}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="请输入回复内容..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-4"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setReplyModal(null); setReplyContent(''); }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleReply}
              className="px-4 py-2 text-sm text-white bg-emerald-500 rounded-lg hover:bg-emerald-600"
            >
              提交回复
            </button>
          </div>
        </Modal>
      )}

      {/* 奖励弹窗 */}
      {rewardModal && (
        <Modal title={`采纳奖励：${rewardModal.title}`} onClose={() => { setRewardModal(null); setRewardPoints(20); }}>
          <div className="mb-4">
            <label className="block text-sm text-gray-500 mb-2">奖励积分数量</label>
            <input
              type="number"
              min={1}
              value={rewardPoints}
              onChange={(e) => setRewardPoints(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-400 mt-1">采纳反馈并奖励用户积分</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setRewardModal(null); setRewardPoints(20); }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleReward}
              className="px-4 py-2 text-sm text-white bg-purple-500 rounded-lg hover:bg-purple-600"
            >
              确认奖励
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FeedbackPage;
