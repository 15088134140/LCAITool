import request from '@/utils/request';

// ==================== 动态表单字段类型 ====================

export type ToolParamFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'radio'
  | 'radioCard'
  | 'checkbox'
  | 'boolean'
  | 'date'
  | 'file'
  | 'section'
  | 'range'
  | 'hidden';

export interface ToolParamOption {
  label: string;
  value: string | number;
  icon?: string;
  desc?: string;
}

export interface ToolParamCondition {
  when: {
    field: string;
    operator: 'eq' | 'neq' | 'in' | 'nin';
    value: any;
  };
  effect: 'show' | 'hide' | 'enable' | 'disable';
}

export interface ToolParamField {
  key: string;
  label: string;
  type: ToolParamFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number | boolean | string[] | null;
  options?: ToolParamOption[];
  min?: number;
  max?: number;
  step?: number;
  order?: number;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  maxFiles?: number;
  allowCustom?: boolean;
  condition?: ToolParamCondition;
  uiHint?: 'card';
}

// ==================== 计价规则类型 ====================

export type PricingAmountRef = 'base_fee' | 'image_fee' | 'audio_fee' | 'token_fee';

export interface PricingWhenCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'truthy' | 'falsy';
  value?: any;
}

export interface PricingItemFixed {
  key: string;
  type: 'fixed';
  label: string;
  amount_ref: PricingAmountRef;
  when?: PricingWhenCondition;
}

export interface PricingItemPerUnit {
  key: string;
  type: 'per_unit';
  label: string;
  field: string;
  unit_amount_ref: PricingAmountRef;
  default_quantity?: number;
  min_quantity?: number;
  max_quantity?: number;
  unit_size?: number;
  when?: PricingWhenCondition;
}

export type PricingItem = PricingItemFixed | PricingItemPerUnit;

export interface PricingSchema {
  version: 1;
  currency: 'credits';
  rounding?: 'ceil' | 'floor' | 'round';
  min_total?: number | null;
  max_total?: number | null;
  items: PricingItem[];
  display?: {
    show_breakdown?: boolean;
    total_label?: string;
    unit_label?: string;
  };
}

// ==================== 执行器类型 ====================

export interface ExecutorInfo {
  key: string;
  name: string;
  description: string;
}

export interface Tool {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  short_desc?: string | null;
  cover_image?: string | null;
  category_id?: string | null;
  category?: string | null;
  tags?: string | null;
  base_fee: number;
  image_fee: number;
  audio_fee: number;
  token_fee: number;
  config?: any;
  status: number; // 0下线 1上线 2维护中
  is_featured?: boolean;
  is_mock_enabled?: boolean;
  is_prompt_logging_enabled?: boolean;
  usage_modes?: string[];
  param_schema?: ToolParamField[] | null;
  pricing_schema?: PricingSchema | null;
  executor_key?: string | null;
  use_count: number;
  favorite_count: number;
  rating_count: number;
  rating_avg: number;
  created_at: number;
  updated_at: number;
}

export interface ToolCategory {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  sort_order: number;
  tool_count: number;
  is_active: boolean;
  is_featured: boolean;
  parent_id?: string | null;
  created_at: number;
  updated_at: number;
}

export interface ToolDemo {
  id: string;
  tool_id: string;
  title: string;
  description?: string | null;
  cover_image?: string | null;
  demo_type: string;
  demo_images?: string | null;
  input_params?: any;
  result_sample?: any;
  sort_order: number;
  is_active: boolean;
  created_by?: string | null;
  created_at: number;
  updated_at: number;
}

export interface ToolListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: number;
  category_id?: string;
}

