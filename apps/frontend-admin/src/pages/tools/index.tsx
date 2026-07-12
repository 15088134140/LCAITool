import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Eye, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useAppStore } from '@/store';
import { toolApi, Tool, ToolListParams, ToolCategory } from '@/api';
import { formatDate } from '@/utils';
import { Button, Pagination, Modal } from '@lcaitool/ui';
import { EmptyState, TableSkeleton } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  // 批量操作
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchOperating, setBatchOperating] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);

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
      toast.error('加载工具列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
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
      toast.success(newStatus === 1 ? '工具已上线' : '工具已下线');
      loadTools();
    } catch (err) {
      console.error('切换工具状态失败:', err);
      toast.error('切换工具状态失败');
    }
  };

  const handleDelete = async () => {
    if (!selectedTool) return;
    try {
      await toolApi.delete(selectedTool.id);
      toast.success('工具已删除');
      setShowDeleteModal(false);
      setSelectedTool(null);
      loadTools();
    } catch (err) {
      console.error('删除工具失败:', err);
      toast.error('删除工具失败');
    }
  };

  // 批量选择
  const allSelected = tools.length > 0 && tools.every((t) => selectedIds.has(t.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tools.map((t) => t.id)));
    }
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  // 批量上下线（前端循环单条接口 + 进度反馈，后端暂无批量接口）
  const handleBatchToggleStatus = async (newStatus: number) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBatchOperating(true);
    let success = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await toolApi.toggleStatus(id, newStatus);
        success++;
      } catch {
        failed++;
      }
    }
    setBatchOperating(false);
    toast.success(
      `批量${newStatus === 1 ? '上线' : '下线'}完成：成功 ${success} 项${failed ? `，失败 ${failed} 项` : ''}`
    );
    clearSelection();
    loadTools();
  };

  // 批量删除
  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBatchOperating(true);
    let success = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await toolApi.delete(id);
        success++;
      } catch {
        failed++;
      }
    }
    setBatchOperating(false);
    setShowBatchDeleteModal(false);
    toast.success(`批量删除完成：成功 ${success} 项${failed ? `，失败 ${failed} 项` : ''}`);
    clearSelection();
    loadTools();
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
                value={searchInput}
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

      {selectedIds.size > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-600">已选 {selectedIds.size} 项</span>
          <button
            onClick={() => handleBatchToggleStatus(1)}
            disabled={batchOperating}
            className="px-3 py-1.5 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            批量上线
          </button>
          <button
            onClick={() => handleBatchToggleStatus(0)}
            disabled={batchOperating}
            className="px-3 py-1.5 text-sm text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            批量下线
          </button>
          <button
            onClick={() => setShowBatchDeleteModal(true)}
            disabled={batchOperating}
            className="px-3 py-1.5 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            批量删除
          </button>
          <button
            onClick={clearSelection}
            disabled={batchOperating}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            取消选择
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={tools.length === 0}
                    className="w-4 h-4 rounded border-gray-300"
                    aria-label="全选"
                  />
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">工具</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">类目</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">基础费</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">使用次数</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">评分</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">状态</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Mock</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600" title="每次 AI 调用的提示词和响应是否记录到 prompts.md 中">提示词记录</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">创建时间</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <TableSkeleton cols={11} />
              ) : tools.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <EmptyState title="暂无数据" />
                  </td>
                </tr>
              ) : (
                tools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tool.id)}
                        onChange={() => toggleOne(tool.id)}
                        className="w-4 h-4 rounded border-gray-300"
                        aria-label={`选择 ${tool.name}`}
                      />
                    </td>
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
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tool.is_mock_enabled
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {tool.is_mock_enabled ? '开启' : '关闭'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {tool.is_prompt_logging_enabled === false ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500" title="提示词记录已关闭">
                          <svg className="inline w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                          关闭
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700" title="开启：AI 调用记录将写入 prompts.md">
                          <svg className="inline w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                          开启
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{formatDate(tool.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/tools/${tool.id}/demos`)}
                          className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                          title="演示案例"
                          aria-label="演示案例"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/tools/${tool.id}/edit`)}
                          className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                          title="编辑"
                          aria-label="编辑"
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
                          aria-label={tool.status === 1 ? '下线' : '上线'}
                        >
                          {tool.status === 1 ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTool(tool);
                            setShowDeleteModal(true);
                          }}
                          className="inline-flex items-center gap-1 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                          aria-label="删除"
                        >
                          <Trash2 size={16} />
                          <span className="text-xs">删除</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

      {showBatchDeleteModal && (
        <Modal
          title="批量删除工具"
          onClose={() => setShowBatchDeleteModal(false)}
          onConfirm={handleBatchDelete}
          confirmText="删除"
          confirmVariant="danger"
        >
          <p className="text-gray-600">
            确定要删除选中的 <span className="font-medium text-gray-800">{selectedIds.size}</span> 个工具吗？此操作无法撤销。
          </p>
        </Modal>
      )}
    </div>
  );
};




export default ToolManagement;
