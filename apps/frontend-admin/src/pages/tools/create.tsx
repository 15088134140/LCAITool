import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Plus } from 'lucide-react';
import { useAppStore } from '@/store';
import { toolApi, ToolCategory, CreateToolParams, ToolParamField, PricingSchema } from '@/api';
import { Button } from '@lcaitool/ui';
import {
  DynamicSchemaEditor,
  PricingSchemaEditor,
  ExecutorSelect,
} from '@/components/ToolFormDesigner';

const CreateTool = () => {
  const navigate = useNavigate();
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateToolParams>({
    slug: '',
    name: '',
    description: '',
    short_desc: '',
    cover_image: '',
    category_id: '',
    category: '',
    tags: [],
    base_fee: 0,
    image_fee: 0,
    audio_fee: 0,
    token_fee: 0,
    status: 0,
    is_mock_enabled: false,
    is_prompt_logging_enabled: false,
    usage_modes: ['form'],
    param_schema: [],
    pricing_schema: null,
    executor_key: null,
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setCurrentPageTitle('创建工具');
    setBreadcrumbs([
      { label: '首页', path: '/' },
      { label: '工具管理', path: '/tools' },
      { label: '创建工具' },
    ]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await toolApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('加载分类列表失败:', err);
    }
  };

  const handleInputChange = (
    field: keyof CreateToolParams,
    value: string | number | boolean | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    setFormData((prev) => ({
      ...prev,
      category_id: categoryId,
      category: category?.name || '',
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: Array.isArray(prev.tags) ? prev.tags.filter((t: string) => t !== tag) : [],
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      alert('请填写工具名称和标识');
      return;
    }

    setSubmitting(true);
    try {
      await toolApi.create(formData);
      navigate('/tools');
    } catch (err) {
      console.error('创建工具失败:', err);
      alert('创建工具失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/tools')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">创建工具</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">基本信息</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工具名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="请输入工具名称"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工具标识 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="如：story-generator"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类目</label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                >
                  <option value="">请选择类目</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(Array.isArray(formData.tags) ? formData.tags : []).map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="输入标签后按回车添加"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">封面图片（支持多张）</label>
                <div className="space-y-3">
                  {/* Preview strip */}
                  <div className="flex gap-3 flex-wrap">
                    {(() => {
                      const urls = formData.cover_image
                        ? formData.cover_image.split('|').map(u => u.trim()).filter(Boolean)
                        : [];
                      return urls.length > 0 ? urls.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={url}
                            alt={`封面 ${idx + 1}`}
                            className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const list = (formData.cover_image || '').split('|').map(u => u.trim()).filter(Boolean);
                              list.splice(idx, 1);
                              handleInputChange('cover_image', list.join('|'));
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )) : (
                        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400">
                          <Upload size={24} className="mb-1" />
                          <span className="text-xs">暂无图片</span>
                        </div>
                      );
                    })()}
                  </div>
                  {/* URL textarea: one URL per line */}
                  <textarea
                    value={(formData.cover_image || '').split('|').join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean);
                      handleInputChange('cover_image', lines.join('|'));
                    }}
                    placeholder="输入图片URL，每行一张"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">简短描述</label>
                <input
                  type="text"
                  value={formData.short_desc}
                  onChange={(e) => handleInputChange('short_desc', e.target.value)}
                  placeholder="工具的简短描述"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={String(formData.status)}
                  onChange={(e) => handleInputChange('status', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                >
                  <option value="0">下线</option>
                  <option value="1">上线</option>
                  <option value="2">维护中</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={!!formData.is_featured}
                  onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                  className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F]"
                />
                <label htmlFor="is_featured" className="text-sm font-medium text-gray-700 cursor-pointer">
                  推荐展示（显示在首页精品工具区域）
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_mock_enabled"
                  checked={!!formData.is_mock_enabled}
                  onChange={(e) => handleInputChange('is_mock_enabled', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="is_mock_enabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Mock执行模式（开启后工具使用模拟数据执行，无需真实AI调用）
                </label>
              </div>

              {/* ===== 数据与调试 分组 ===== */}
              <div className="col-span-2 border-t border-gray-200 pt-6 mt-4">
                <h3 className="text-md font-semibold text-gray-800 mb-3">数据与调试</h3>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_prompt_logging_enabled"
                    checked={formData.is_prompt_logging_enabled !== false}
                    onChange={(e) => handleInputChange('is_prompt_logging_enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_prompt_logging_enabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                    启用提示词记录
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  开启后，每次 AI 调用的输入输出将记录到成果 ZIP 中，便于调试和审计
                </p>

                {formData.is_mock_enabled && formData.is_prompt_logging_enabled && (
                  <p className="text-xs text-amber-600 mt-2 ml-7">
                    提示：Mock 模式下记录的是模拟数据，非真实 AI 调用结果
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">详细描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="详细描述工具的功能和使用方法"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">价格配置</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                基础费 (积分)
              </label>
              <input
                type="number"
                min="0"
                value={formData.base_fee}
                onChange={(e) => handleInputChange('base_fee', Number(e.target.value))}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                图片费 (积分/张)
              </label>
              <input
                type="number"
                min="0"
                value={formData.image_fee}
                onChange={(e) => handleInputChange('image_fee', Number(e.target.value))}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                音频费 (积分/段)
              </label>
              <input
                type="number"
                min="0"
                value={formData.audio_fee}
                onChange={(e) => handleInputChange('audio_fee', Number(e.target.value))}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token费 (积分/千token)
              </label>
              <input
                type="number"
                min="0"
                value={formData.token_fee}
                onChange={(e) => handleInputChange('token_fee', Number(e.target.value))}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* ===== 使用模式 ===== */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">使用模式</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={formData.usage_modes?.includes('form') ?? true}
                onChange={(e) => {
                  const modes = formData.usage_modes || ['form'];
                  if (e.target.checked) {
                    handleInputChange('usage_modes', Array.from(new Set([...modes, 'form'])));
                  } else {
                    const newModes = modes.filter((m) => m !== 'form');
                    if (newModes.length > 0) {
                      handleInputChange('usage_modes', newModes);
                    }
                  }
                }}
                className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F]"
              />
              <div>
                <span className="font-medium text-gray-800">表单模式 (form)</span>
                <p className="text-sm text-gray-500">用户填写表单参数后开始生成</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={formData.usage_modes?.includes('dialog') ?? false}
                onChange={(e) => {
                  const modes = formData.usage_modes || ['form'];
                  if (e.target.checked) {
                    handleInputChange('usage_modes', Array.from(new Set([...modes, 'dialog'])));
                  } else {
                    handleInputChange('usage_modes', modes.filter((m) => m !== 'dialog'));
                  }
                }}
                className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F]"
              />
              <div>
                <span className="font-medium text-gray-800">对话模式 (dialog)</span>
                <p className="text-sm text-gray-500">用户通过自然语言对话描述需求</p>
              </div>
            </label>
          </div>
        </div>

        {/* ===== 执行器绑定 ===== */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">执行器绑定</h2>
          <p className="text-sm text-gray-500 mb-4">
            指定该工具实际由哪个后端执行器处理任务。为空时回退到 task_type / slug 匹配。
          </p>
          <ExecutorSelect
            value={formData.executor_key}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, executor_key: value }))
            }
          />
        </div>

        {/* ===== 动态表单字段配置 ===== */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">表单字段配置 (param_schema)</h2>
          <p className="text-sm text-gray-500 mb-4">
            定义用户填写表单时的字段、类型、默认值、选项和条件显示规则。
          </p>
          <DynamicSchemaEditor
            value={formData.param_schema}
            onChange={(value: ToolParamField[]) =>
              setFormData((prev) => ({ ...prev, param_schema: value }))
            }
          />
        </div>

        {/* ===== 计价规则配置 ===== */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">计价规则配置 (pricing_schema)</h2>
          <p className="text-sm text-gray-500 mb-4">
            配置如何根据用户输入和工具单价计算总积分。引用上方"价格配置"中的标准单价字段。
          </p>
          <PricingSchemaEditor
            value={formData.pricing_schema}
            onChange={(value: PricingSchema | null) =>
              setFormData((prev) => ({ ...prev, pricing_schema: value }))
            }
            paramSchema={formData.param_schema}
          />
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/tools')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <Button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] text-white rounded-lg disabled:opacity-50"
          >
            {submitting ? '创建中...' : '创建工具'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateTool;
