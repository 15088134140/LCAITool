import { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { useAppStore } from '@/store';
import { toolApi, ToolCategory } from '@/api';
import { formatDate } from '@/utils';
import { Button } from '@lcaitool/ui';
import { toast } from '@/components/ui/Toast';

const CategoryManagement = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ToolCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ToolCategory | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: '',
    description: '',
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    setCurrentPageTitle('分类管理');
    setBreadcrumbs([
      { label: '首页', path: '/dashboard' },
      { label: '工具管理' },
      { label: '分类管理' },
    ]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await toolApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('加载分类列表失败:', err);
      toast.error('加载分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      slug: '',
      icon: '',
      description: '',
      sort_order: 0,
      is_active: true,
    });
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    resetFormData();
    setShowFormModal(true);
  };

  const openEditModal = (category: ToolCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      icon: category.icon || '',
      description: category.description || '',
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    setShowFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await toolApi.updateCategory(editingCategory.id, formData);
        toast.success('分类更新成功');
      } else {
        await toolApi.createCategory(formData);
        toast.success('分类创建成功');
      }
      setShowFormModal(false);
      setEditingCategory(null);
      resetFormData();
      loadCategories();
    } catch (err: any) {
      console.error('保存分类失败:', err);
      toast.error(err.message || '保存分类失败');
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      await toolApi.deleteCategory(deletingCategory.id);
      setShowDeleteModal(false);
      setDeletingCategory(null);
      toast.success('分类已删除');
      loadCategories();
    } catch (err: any) {
      console.error('删除分类失败:', err);
      toast.error(err.message || '删除分类失败');
    }
  };

  const handleToggleActive = async (category: ToolCategory) => {
    try {
      await toolApi.updateCategory(category.id, { is_active: !category.is_active });
      toast.success(category.is_active ? '分类已禁用' : '分类已启用');
      loadCategories();
    } catch (err: any) {
      console.error('切换分类状态失败:', err);
      toast.error(err.message || '操作失败');
    }
  };

  const filteredCategories = categories.filter((cat) => {
    if (!searchKeyword.trim()) return true;
    const keyword = searchKeyword.toLowerCase();
    return (
      cat.name.toLowerCase().includes(keyword) ||
      cat.slug.toLowerCase().includes(keyword) ||
      (cat.description || '').toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="space-y-6">
      {/* 搜索和操作栏 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索分类名称..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none w-64"
              />
            </div>
          </div>

          <Button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] text-white"
          >
            <Plus size={18} />
            <span>新增分类</span>
          </Button>
        </div>
      </div>

      {/* 分类列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">名称</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">标识</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">图标</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">排序</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">工具数</th>
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
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-800">{category.name}</span>
                      {category.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{category.slug}</code>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {category.icon || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{category.sort_order}</td>
                    <td className="px-6 py-4 text-gray-600">{category.tool_count}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          category.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {category.is_active ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {formatDate(category.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(category)}
                          className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(category)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            category.is_active
                              ? 'text-orange-500 hover:bg-orange-50'
                              : 'text-green-500 hover:bg-green-50'
                          }`}
                          title={category.is_active ? '禁用' : '启用'}
                        >
                          <span className="text-xs font-medium">
                            {category.is_active ? '禁用' : '启用'}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setDeletingCategory(category);
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
      </div>

      {/* 新增/编辑分类弹窗 */}
      {showFormModal && (
        <Modal
          title={editingCategory ? '编辑分类' : '新增分类'}
          onClose={() => {
            setShowFormModal(false);
            setEditingCategory(null);
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入分类名称"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标识 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="英文标识，如 ai-story"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="图标名称或URL"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入分类描述"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序号</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                placeholder="数字越小越靠前"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F]"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                启用
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowFormModal(false);
                  setEditingCategory(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <Button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg"
              >
                {editingCategory ? '保存' : '创建'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteModal && deletingCategory && (
        <Modal
          title="删除分类"
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingCategory(null);
          }}
        >
          <div className="mb-6">
            <p className="text-gray-600">
              确定要删除分类 <span className="font-medium text-gray-800">{deletingCategory.name}</span> 吗？此操作无法撤销。
            </p>
            {deletingCategory.tool_count > 0 && (
              <p className="text-sm text-red-500 mt-2">
                该分类下还有 {deletingCategory.tool_count} 个工具，删除后这些工具将失去分类关联。
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingCategory(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <Button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-white bg-red-500 hover:bg-red-600"
            >
              删除
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

const Modal = ({ title, children, onClose }: ModalProps) => (
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

export default CategoryManagement;
