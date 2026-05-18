import type { ToolProvider } from './ToolProvider';
import type { Category, Tool, Review, GetToolsParams, PaginatedResult } from '../types';
import categoriesData from './mock-data/categories.json';
import toolsData from './mock-data/tools.json';
import reviewsData from './mock-data/reviews.json';

/**
 * MockToolProvider - 模拟数据提供器
 * 使用本地 JSON 模拟数据，模拟网络延迟，用于开发和测试
 */
export class MockToolProvider implements ToolProvider {
  /**
   * 模拟网络延迟
   * @param ms 延迟毫秒数
   */
  private delay(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取所有分类
   * @returns 按 sortOrder 排序的分类列表
   */
  async getCategories(): Promise<Category[]> {
    await this.delay(80 + Math.random() * 70);
    return [...categoriesData].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * 获取工具列表（支持筛选和分页）
   * @param params 查询参数
   * @returns 分页的工具列表
   */
  async getTools(params?: GetToolsParams): Promise<PaginatedResult<Tool>> {
    await this.delay(100 + Math.random() * 100);

    let tools = [...(toolsData as Tool[])];

    if (!params) {
      return { items: tools, total: tools.length };
    }

    // 按分类筛选
    if (params.categoryId) {
      tools = tools.filter(t => t.categoryId === params.categoryId);
    }

    // 按搜索关键词筛选 (name, description, tags)
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      tools = tools.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // 按精选筛选
    if (params.isFeatured !== undefined) {
      tools = tools.filter(t => t.isFeatured === params.isFeatured);
    }

    // 按新品筛选
    if (params.isNew !== undefined) {
      tools = tools.filter(t => t.isNew === params.isNew);
    }

    // 按热门筛选
    if (params.isHot !== undefined) {
      tools = tools.filter(t => t.isHot === params.isHot);
    }

    const total = tools.length;

    // 分页处理
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    tools = tools.slice(startIndex, endIndex);

    return { items: tools, total };
  }

  /**
   * 获取工具详情
   * @param id 工具ID
   * @returns 工具详情，不存在则返回 null
   */
  async getToolById(id: string): Promise<Tool | null> {
    await this.delay(60 + Math.random() * 60);
    const tool = (toolsData as Tool[]).find(t => t.id === id);
    return tool ? { ...tool } : null;
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
    await this.delay(70 + Math.random() * 80);

    let reviews = (reviewsData as Review[])
      .filter(r => r.toolId === toolId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = reviews.length;

    // 分页处理
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    reviews = reviews.slice(startIndex, endIndex);

    return { items: reviews, total };
  }
}
