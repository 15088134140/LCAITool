import { useEffect, useState, useCallback } from 'react';
import {
  Save,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  Power,
  PowerOff,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { settingsApi, AiProvider, CreateAiProviderParams, UpdateAiProviderParams } from '@/api/settings';
import { Button } from '@lcaitool/ui';
import { toast } from '@/components/ui/Toast';

// ---------- Tab Types ----------
type TabKey = 'basic' | 'business' | 'providers';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '基础信息' },
  { key: 'business', label: '业务参数' },
  { key: 'providers', label: 'AI 提供商' },
];

// ---------- Field Definitions ----------
interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number';
  placeholder?: string;
}

const BASIC_FIELDS: ConfigField[] = [
  { key: 'site_name', label: '站点名称', type: 'text', placeholder: '请输入站点名称' },
  { key: 'site_slogan', label: 'Slogan', type: 'text', placeholder: '请输入站点标语' },
  { key: 'site_logo_url', label: 'Logo URL', type: 'text', placeholder: '请输入 Logo 图片地址' },
  { key: 'site_icp', label: 'ICP 备案号', type: 'text', placeholder: '如：沪ICP备xxxxxx号' },
  { key: 'site_email', label: '联系邮箱', type: 'text', placeholder: '请输入联系邮箱' },
  { key: 'site_phone', label: '联系电话', type: 'text', placeholder: '请输入联系电话' },
  { key: 'site_seo_keywords', label: 'SEO 关键词', type: 'text', placeholder: '多个关键词用逗号分隔' },
  { key: 'user_agreement', label: '用户协议', type: 'textarea', placeholder: '请输入用户协议内容' },
  { key: 'privacy_policy', label: '隐私政策', type: 'textarea', placeholder: '请输入隐私政策内容' },
];

const BUSINESS_FIELDS: ConfigField[] = [
  { key: 'checkin_base_points', label: '签到基础积分', type: 'number', placeholder: '每日签到获得积分' },
  { key: 'checkin_week_bonus', label: '满7天额外奖励', type: 'number', placeholder: '连续签到7天额外奖励' },
  { key: 'invite_register_bonus', label: '邀请注册奖励', type: 'number', placeholder: '邀请新用户注册奖励' },
  { key: 'invite_recharge_bonus', label: '邀请充值奖励', type: 'number', placeholder: '被邀请人充值奖励比例(%)' },
  { key: 'invite_daily_limit', label: '每日邀请奖励上限', type: 'number', placeholder: '每日邀请奖励积分上限' },
  { key: 'register_bonus_points', label: '注册赠送积分', type: 'number', placeholder: '新用户注册赠送积分' },
  { key: 'verify_bonus_points', label: '实名认证奖励积分', type: 'number', placeholder: '实名认证通过奖励积分' },
  { key: 'review_text_bonus', label: '评价奖励（文字）', type: 'number', placeholder: '文字评价奖励积分' },
  { key: 'review_image_bonus', label: '评价奖励（带图）', type: 'number', placeholder: '带图评价奖励积分' },
  { key: 'recharge_rate', label: '1元兑积分比例', type: 'number', placeholder: '充值1元兑换积分数' },
];

// ---------- Modal Component ----------
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
    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
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

// ---------- Confirm Dialog Component ----------
const ConfirmDialog = ({
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? '删除中...' : '确认删除'}
        </button>
      </div>
    </div>
  </div>
);

