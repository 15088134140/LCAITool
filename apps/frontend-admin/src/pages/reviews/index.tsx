import { useEffect, useState } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  Star,
  MessageSquare,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { ratingApi, AdminRating } from '@/api/rating';
import { toolApi } from '@/api/tool';
import type { Tool } from '@/api/tool';
import { formatDate } from '@/utils';
import { Button, Pagination, Modal } from '@lcaitool/ui';
import { EmptyState, TableSkeleton } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';



const StarRating = ({ value }: { value: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={14}
        className={star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}
      />
    ))}
  </div>
);

const ReviewsPage = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  const [reviews, setReviews] = useState<AdminRating[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // 筛选参数
  const [params, setParams] = useState({
    page: 1,
    pageSize: 10,
    tool_id: '',
    rating_value: undefined as number | undefined,
    status: undefined as number | undefined,
    keyword: '',
  });
  const [searchInput, setSearchInput] = useState('');

  // 搜索防抖：避免每键即请求造成的卡顿与多余网络请求。
  const debouncedKeyword = useDebouncedValue(searchInput, 300);
  useEffect(() => {
    setParams((prev) =>
      prev.keyword === debouncedKeyword
        ? prev
        : { ...prev, page: 1, keyword: debouncedKeyword }
    );
  }, [debouncedKeyword]);

  // 工具列表（用于下拉筛选）
  const [tools, setTools] = useState<Tool[]>([]);

  // 弹窗状态
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<AdminRating | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrentPageTitle('评价管理');
    setBreadcrumbs([
      { label: '首页', path: '/dashboard' },
      { label: '内容管理' },
      { label: '评价管理' },
    ]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  // 加载工具列表（用于下拉筛选）
  useEffect(() => {
    loadTools();
  }, []);

  // 加载评价列表
  useEffect(() => {
    loadReviews();
  }, [params]);

  const loadTools = async () => {
    try {
      const result = await toolApi.getList({ page: 1, pageSize: 100 });
      setTools(result.list || []);
    } catch (err) {
      console.error('加载工具列表失败:', err);
    }
  };

  const loadReviews = async () => {
    setLoading(true);
    try {
      const result = await ratingApi.getList({
        page: params.page,
        pageSize: params.pageSize,
        tool_id: params.tool_id || undefined,
        rating_value: params.rating_value,
        status: params.status,
        keyword: params.keyword || undefined,
      });
      setReviews(result.items || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error('加载评价列表失败:', err);
      toast.error('加载评价列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  // 筛选
  const handleFilterChange = (key: string, value: any) => {
    setParams((prev) => ({ ...prev, page: 1, [key]: value }));
  };

  // 分页
  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  // 切换显示状态
  const handleToggleStatus = async (review: AdminRating) => {
    try {
      const newStatus = review.status === 1 ? 0 : 1;
      await ratingApi.toggleStatus(review.id, newStatus);
      toast.success(newStatus === 1 ? '评价已显示' : '评价已隐藏');
      loadReviews();
    } catch (err: any) {
      console.error('切换评价状态失败:', err);
      toast.error(err.message || '操作失败');
    }
  };

  // 打开回复弹窗
  const openReplyModal = (review: AdminRating) => {
    setSelectedReview(review);
    setReplyContent(review.admin_reply || '');
    setShowReplyModal(true);
  };

  // 提交回复
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || !replyContent.trim()) return;
    setSubmitting(true);
    try {
      await ratingApi.reply(selectedReview.id, replyContent.trim());
      toast.success('回复成功');
      setShowReplyModal(false);
      setSelectedReview(null);
      setReplyContent('');
      loadReviews();
    } catch (err: any) {
      console.error('回复失败:', err);
      toast.error(err.message || '回复失败');
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
            {/* 搜索框 */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索评价内容..."
                value={searchInput}
                onChange={handleSearch}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none w-64"
              />
            </div>

            {/* 工具筛选 */}
            <select
              value={params.tool_id}
              onChange={(e) => handleFilterChange('tool_id', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
            >
              <option value="">全部工具</option>
              {tools.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.name}
                </option>
              ))}
            </select>

            {/* 评分筛选 */}
            <select
              value={params.rating_value ?? ''}
              onChange={(e) =>
                handleFilterChange(
                  'rating_value',
                  e.target.value === '' ? undefined : Number(e.target.value)
                )
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
            >
              <option value="">全部评分</option>
              {[5, 4, 3, 2, 1].map((v) => (
                <option key={v} value={v}>
                  {v} 星
                </option>
              ))}
            </select>

            {/* 状态筛选 */}
            <select
              value={params.status ?? ''}
              onChange={(e) =>
                handleFilterChange(
                  'status',
                  e.target.value === '' ? undefined : Number(e.target.value)
                )
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
            >
              <option value="">全部状态</option>
              <option value={1}>显示</option>
              <option value={0}>隐藏</option>
            </select>
          </div>
        </div>
      </div>

      {/* 评价列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">用户</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">工具</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">评分</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">评价内容</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">状态</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">时间</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton cols={7} />
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="暂无数据" />
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 text-sm">
                          {review.user_nickname}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{review.tool_name}</td>
                    <td className="px-6 py-4">
                      <StarRating value={review.rating} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-600 truncate" title={review.content || ''}>
                          {review.content || '-'}
                        </p>
                        {review.admin_reply && (
                          <p className="text-xs text-[#059669] mt-1 truncate">
                            回复: {review.admin_reply}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          review.status === 1
                            ? 'text-green-600 bg-green-50'
                            : 'text-gray-500 bg-gray-100'
                        }`}
                      >
                        {review.status === 1 ? '显示' : '隐藏'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(review.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(review)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            review.status === 1
                              ? 'text-amber-500 hover:bg-amber-50'
                              : 'text-green-500 hover:bg-green-50'
                          }`}
                          title={review.status === 1 ? '隐藏' : '显示'}
                        >
                          {review.status === 1 ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => openReplyModal(review)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="回复"
                        >
                          <MessageSquare size={16} />
                        </button>
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
          page={params.page}
          pageSize={params.pageSize}
          total={total}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) =>
            setParams((prev) => ({ ...prev, page: 1, pageSize: size }))
          }
        />
      </div>

      {/* 回复弹窗 */}
      {showReplyModal && selectedReview && (
        <Modal title="回复评价" onClose={() => setShowReplyModal(false)}>
          <form onSubmit={handleReply} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">用户：</span>
                <span className="text-sm font-medium text-gray-800">
                  {selectedReview.user_nickname}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">评分：</span>
                <StarRating value={selectedReview.rating} />
              </div>
              <div>
                <span className="text-sm text-gray-500">内容：</span>
                <p className="text-sm text-gray-700 mt-1">{selectedReview.content || '无文字内容'}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">回复内容</label>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="请输入回复内容..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowReplyModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                取消
              </button>
              <Button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg"
                disabled={submitting || !replyContent.trim()}
              >
                {submitting ? '提交中...' : '提交回复'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ReviewsPage;
