import type { Category, Tool, Review, GetToolsParams, PaginatedResult } from '../types';

/**
 * ToolProvider 接口 - 工具数据提供器
 * 定义获取工具相关数据的标准接口，支持多种实现（Mock、API等）
 */
export interface ToolProvider {
  /**
   * 获取所有分类
   * @returns 分类列表，按 sortOrder 排序
   */
  getCategories(): Promise<Category[]>;

  /**
   * 获取工具列表（支持筛选）
   * @param params 查询参数，支持分类、搜索、特征筛选和分页
   * @returns 分页的工具列表
   */
  getTools(params?: GetToolsParams): Promise<PaginatedResult<Tool>>;

  /**
   * 获取工具详情
   * @param id 工具ID
   * @returns 工具详情，不存在则返回 null
   */
  getToolById(id: string): Promise<Tool | null>;

  /**
   * 获取工具评价
   * @param toolId 工具ID
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 分页的评价列表
   */
  getToolReviews(
    toolId: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<Review>>;
}
