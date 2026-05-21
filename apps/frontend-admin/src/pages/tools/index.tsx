import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Eye, Trash2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAppStore } from '@/store';
import { toolApi, Tool, ToolListParams, ToolCategory } from '@/api';
import { formatDate } from '@/utils';
import { Button } from '@lcaitool/ui';

const ToolManagement = () => {
  const navigate = useNavigate();
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const [params, setParams] = useState<ToolListParams>({
    page: 1,
    pageSize: 10,
    keyword: '',
    status: undefined,
    category_id: undefined,
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  useEffect(() => {
    setCurrentPageTitle('工具管理');
    setBreadcrumbs([{ label: '首页' }, { label: '工具管理' }]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTools();
  }, [params]);

  const loadCategories = async () => {
    try {
      const data = await toolApi.getCategories();
      setCategories(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.error('加载分类列表失败:', err);
    }
  };

  const loadTools = async () => {
    setLoading(true);
    try {
      const data = await toolApi.getList(params);
      setTools(data.list);
      setTotal(data.total);
    } catch (err) {
      console.error('加载工具列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams((prev) => ({ ...prev, page: 1, keyword: e.target.value }));
  };

  const handleStatusChange = (value: string) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      status: value === '' ? undefined : Number(value),
    }));
  };

  const handleCategoryChange = (value: string) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      category_id: value === '' ? undefined : value,
    }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const handleToggleStatus = async (tool: Tool) => {
    try {
      const newStatus = tool.status === 1 ? 0 : 1;
      await toolApi.toggleStatus(tool.id, newStatus);
      loadTools();
    } catch (err) {
      console.error('切换工具状态失败:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedTool) return;
    try {
      await toolApi.delete(selectedTool.id);
      setShowDeleteModal(false);
      setSelectedTool(null);
      loadTools();
    } catch (err) {
      console.error('删除工具失败:', err);
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return '下线';
      case 1:
        return '上线';
      case 2:
        return '维护中';
      default:
        return '未知';
    }
  };

  const getStatusClass = (status: number) => {
    switch (status) {
      case 0:
        return 'bg-gray-100 text-gray-800';
      case 1:
        return 'bg-green-100 text-green-800';
      case 2:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const parseTags = (tags?: string | null) => {
    if (!tags) return [];
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
  };

  const totalPages = Math.ceil(total / params.pageSize);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索工具名称..."
                value={params.keyword}
                onChange={handleSearch}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none w-64"
              />
            </div>

            <select
              value={params.status === undefined ? '' : String(params.status)}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
            >
              <option value="">全部状态</option>
              <option value="1">上线</option>
              <option value="0">下线</option>
              <option value="2">维护中</option>
            </select>

            <select
              value={params.category_id || ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
            >
              <option value="">全部类目</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => navigate('/tools/create')}
            className="flex items-center gap-2 bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] text-white"
          >
            <Plus size={18} />
            <span>创建工具</span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">工具</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">类目</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">基础费</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">使用次数</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">评分</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">状态</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">创建时间</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : tools.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                tools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {tool.cover_image ? (
                          <img
                            src={tool.cover_image}
                            alt={tool.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 text-lg">{tool.name.charAt(0)}</span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{tool.name}</p>
                          <p className="text-sm text-gray-500">{tool.short_desc || tool.slug}</p>
                          {parseTags(tool.tags).length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {parseTags(tool.tags).slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {parseTags(tool.tags).length > 3 && (
                                <span className="text-xs text-gray-400">+{parseTags(tool.tags).length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{tool.category || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[#1E3A5F]">{tool.base_fee} 积分</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{tool.use_count}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-gray-600">{tool.rating_avg.toFixed(1)}</span>
                        <span className="text-gray-400 text-sm">({tool.rating_count})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(tool.status)}`}>
                        {getStatusText(tool.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{formatDate(tool.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/tools/${tool.id}/demos`)}
                          className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                          title="演示案例"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/tools/${tool.id}/edit`)}
                          className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(tool)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            tool.status === 1
                              ? 'text-orange-500 hover:bg-orange-50'
                              : 'text-green-500 hover:bg-green-50'
                          }`}
                          title={tool.status === 1 ? '下线' : '上线'}
                        >
                          {tool.status === 1 ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTool(tool);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              共 {total} 条记录，第 {params.page} / {totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(params.page - 1)}
                disabled={params.page <= 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
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
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && selectedTool && (
        <Modal
          title="删除工具"
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedTool(null);
          }}
          onConfirm={handleDelete}
          confirmText="删除"
          confirmVariant="danger"
        >
          <p className="text-gray-600">
            确定要删除工具 <span className="font-medium text-gray-800">{selectedTool.name}</span> 吗？此操作无法撤销。
          </p>
        </Modal>
      )}
    </div>
  );
};

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  confirmVariant?: 'primary' | 'danger';
}

const Modal = ({
  title,
  children,
  onClose,
  onConfirm,
  confirmText = '确定',
  confirmVariant = 'primary',
}: ModalProps) => (
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
      <div className="mb-6">{children}</div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        {onConfirm && (
          <Button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white ${
              confirmVariant === 'danger'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669]'
            }`}
          >
            {confirmText}
          </Button>
        )}
      </div>
    </div>
  </div>
);

export default ToolManagement;
