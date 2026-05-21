import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, GripVertical, X, Upload, Image, Music, Video } from 'lucide-react';
import { useAppStore } from '@/store';
import { toolApi, Tool, ToolDemo, CreateDemoParams, UpdateDemoParams } from '@/api';
import { formatDate } from '@/utils';
import { Button } from '@lcaitool/ui';

const DemoCaseManager = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  const [tool, setTool] = useState<Tool | null>(null);
  const [demos, setDemos] = useState<ToolDemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingDemo, setEditingDemo] = useState<ToolDemo | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [demoToDelete, setDemoToDelete] = useState<ToolDemo | null>(null);

  const [formData, setFormData] = useState<CreateDemoParams>({
    tool_id: '',
    title: '',
    description: '',
    cover_image: '',
    demo_type: 'image',
    demo_images: [],
    input_params: undefined,
    result_sample: undefined,
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    setCurrentPageTitle('演示案例管理');
    setBreadcrumbs([
      { label: '首页', path: '/' },
      { label: '工具管理', path: '/tools' },
      { label: '演示案例' },
    ]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  useEffect(() => {
    if (id) {
      loadTool(id);
      loadDemos(id);
    }
  }, [id]);

  const loadTool = async (toolId: string) => {
    try {
      const data = await toolApi.getDetail(toolId);
      setTool(data);
    } catch (err) {
      console.error('加载工具详情失败:', err);
    }
  };

  const loadDemos = async (toolId: string) => {
    setLoading(true);
    try {
      const data = await toolApi.getDemos(toolId);
      setDemos(data.sort((a, b) => a.sort_order - b.sort_order));
    } catch (err) {
      console.error('加载演示案例失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingDemo(null);
    setFormData({
      tool_id: id || '',
      title: '',
      description: '',
      cover_image: '',
      demo_type: 'image',
      demo_images: [],
      input_params: undefined,
      result_sample: undefined,
      sort_order: demos.length,
      is_active: true,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (demo: ToolDemo) => {
    setEditingDemo(demo);
    let demoImages: string[] = [];
    if (demo.demo_images) {
      try {
        const parsed = JSON.parse(demo.demo_images);
        demoImages = Array.isArray(parsed) ? parsed : [];
      } catch {
        demoImages = [demo.demo_images];
      }
    }
    setFormData({
      tool_id: demo.tool_id,
      title: demo.title,
      description: demo.description || '',
      cover_image: demo.cover_image || '',
      demo_type: demo.demo_type,
      demo_images: demoImages,
      input_params: demo.input_params,
      result_sample: demo.result_sample,
      sort_order: demo.sort_order,
      is_active: demo.is_active,
    });
    setShowModal(true);
  };

  const handleInputChange = (
    field: keyof CreateDemoParams,
    value: string | number | boolean | string[] | any
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageAdd = () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '输入图片URL';
    input.className = 'px-3 py-2 border rounded-lg w-full';

    const url = prompt('请输入图片URL');
    if (url && url.trim()) {
      setFormData((prev) => ({
        ...prev,
        demo_images: [...(prev.demo_images || []), url.trim()],
      }));
    }
  };

  const handleImageRemove = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      demo_images: prev.demo_images?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      alert('请填写案例标题');
      return;
    }

    setSubmitting(true);
    try {
      if (editingDemo) {
        await toolApi.updateDemo({ id: editingDemo.id, ...formData });
      } else {
        await toolApi.createDemo(formData);
      }
      setShowModal(false);
      if (id) loadDemos(id);
    } catch (err) {
      console.error('保存演示案例失败:', err);
      alert('保存失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!demoToDelete) return;
    try {
      await toolApi.deleteDemo(demoToDelete.id);
      setShowDeleteModal(false);
      setDemoToDelete(null);
      if (id) loadDemos(id);
    } catch (err) {
      console.error('删除演示案例失败:', err);
      alert('删除失败，请稍后重试');
    }
  };

  const getDemoTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image size={16} />;
      case 'image_audio':
        return <Music size={16} />;
      case 'video':
        return <Video size={16} />;
      default:
        return <Image size={16} />;
    }
  };

  const getDemoTypeText = (type: string) => {
    switch (type) {
      case 'image':
        return '图片';
      case 'image_audio':
        return '图文+音频';
      case 'video':
        return '视频';
      default:
        return '图片';
    }
  };

  const parseDemoImages = (demoImages?: string | null) => {
    if (!demoImages) return [];
    try {
      const parsed = JSON.parse(demoImages);
      return Array.isArray(parsed) ? parsed : [demoImages];
    } catch {
      return [demoImages];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/tools')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">演示案例管理</h1>
          {tool && <p className="text-gray-500 mt-1">{tool.name}</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">案例列表</h2>
          <Button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] text-white"
          >
            <Plus size={18} />
            <span>添加案例</span>
          </Button>
        </div>

        {demos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Image size={48} className="mx-auto mb-4 text-gray-300" />
            <p>暂无演示案例</p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 text-[#1E3A5F] hover:underline"
            >
              添加第一个案例
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {demos.map((demo, index) => (
              <div
                key={demo.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="cursor-move text-gray-400">
                  <GripVertical size={20} />
                </div>
                <div className="flex-shrink-0">
                  {demo.cover_image ? (
                    <img
                      src={demo.cover_image}
                      alt={demo.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : parseDemoImages(demo.demo_images).length > 0 ? (
                    <img
                      src={parseDemoImages(demo.demo_images)[0]}
                      alt={demo.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Image size={24} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-800 truncate">{demo.title}</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {getDemoTypeIcon(demo.demo_type)}
                      {getDemoTypeText(demo.demo_type)}
                    </span>
                    {!demo.is_active && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                        隐藏
                      </span>
                    )}
                  </div>
                  {demo.description && (
                    <p className="text-gray-500 text-sm mt-1 truncate">{demo.description}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">排序: {demo.sort_order} · 创建于 {formatDate(demo.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(demo)}
                    className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setDemoToDelete(demo);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <Modal
          title={editingDemo ? '编辑演示案例' : '添加演示案例'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="请输入案例标题"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="请输入案例描述"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
              <select
                value={formData.demo_type}
                onChange={(e) => handleInputChange('demo_type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
              >
                <option value="image">图片</option>
                <option value="image_audio">图文+音频</option>
                <option value="video">视频</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">封面图片</label>
              <input
                type="text"
                value={formData.cover_image}
                onChange={(e) => handleInputChange('cover_image', e.target.value)}
                placeholder="输入封面图片URL"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">演示图片</label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(formData.demo_images || []).map((img, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={img}
                        alt={`演示 ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleImageRemove(idx)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleImageAdd}
                  className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                >
                  <Upload size={20} />
                  <span className="text-xs mt-1">添加</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">输入参数示例 (JSON)</label>
              <textarea
                value={formData.input_params ? JSON.stringify(formData.input_params, null, 2) : ''}
                onChange={(e) => {
                  try {
                    handleInputChange('input_params', e.target.value ? JSON.parse(e.target.value) : undefined);
                  } catch {
                    handleInputChange('input_params', e.target.value);
                  }
                }}
                placeholder='{"theme": "太空探险", "pages": 5}'
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">输出结果示例 (JSON)</label>
              <textarea
                value={formData.result_sample ? JSON.stringify(formData.result_sample, null, 2) : ''}
                onChange={(e) => {
                  try {
                    handleInputChange('result_sample', e.target.value ? JSON.parse(e.target.value) : undefined);
                  } catch {
                    handleInputChange('result_sample', e.target.value);
                  }
                }}
                placeholder='{"story": "...", "images": [...]}'
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => handleInputChange('sort_order', Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={formData.is_active ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('is_active', e.target.value === 'true')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                >
                  <option value="true">显示</option>
                  <option value="false">隐藏</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <Button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg disabled:opacity-50"
              >
                {submitting ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {showDeleteModal && demoToDelete && (
        <Modal
          title="删除演示案例"
          onClose={() => {
            setShowDeleteModal(false);
            setDemoToDelete(null);
          }}
        >
          <p className="text-gray-600 mb-6">
            确定要删除演示案例 <span className="font-medium text-gray-800">{demoToDelete.title}</span> 吗？此操作无法撤销。
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setDemoToDelete(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <Button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
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
    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

export default DemoCaseManager;
