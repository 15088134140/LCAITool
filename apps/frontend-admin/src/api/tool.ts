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

export const toolApi = {
  // 获取工具列表
  getList: (params: ToolListParams) => {
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
    return request.get<ToolListResponse>('/admin/tools', { params: filteredParams });
  },

  // 获取工具详情
  getDetail: (id: string) => {
    return request.get<Tool>(`/admin/tools/${id}`);
  },

  // 创建工具
  create: (data: CreateToolParams) => {
    // 处理tags为JSON字符串
    const payload = { ...data };
    if (payload.tags && Array.isArray(payload.tags)) {
      payload.tags = JSON.stringify(payload.tags);
    }
    return request.post<Tool>('/admin/tools', payload);
  },

  // 更新工具
  update: (data: UpdateToolParams) => {
    const { id, ...rest } = data;
    const payload = { ...rest };
    if (payload.tags && Array.isArray(payload.tags)) {
      payload.tags = JSON.stringify(payload.tags);
    }
    return request.put<Tool>(`/admin/tools/${id}`, payload);
  },

  // 删除工具
  delete: (id: string) => {
    return request.delete(`/admin/tools/${id}`);
  },

  // 切换工具状态
  toggleStatus: (id: string, status: number) => {
    return request.put<Tool>(`/admin/tools/${id}/status`, { status });
  },

  // 获取分类列表
  getCategories: () => {
    return request.get<ToolCategory[]>('/admin/tool-categories');
  },

  // 创建分类
  createCategory: (data: Partial<ToolCategory>) => {
    return request.post<ToolCategory>('/admin/tool-categories', data);
  },

  // 更新分类
  updateCategory: (id: string, data: Partial<ToolCategory>) => {
    return request.put<ToolCategory>(`/admin/tool-categories/${id}`, data);
  },

  // 删除分类
  deleteCategory: (id: string) => {
    return request.delete(`/admin/tool-categories/${id}`);
  },

  // 获取工具演示案例列表
  getDemos: (toolId: string) => {
    return request.get<ToolDemo[]>(`/admin/tools/${toolId}/demos`);
  },

  // 创建演示案例
  createDemo: (data: CreateDemoParams) => {
    const payload = { ...data };
    if (payload.demo_images && Array.isArray(payload.demo_images)) {
      payload.demo_images = JSON.stringify(payload.demo_images);
    }
    return request.post<ToolDemo>(`/admin/tools/${data.tool_id}/demos`, payload);
  },

  // 更新演示案例
  updateDemo: (data: UpdateDemoParams) => {
    const { id, ...rest } = data;
    const payload = { ...rest };
    if (payload.demo_images && Array.isArray(payload.demo_images)) {
      payload.demo_images = JSON.stringify(payload.demo_images);
    }
    return request.put<ToolDemo>(`/admin/tool-demos/${id}`, payload);
  },

  // 删除演示案例
  deleteDemo: (id: string) => {
    return request.delete(`/admin/tool-demos/${id}`);
  },

  // 更新演示案例排序
  updateDemoOrder: (toolId: string, demoIds: string[]) => {
    return request.put(`/admin/tools/${toolId}/demos/order`, { demo_ids: demoIds });
  },
};
