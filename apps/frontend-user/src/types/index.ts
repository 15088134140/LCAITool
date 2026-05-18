/**
 * 分类类型 - 工具分类信息
 */
export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  toolCount: number;
  sortOrder: number;
}

/**
 * 工具定价类型 - 工具的费用配置
 */
export interface ToolPricing {
  baseFee: number;
  resourceFees?: {
    image?: number;
    audio?: number;
    video?: number;
  };
  example?: string;
}

/**
 * 工具类型 - AI工具的完整信息
 */
export interface Tool {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  icon: string;
  categoryId: string;
  pricing: ToolPricing;
  avgRating: number;
  useCount: number;
  isNew: boolean;
  isFeatured: boolean;
  isHot: boolean;
  tags: string[];
  status: 'active' | 'coming_soon' | 'maintenance';
  createdAt: string;
}

/**
 * 评价类型 - 用户对工具的评价
 */
export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  content: string;
  createdAt: string;
  toolId: string;
}

/**
 * 查询参数类型 - 获取工具列表的查询参数
 */
export interface GetToolsParams {
  categoryId?: string;
  search?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isHot?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * 分页结果类型 - 通用分页返回结果
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
