import type { ToolProvider } from './ToolProvider';
import type { Category, Tool, Review, GetToolsParams, PaginatedResult } from '../types';
import { toolsApi } from '../lib/api';

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
    const response = await toolsApi.getCategories();
    return (response as any).items || response || [];
  }

  /**
   * 获取工具列表（支持筛选和分页）
   * @param params 查询参数
   * @returns 分页的工具列表
   */
  async getTools(params?: GetToolsParams): Promise<PaginatedResult<Tool>> {
    const response = await toolsApi.getTools(params);
    return response as PaginatedResult<Tool>;
  }

  /**
   * 获取工具详情
   * @param id 工具ID
   * @returns 工具详情，不存在则返回 null
   */
  async getToolById(id: string): Promise<Tool | null> {
    const response = await toolsApi.getToolById(id);
    return response as Tool;
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
    const response = await toolsApi.getToolReviews(toolId, page, pageSize);
    return response as PaginatedResult<Review>;
  }
}