export interface ToolListResponse {
  list: Tool[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateToolParams {
  slug: string;
  name: string;
  description?: string;
  short_desc?: string;
  cover_image?: string;
  category_id?: string;
  category?: string;
  tags?: string | string[];
  base_fee: number;
  image_fee?: number;
  audio_fee?: number;
  token_fee?: number;
  config?: any;
  status?: number;
  is_featured?: boolean;
  is_mock_enabled?: boolean;
  is_prompt_logging_enabled?: boolean;
  usage_modes?: string[];
  param_schema?: ToolParamField[] | null;
  pricing_schema?: PricingSchema | null;
  executor_key?: string | null;
}

export interface UpdateToolParams {
  id: string;
  slug?: string;
  name?: string;
  description?: string;
  short_desc?: string;
  cover_image?: string;
  category_id?: string;
  category?: string;
  tags?: string | string[];
  base_fee?: number;
  image_fee?: number;
  audio_fee?: number;
  token_fee?: number;
  config?: any;
  status?: number;
  is_featured?: boolean;
  is_mock_enabled?: boolean;
  is_prompt_logging_enabled?: boolean;
  usage_modes?: string[];
  param_schema?: ToolParamField[] | null;
  pricing_schema?: PricingSchema | null;
  executor_key?: string | null;
}

export interface CreateDemoParams {
  tool_id: string;
  title: string;
  description?: string;
  cover_image?: string;
  demo_type?: string;
  demo_images?: string | string[];
  input_params?: any;
  result_sample?: any;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateDemoParams {
  id: string;
  title?: string;
  description?: string;
  cover_image?: string;
  demo_type?: string;
  demo_images?: string | string[];
  input_params?: any;
  result_sample?: any;
  sort_order?: number;
  is_active?: boolean;
}

const ADMIN_PREFIX = '/admin';

export const toolApi = {
  // 获取工具列表（公开接口）
  getList: async (params: ToolListParams) => {
    const filteredParams: Record<string, any> = {
      page: params.page,
      page_size: params.pageSize,
    };
    if (params.keyword && params.keyword.trim()) {
      filteredParams.search = params.keyword.trim();
    }
    if (params.status !== undefined) {
      filteredParams.status = params.status;
    }
    if (params.category_id) {
      filteredParams.category_id = params.category_id;
    }
    const res: any = await request.get(`${ADMIN_PREFIX}/tools`, { params: filteredParams });
    // 后端返回 { items, total, page, page_size }，前端需要 { list, total, page, pageSize }
    return {
      list: res.items || [],
      total: res.total || 0,
      page: res.page || params.page,
      pageSize: res.page_size || params.pageSize,
    } as ToolListResponse;
  },

  // 获取工具详情（公开接口）
  getDetail: (id: string) => {
    return request.get<Tool>(`/tools/${id}`);
  },

  // 创建工具
  create: (data: CreateToolParams) => {
    const payload = { ...data };
    if (payload.tags && Array.isArray(payload.tags)) {
      payload.tags = JSON.stringify(payload.tags);
    }
    return request.post<Tool>(`${ADMIN_PREFIX}/tools`, payload);
  },

  // 更新工具
  update: (data: UpdateToolParams) => {
    const { id, ...rest } = data;
    const payload = { ...rest };
    if (payload.tags && Array.isArray(payload.tags)) {
      payload.tags = JSON.stringify(payload.tags);
    }
    return request.put<Tool>(`${ADMIN_PREFIX}/tools/${id}`, payload);
  },

  // 删除工具
  delete: (id: string) => {
    return request.delete(`${ADMIN_PREFIX}/tools/${id}`);
  },

  // 切换工具状态
  toggleStatus: (id: string, status: number) => {
    return request.put<Tool>(`${ADMIN_PREFIX}/tools/${id}/status`, { status });
  },

  // 获取分类列表（公开接口）
  getCategories: async () => {
    const res: any = await request.get('/tools/categories/list');
    // 后端返回 { items, total }，前端需要 ToolCategory[]
    return Array.isArray(res) ? res : (res?.items || []);
  },

  // 创建分类
  createCategory: (data: Partial<ToolCategory>) => {
    return request.post<ToolCategory>(`${ADMIN_PREFIX}/tools/categories`, data);
  },

  // 更新分类
  updateCategory: (id: string, data: Partial<ToolCategory>) => {
    return request.put<ToolCategory>(`${ADMIN_PREFIX}/tools/categories/${id}`, data);
  },

  // 删除分类
  deleteCategory: (id: string) => {
    return request.delete(`${ADMIN_PREFIX}/tools/categories/${id}`);
  },

  // 获取工具演示案例列表（公开接口）
  getDemos: (toolId: string) => {
    return request.get<ToolDemo[]>(`/tools/${toolId}/demos`);
  },

  // 创建演示案例
  createDemo: (data: CreateDemoParams) => {
    const payload = { ...data };
    if (payload.demo_images && Array.isArray(payload.demo_images)) {
      payload.demo_images = JSON.stringify(payload.demo_images);
    }
    return request.post<ToolDemo>(`${ADMIN_PREFIX}/tools/${data.tool_id}/demos`, payload);
  },

  // 更新演示案例
  updateDemo: (data: UpdateDemoParams) => {
    const { id, ...rest } = data;
    const payload = { ...rest };
    if (payload.demo_images && Array.isArray(payload.demo_images)) {
      payload.demo_images = JSON.stringify(payload.demo_images);
    }
    return request.put<ToolDemo>(`${ADMIN_PREFIX}/tools/demos/${id}`, payload);
  },

  // 删除演示案例
  deleteDemo: (id: string) => {
    return request.delete(`${ADMIN_PREFIX}/tools/demos/${id}`);
  },

  // 更新演示案例排序
  updateDemoOrder: (toolId: string, demoIds: string[]) => {
    return request.put(`${ADMIN_PREFIX}/tools/${toolId}/demos/order`, { demo_ids: demoIds });
  },

  // 获取可用执行器列表
  getExecutors: () => {
    return request.get<ExecutorInfo[]>(`${ADMIN_PREFIX}/executors`);
  },
};
