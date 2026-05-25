import request from '@/utils/request';

export interface SystemConfig {
  key: string;
  value: string;
  default_value?: string;
  group: string;
  label: string;
  description?: string;
  type: string;
}

export interface AiProvider {
  id: string;
  slug: string;
  name: string;
  provider_type: string;
  config?: Record<string, any>;
  is_active: boolean;
  sort_order: number;
  created_at: number;
}

export interface CreateAiProviderParams {
  slug: string;
  name: string;
  provider_type: string;
  config?: Record<string, any>;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateAiProviderParams {
  slug?: string;
  name?: string;
  provider_type?: string;
  config?: Record<string, any>;
  is_active?: boolean;
  sort_order?: number;
}

export const settingsApi = {
  /** 获取系统配置，可按分组筛选 */
  getSettings: async (group?: string) => {
    const params: Record<string, string> = {};
    if (group) params.group = group;
    const res = await request.get<{ items: SystemConfig[]; total: number }>('/admin/settings', { params });
    return res.items || [];
  },

  /** 批量更新系统配置 */
  updateSettings: async (settings: Record<string, string>) => {
    const res = await request.put<{ items: SystemConfig[]; updated_count: number }>('/admin/settings', { settings });
    return res;
  },

  /** 获取 AI 提供商列表 */
  getAiProviders: async (activeOnly?: boolean) => {
    const params: Record<string, any> = {};
    if (activeOnly !== undefined) params.active_only = activeOnly;
    const res = await request.get<{ items: AiProvider[]; total: number }>('/admin/ai-providers', { params });
    return res.items || [];
  },

  /** 创建 AI 提供商 */
  createAiProvider: (data: CreateAiProviderParams) => {
    return request.post<AiProvider>('/admin/ai-providers', data);
  },

  /** 更新 AI 提供商 */
  updateAiProvider: (id: string, data: UpdateAiProviderParams) => {
    return request.put<AiProvider>(`/admin/ai-providers/${id}`, data);
  },

  /** 删除 AI 提供商 */
  deleteAiProvider: (id: string) => {
    return request.delete(`/admin/ai-providers/${id}`);
  },
};
