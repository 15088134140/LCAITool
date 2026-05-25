import request from '@/utils/request';

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
  usage_modes?: string[];
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
  usage_modes?: string[];
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
  usage_modes?: string[];
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
    const res: any = await request.get('/tools', { params: filteredParams });
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
};
