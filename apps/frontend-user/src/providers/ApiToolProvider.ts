import type { ToolProvider } from './ToolProvider';
import type { Category, Tool, Review, GetToolsParams, PaginatedResult } from '../types';
import { getFirstImage } from '@/lib/utils/image';
import { categoryApi, toolApi } from '../lib/api';

/** 后端API工具响应中的标签字段可能是JSON字符串或数组 */
function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try { return JSON.parse(tags); } catch { return []; }
  }
  return [];
}

/** 将后端snake_case工具数据映射为前端camelCase Tool类型 */
function mapApiTool(apiItem: any): Tool {
  const tags = parseTags(apiItem.tags);
  return {
    id: apiItem.id || apiItem.slug || '',
    slug: apiItem.slug || '',
    name: apiItem.name || '',
    description: apiItem.description || '',
    shortDescription: apiItem.short_desc || apiItem.short_description || '',
    icon: apiItem.icon || '',
    categoryId: apiItem.category_id || '',
    pricing: {
      baseFee: apiItem.base_fee ?? 0,
      resourceFees: {
        image: apiItem.image_fee ?? 0,
        audio: apiItem.audio_fee ?? 0,
        video: apiItem.video_fee ?? 0,
      },
    },
    avgRating: apiItem.rating_avg ?? apiItem.avg_rating ?? 0,
    useCount: apiItem.use_count ?? apiItem.useCount ?? 0,
    isNew: apiItem.is_new ?? apiItem.isNew ?? false,
    isFeatured: apiItem.is_featured ?? apiItem.isFeatured ?? false,
    isHot: apiItem.is_hot ?? apiItem.isHot ?? false,
    tags,
    usage_modes: apiItem.usage_modes || ['form'],
    // 动态表单 schema（Task 14 新增）
    param_schema: apiItem.param_schema ?? null,
    pricing_schema: apiItem.pricing_schema ?? null,
    executor_key: apiItem.executor_key ?? null,
    // 扁平 fee 字段（供表单组件直接读取）
    base_fee: apiItem.base_fee ?? 0,
    image_fee: apiItem.image_fee ?? 0,
    audio_fee: apiItem.audio_fee ?? 0,
    token_fee: apiItem.token_fee ?? 0,
    status: apiItem.status === 1 ? 'active' : apiItem.status === 2 ? 'maintenance' : 'coming_soon',
    createdAt: apiItem.created_at ? new Date(apiItem.created_at * 1000).toISOString() : '',
    heroImage: getFirstImage(apiItem.cover_image) || apiItem.heroImage || '',
    reviewCount: apiItem.rating_count ?? apiItem.reviewCount ?? 0,
    stats: apiItem.stats || undefined,
    demos: apiItem.demos || undefined,
    param_schema: apiItem.param_schema || [],
    executor_key: apiItem.executor_key || apiItem.slug || '',
    pricing_schema: apiItem.pricing_schema || undefined,
  };
}

/** 将后端snake_case分类数据映射为前端camelCase Category类型 */
function mapApiCategory(apiItem: any): Category {
  return {
    id: apiItem.id || '',
    name: apiItem.name || '',
    icon: apiItem.icon || '',
    description: apiItem.description || '',
    toolCount: apiItem.tool_count ?? apiItem.toolCount ?? 0,
    sortOrder: apiItem.sort_order ?? apiItem.sortOrder ?? 0,
  };
}

/**
 * ApiToolProvider - 真实API数据提供器
 * 使用后端API获取数据
 */
export class ApiToolProvider implements ToolProvider {
  /**
   * 获取所有分类
   * @returns 按 sortOrder 排序的分类列表
   */
  async getCategories(): Promise<Category[]> {
    const response = await categoryApi.getCategories();
    const items = response.items || [];
    return items.map(mapApiCategory);
  }

  /**
   * 获取工具列表（支持筛选和分页）
   * @param params 查询参数
   * @returns 分页的工具列表
   */
  async getTools(params?: GetToolsParams): Promise<PaginatedResult<Tool>> {
    const response = await toolApi.getTools(
      // 过滤 undefined 值以兼容 exactOptionalPropertyTypes
      Object.fromEntries(
        Object.entries({
          category_id: params?.categoryId,
          search: params?.search,
          is_featured: params?.isFeatured,
          is_new: params?.isNew,
          is_hot: params?.isHot,
          page: params?.page,
          page_size: params?.pageSize,
        }).filter(([_, v]) => v !== undefined)
      )
    );
    const items = response.items || [];
    return {
      items: items.map(mapApiTool),
      total: response.total ?? items.length,
    };
  }

  /**
   * 获取工具详情
   * @param id 工具ID
   * @returns 工具详情，不存在则返回 null
   */
  async getToolById(id: string): Promise<Tool | null> {
    const response: any = await toolApi.getTool(id);
    if (!response) return null;
    return mapApiTool(response);
  }

  /**
   * 获取工具评价（支持分页）
   * @param toolId 工具ID
   * @param page 页码，默认 1
   * @param pageSize 每页数量，默认 10
   * @returns 分页的评价列表，按时间倒序排列
   */
  async getToolReviews(
    toolId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResult<Review>> {
    const response = await toolApi.getToolRatings(toolId, page, pageSize);
    const mappedItems: Review[] = (Array.isArray(response.items) ? response.items : []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user?.nickname || r.user_id || '',
      userAvatar: r.user?.avatar || '',
      rating: r.rating,
      content: r.content || '',
      createdAt: r.created_at ? new Date(r.created_at * 1000).toISOString() : '',
      toolId: r.tool_id,
    }));
    return {
      items: mappedItems,
      total: response.total ?? 0,
    };
  }
}