// ========== Page Component ==========
const SettingsPage = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState<TabKey>('basic');

  // ---- Config State (Tab1 + Tab2) ----
  const [configMap, setConfigMap] = useState<Record<string, string>>({});
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  // ---- AI Providers State (Tab3) ----
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  // ---- Modal State ----
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const [providerForm, setProviderForm] = useState<CreateAiProviderParams>({
    slug: '',
    name: '',
    provider_type: 'openai',
    is_active: true,
    sort_order: 0,
  });
  const [providerSubmitting, setProviderSubmitting] = useState(false);

  // ---- Delete Confirm ----
  const [deleteTarget, setDeleteTarget] = useState<AiProvider | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---- Breadcrumbs ----
  useEffect(() => {
    setCurrentPageTitle('系统设置');
    setBreadcrumbs([
      { label: '首页', path: '/dashboard' },
      { label: '系统设置' },
    ]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  // ========== Config Load / Save ==========
  const loadConfig = useCallback(async (group: string) => {
    setConfigLoading(true);
    try {
      const list = await settingsApi.getSettings(group);
      const map: Record<string, string> = {};
      list.forEach((item) => {
        map[item.key] = item.value;
      });
      setConfigMap(map);
    } catch (err) {
      console.error('加载配置失败:', err);
      toast.error('加载配置失败');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // Load config when switching to basic/business tabs
  useEffect(() => {
    if (activeTab === 'basic') {
      loadConfig('basic');
    } else if (activeTab === 'business') {
      loadConfig('business');
    }
  }, [activeTab, loadConfig]);

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      await settingsApi.updateSettings(configMap);
      toast.success('配置已保存');
    } catch (err: any) {
      console.error('保存配置失败:', err);
      toast.error(err.message || '保存配置失败');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleConfigFieldChange = (key: string, value: string) => {
    setConfigMap((prev) => ({ ...prev, [key]: value }));
  };

  // ========== AI Providers ==========
  const loadProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const list = await settingsApi.getAiProviders();
      setProviders(list);
    } catch (err) {
      console.error('加载 AI 提供商失败:', err);
      toast.error('加载 AI 提供商失败');
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'providers') {
      loadProviders();
    }
  }, [activeTab, loadProviders]);

  // ---- Open Create Modal ----
  const openCreateModal = () => {
    setEditingProvider(null);
    setProviderForm({
      slug: '',
      name: '',
      provider_type: 'openai',
      is_active: true,
      sort_order: 0,
    });
    setShowProviderModal(true);
  };

  // ---- Open Edit Modal ----
  const openEditModal = (provider: AiProvider) => {
    setEditingProvider(provider);
    setProviderForm({
      slug: provider.slug,
      name: provider.name,
      provider_type: provider.provider_type,
      config: provider.config,
      is_active: provider.is_active,
      sort_order: provider.sort_order,
    });
    setShowProviderModal(true);
  };

  // ---- Submit Provider (Create / Update) ----
  const handleProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProviderSubmitting(true);
    try {
      if (editingProvider) {
        await settingsApi.updateAiProvider(editingProvider.id, providerForm as UpdateAiProviderParams);
        toast.success('AI 提供商已更新');
      } else {
        await settingsApi.createAiProvider(providerForm);
        toast.success('AI 提供商已创建');
      }
      setShowProviderModal(false);
      loadProviders();
    } catch (err: any) {
      console.error('保存 AI 提供商失败:', err);
      toast.error(err.message || '保存 AI 提供商失败');
    } finally {
      setProviderSubmitting(false);
    }
  };

  // ---- Delete Provider ----
  const handleDeleteProvider = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await settingsApi.deleteAiProvider(deleteTarget.id);
      toast.success('AI 提供商已删除');
      setDeleteTarget(null);
      loadProviders();
    } catch (err: any) {
      console.error('删除 AI 提供商失败:', err);
      toast.error(err.message || '删除 AI 提供商失败');
    } finally {
      setDeleting(false);
    }
  };

  // ---- Toggle Active ----
  const handleToggleActive = async (provider: AiProvider) => {
    try {
      await settingsApi.updateAiProvider(provider.id, { is_active: !provider.is_active });
      toast.success(provider.is_active ? '已停用' : '已启用');
      loadProviders();
    } catch (err: any) {
      console.error('切换状态失败:', err);
      toast.error(err.message || '切换状态失败');
    }
  };

  // ========== Render Helpers ==========
  const renderConfigForm = (fields: ConfigField[]) => (
    <div className="space-y-6">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {field.label}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              value={configMap[field.key] || ''}
              onChange={(e) => handleConfigFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={5}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-y text-sm"
            />
          ) : (
            <input
              type={field.type}
              value={configMap[field.key] || ''}
              onChange={(e) => handleConfigFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none text-sm"
            />
          )}
        </div>
      ))}

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <Button
          onClick={handleSaveConfig}
          disabled={configSaving}
          className="flex items-center gap-2 bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] text-white px-6"
        >
          {configSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>保存中...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>保存配置</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderProvidersTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          管理 AI 提供商配置，包括 API 密钥、模型参数等
        </p>
        <Button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] text-white"
        >
          <Plus size={16} />
          <span>新增提供商</span>
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">名称</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">标识</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">类型</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">排序</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">状态</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {providersLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                providers.map((provider) => (
                  <tr key={provider.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-800">{provider.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                        {provider.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{provider.provider_type}</td>
                    <td className="px-6 py-4 text-gray-600">{provider.sort_order}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          provider.is_active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {provider.is_active ? (
                          <Power size={12} />
                        ) : (
                          <PowerOff size={12} />
                        )}
                        {provider.is_active ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(provider)}
                          className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(provider)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(provider)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            provider.is_active
                              ? 'text-gray-400 hover:bg-gray-100'
                              : 'text-green-500 hover:bg-green-50'
                          }`}
                          title={provider.is_active ? '停用' : '启用'}
                        >
                          {provider.is_active ? (
                            <PowerOff size={16} />
                          ) : (
                            <Power size={16} />
                          )}
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
    </div>
  );

  // ========== Main Render ==========
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-[#1E3A5F]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E3A5F]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {configLoading && activeTab !== 'providers' ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">加载中...</span>
            </div>
          ) : activeTab === 'basic' ? (
            renderConfigForm(BASIC_FIELDS)
          ) : activeTab === 'business' ? (
            renderConfigForm(BUSINESS_FIELDS)
          ) : (
            renderProvidersTab()
          )}
        </div>
      </div>

      {/* AI Provider Modal */}
      {showProviderModal && (
        <Modal
          title={editingProvider ? '编辑 AI 提供商' : '新增 AI 提供商'}
          onClose={() => setShowProviderModal(false)}
        >
          <form onSubmit={handleProviderSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={providerForm.name}
                onChange={(e) =>
                  setProviderForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="如：OpenAI"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标识 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={providerForm.slug}
                onChange={(e) =>
                  setProviderForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="如：openai"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none text-sm"
                required
              />
              <p className="text-xs text-gray-400 mt-1">唯一标识符，创建后不可修改</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                类型 <span className="text-red-500">*</span>
              </label>
              <select
                value={providerForm.provider_type}
                onChange={(e) =>
                  setProviderForm((prev) => ({ ...prev, provider_type: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none text-sm"
              >
                <option value="openai">OpenAI</option>
                <option value="dify">Dify</option>
                <option value="volc">火山方舟（豆包）</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            {editingProvider && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配置（JSON）
                </label>
                <textarea
                  value={
                    providerForm.config
                      ? JSON.stringify(providerForm.config, null, 2)
                      : ''
                  }
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setProviderForm((prev) => ({ ...prev, config: parsed }));
                    } catch {
                      // Allow invalid JSON while typing
                    }
                  }}
                  placeholder='{"api_key": "...", "model": "gpt-4"}'
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-y text-sm font-mono"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序
                </label>
                <input
                  type="number"
                  value={providerForm.sort_order}
                  onChange={(e) =>
                    setProviderForm((prev) => ({
                      ...prev,
                      sort_order: Number(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  状态
                </label>
                <div className="flex items-center h-10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={providerForm.is_active}
                      onChange={(e) =>
                        setProviderForm((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                    />
                    <span className="text-sm text-gray-600">启用</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowProviderModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                disabled={providerSubmitting}
              >
                取消
              </button>
              <Button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg"
                disabled={providerSubmitting}
              >
                {providerSubmitting
                  ? '保存中...'
                  : editingProvider
                    ? '保存修改'
                    : '创建'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="确认删除"
          message={`确定要删除 AI 提供商「${deleteTarget.name}」吗？此操作不可恢复。`}
          onConfirm={handleDeleteProvider}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
};

export default SettingsPage;
