# 首页与工具展示系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于HTML原型实现像素级一致的首页与工具展示系统，包含分类筛选、搜索功能、工具详情页

**Architecture:** 增量分层架构 - 类型层 → Provider层 → Store层 → 组件层 → 页面层。严格保持与HTML原型的视觉一致性，渐进式添加数据绑定。

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand

---

## 文件结构映射

| 操作 | 文件路径 | 职责 |
|------|---------|------|
| 创建 | `apps/frontend-user/src/types/index.ts` | TypeScript类型定义 |
| 创建 | `apps/frontend-user/src/providers/ToolProvider.ts` | Provider接口定义 |
| 创建 | `apps/frontend-user/src/providers/mock-data/tools.json` | Mock工具数据 |
| 创建 | `apps/frontend-user/src/providers/mock-data/categories.json` | Mock分类数据 |
| 创建 | `apps/frontend-user/src/providers/mock-data/reviews.json` | Mock评价数据 |
| 创建 | `apps/frontend-user/src/providers/MockToolProvider.ts` | Mock数据Provider实现 |
| 创建 | `apps/frontend-user/src/store/useCategoryStore.ts` | 分类状态管理 |
| 创建 | `apps/frontend-user/src/store/useToolStore.ts` | 工具状态管理 |
| 创建 | `apps/frontend-user/src/app/globals.css` | 全局CSS样式（从HTML移植） |
| 修改 | `apps/frontend-user/tailwind.config.ts` | Tailwind颜色配置 |
| 创建 | `apps/frontend-user/src/components/layout/Navbar.tsx` | 导航栏组件 |
| 创建 | `apps/frontend-user/src/components/layout/Footer.tsx` | 页脚组件 |
| 创建 | `apps/frontend-user/src/components/layout/Breadcrumb.tsx` | 面包屑组件 |
| 创建 | `apps/frontend-user/src/components/shared/StarRating.tsx` | 星级评分组件 |
| 创建 | `apps/frontend-user/src/components/shared/ToolCard.tsx` | 通用工具卡片组件 |
| 创建 | `apps/frontend-user/src/components/home/HeroSection.tsx` | 首页Hero区域 |
| 创建 | `apps/frontend-user/src/components/home/BenchmarkTools.tsx` | 标杆工具展示 |
| 创建 | `apps/frontend-user/src/components/home/CategoryGrid.tsx` | 分类卡片网格 |
| 创建 | `apps/frontend-user/src/components/home/SectionPlaceholder.tsx` | 静态占位组件 |
| 创建 | `apps/frontend-user/src/components/tool-detail/ToolHero.tsx` | 工具头部 |
| 创建 | `apps/frontend-user/src/components/tool-detail/ToolFeatures.tsx` | 功能特性 |
| 创建 | `apps/frontend-user/src/components/tool-detail/ToolHowTo.tsx` | 使用步骤 |
| 创建 | `apps/frontend-user/src/components/tool-detail/ToolPricing.tsx` | 费用说明 |
| 创建 | `apps/frontend-user/src/components/tool-detail/ToolReviews.tsx` | 用户评价 |
| 修改 | `apps/frontend-user/src/app/page.tsx` | 首页组合 |
| 创建 | `apps/frontend-user/src/app/tools/[id]/page.tsx` | 工具详情页 |

---

## 阶段一：基础搭建

### Task 1: CSS样式移植

**Files:**
- Modify: `apps/frontend-user/src/app/globals.css`
- Modify: `apps/frontend-user/tailwind.config.ts`

- [ ] **Step 1: 清空现有 globals.css 并移植 HTML 样式**

```css
/* apps/frontend-user/src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
    font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
}

.gradient-text {
    background: linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.card-hover {
    transition: all 0.25s ease-out;
}

.card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(30, 58, 95, 0.12);
}

.btn-primary {
    background: linear-gradient(135deg, #059669 0%, #10B981 100%);
    transition: all 0.2s ease;
}

.btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 25px rgba(5, 150, 105, 0.3);
}

.btn-secondary {
    border: 2px solid #1E3A5F;
    transition: all 0.2s ease;
}

.btn-secondary:hover {
    background: #1E3A5F;
    color: white;
}

.tool-card {
    background: white;
    border-radius: 16px;
    border: 1px solid #E4E7EB;
    overflow: hidden;
}

.category-card {
    background: white;
    border-radius: 12px;
    border: 1px solid #E4E7EB;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.25s ease;
}

.category-card:hover {
    border-color: #2563EB;
    background: #F0F7FF;
}

.new-badge {
    background: linear-gradient(135deg, #F59E0B, #EF4444);
    color: white;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
}

.hot-badge {
    background: linear-gradient(135deg, #EF4444, #DC2626);
    color: white;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
}

.focus-ring:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.3);
}

.testimonial-card {
    background: white;
    border-radius: 16px;
    border: 1px solid #E4E7EB;
    padding: 28px;
}

.feature-card {
    background: white;
    border: 1px solid #E4E7EB;
    border-radius: 16px;
    padding: 24px;
    transition: all 0.25s ease;
}

.feature-card:hover {
    border-color: #2563EB;
    box-shadow: 0 10px 30px rgba(30, 58, 95, 0.08);
}

.step-card {
    background: white;
    border: 1px solid #E4E7EB;
    border-radius: 16px;
    padding: 32px 24px;
    text-align: center;
    position: relative;
}

.pricing-card {
    background: white;
    border: 2px solid #E4E7EB;
    border-radius: 20px;
    padding: 32px;
    transition: all 0.25s ease;
}

.pricing-card:hover {
    border-color: #059669;
}

.pricing-card.featured {
    border-color: #059669;
    background: linear-gradient(135deg, rgba(5, 150, 105, 0.02) 0%, rgba(16, 185, 129, 0.02) 100%);
}

.review-card {
    background: white;
    border: 1px solid #E4E7EB;
    border-radius: 16px;
    padding: 24px;
}

.footer-link {
    color: #64748B;
    transition: color 0.2s ease;
}

.footer-link:hover {
    color: #1E3A5F;
}

@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

- [ ] **Step 2: 更新 tailwind.config.ts 配置颜色**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A5F',
          light: '#2563EB',
        },
        success: {
          DEFAULT: '#059669',
          light: '#10B981',
        },
        border: '#E4E7EB',
        background: '#F8FAFC',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 3: 提交**

```bash
git add apps/frontend-user/src/app/globals.css apps/frontend-user/tailwind.config.ts
git commit -m "feat: 移植全局CSS样式和Tailwind配置"
```

---

### Task 2: TypeScript类型定义

**Files:**
- Create: `apps/frontend-user/src/types/index.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
// apps/frontend-user/src/types/index.ts

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  toolCount: number;
  sortOrder: number;
}

export interface ToolPricing {
  baseFee: number;
  resourceFees?: {
    image?: number;
    audio?: number;
    video?: number;
  };
  example?: string;
}

export interface ToolDemo {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  icon: string;
  categoryId: string;
  pricing: ToolPricing;
  demos: ToolDemo[];
  avgRating: number;
  useCount: number;
  isNew: boolean;
  isFeatured: boolean;
  isHot: boolean;
  tags: string[];
  status: 'active' | 'coming_soon' | 'maintenance';
  createdAt: string;
}

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

export interface GetToolsParams {
  categoryId?: string;
  search?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isHot?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/frontend-user/src/types/index.ts
git commit -m "feat: 添加TypeScript类型定义"
```

---

### Task 3: Provider接口与Mock数据

**Files:**
- Create: `apps/frontend-user/src/providers/ToolProvider.ts`
- Create: `apps/frontend-user/src/providers/mock-data/categories.json`
- Create: `apps/frontend-user/src/providers/mock-data/tools.json`
- Create: `apps/frontend-user/src/providers/mock-data/reviews.json`

- [ ] **Step 1: 创建 Provider 接口**

```typescript
// apps/frontend-user/src/providers/ToolProvider.ts
import { Category, Tool, Review, GetToolsParams, PaginatedResult } from '../types';

export interface ToolProvider {
  getCategories(): Promise<Category[]>;
  
  getTools(params?: GetToolsParams): Promise<PaginatedResult<Tool>>;
  
  getToolById(id: string): Promise<Tool | null>;
  
  getToolReviews(toolId: string, page?: number, pageSize?: number): Promise<PaginatedResult<Review>>;
}
```

- [ ] **Step 2: 创建分类Mock数据**

```json
{
  "items": [
    {
      "id": "creative-writing",
      "name": "创意写作",
      "icon": "✍️",
      "description": "AI辅助故事、文案、剧本创作",
      "toolCount": 5,
      "sortOrder": 1
    },
    {
      "id": "image-generation",
      "name": "图像生成",
      "icon": "🎨",
      "description": "AI绘画、插画、海报设计",
      "toolCount": 8,
      "sortOrder": 2
    },
    {
      "id": "ecommerce",
      "name": "电商工具",
      "icon": "🛒",
      "description": "商品详情页、主图、营销文案",
      "toolCount": 4,
      "sortOrder": 3
    },
    {
      "id": "audio-processing",
      "name": "音频处理",
      "icon": "🎵",
      "description": "语音合成、音频剪辑、配音",
      "toolCount": 3,
      "sortOrder": 4
    },
    {
      "id": "office-efficiency",
      "name": "办公效率",
      "icon": "📊",
      "description": "PPT、Excel、报告自动化",
      "toolCount": 6,
      "sortOrder": 5
    },
    {
      "id": "video-editing",
      "name": "视频创作",
      "icon": "🎬",
      "description": "短视频脚本、字幕、剪辑辅助",
      "toolCount": 3,
      "sortOrder": 6
    },
    {
      "id": "education",
      "name": "教育学习",
      "icon": "📚",
      "description": "课件制作、题库生成、学习计划",
      "toolCount": 4,
      "sortOrder": 7
    },
    {
      "id": "marketing",
      "name": "营销推广",
      "icon": "📈",
      "description": "营销方案、广告语、社群内容",
      "toolCount": 5,
      "sortOrder": 8
    }
  ]
}
```

- [ ] **Step 3: 创建工具Mock数据**

```json
{
  "items": [
    {
      "id": "storybook-generator",
      "name": "AI有声绘本生成专家",
      "description": "一键生成完整的儿童有声绘本，包含故事、插图、语音旁白，支持自定义主题、风格和页数。输出高清PDF和音频文件，可直接打印或发布。",
      "shortDescription": "一键生成有声绘本，故事+插图+配音完整交付",
      "icon": "📚",
      "categoryId": "creative-writing",
      "pricing": {
        "baseFee": 15,
        "resourceFees": {
          "image": 1,
          "audio": 1
        },
        "example": "10页绘本 ≈ 15 + 10×1 + 10×1 = 35积分"
      },
      "demos": [
        {
          "id": "1",
          "title": "小熊历险记",
          "imageUrl": "/images/demo/storybook-1.jpg",
          "description": "适合3-6岁儿童的冒险故事"
        }
      ],
      "avgRating": 4.9,
      "useCount": 12580,
      "isNew": false,
      "isFeatured": true,
      "isHot": true,
      "tags": ["绘本", "有声书", "儿童教育"],
      "status": "active",
      "createdAt": "2026-01-15T00:00:00Z"
    },
    {
      "id": "ecommerce-detail",
      "name": "AI电商商品详情页生成器",
      "description": "专业级电商详情页生成工具，支持自动生成商品主图、详情页分段图、营销文案。内置100+行业模板，输出PSD源文件可二次编辑。",
      "shortDescription": "电商详情页一键生成，主图+文案+PSD全包",
      "icon": "🛍️",
      "categoryId": "ecommerce",
      "pricing": {
        "baseFee": 12,
        "resourceFees": {
          "image": 1
        },
        "example": "5张主图 + 详情页 ≈ 12 + 10×1 = 22积分"
      },
      "demos": [],
      "avgRating": 4.8,
      "useCount": 8932,
      "isNew": true,
      "isFeatured": true,
      "isHot": true,
      "tags": ["电商", "详情页", "主图"],
      "status": "active",
      "createdAt": "2026-03-20T00:00:00Z"
    },
    {
      "id": "marketing-copywriter",
      "name": "AI营销文案大师",
      "description": "专业营销文案生成，覆盖广告语、海报文案、社群内容、邮件营销等20+场景。支持品牌调性定制，输出多种方案供选择。",
      "shortDescription": "20+营销场景文案，品牌调性可定制",
      "icon": "✏️",
      "categoryId": "marketing",
      "pricing": {
        "baseFee": 8,
        "resourceFees": {},
        "example": "单场营销活动文案 ≈ 8积分"
      },
      "demos": [],
      "avgRating": 4.7,
      "useCount": 15420,
      "isNew": false,
      "isFeatured": true,
      "isHot": false,
      "tags": ["文案", "营销", "广告"],
      "status": "active",
      "createdAt": "2026-02-10T00:00:00Z"
    }
  ]
}
```

- [ ] **Step 4: 创建评价Mock数据**

```json
{
  "storybook-generator": {
    "items": [
      {
        "id": "1",
        "userId": "u1",
        "userName": "张老师",
        "userAvatar": "/images/avatars/avatar-1.jpg",
        "rating": 5,
        "content": "太好用了！生成的绘本质量很高，孩子很喜欢。插图风格统一，语音合成也很自然。省了我至少一周的时间。",
        "createdAt": "2026-04-15T00:00:00Z",
        "toolId": "storybook-generator"
      },
      {
        "id": "2",
        "userId": "u2",
        "userName": "李妈妈",
        "userAvatar": "/images/avatars/avatar-2.jpg",
        "rating": 5,
        "content": "作为一个不会画画的妈妈，这个工具简直是救星。给孩子做了一本专属生日绘本，孩子爱不释手。",
        "createdAt": "2026-04-10T00:00:00Z",
        "toolId": "storybook-generator"
      },
      {
        "id": "3",
        "userId": "u3",
        "userName": "王园长",
        "userAvatar": "/images/avatars/avatar-3.jpg",
        "rating": 4,
        "content": "幼儿园教学用非常方便。如果能支持更多画风就更好了。",
        "createdAt": "2026-04-05T00:00:00Z",
        "toolId": "storybook-generator"
      }
    ],
    "total": 328
  }
}
```

- [ ] **Step 5: 提交**

```bash
git add apps/frontend-user/src/providers/ToolProvider.ts
git add apps/frontend-user/src/providers/mock-data/categories.json
git add apps/frontend-user/src/providers/mock-data/tools.json
git add apps/frontend-user/src/providers/mock-data/reviews.json
git commit -m "feat: 添加Provider接口和Mock数据"
```

---

### Task 4: MockProvider实现

**Files:**
- Create: `apps/frontend-user/src/providers/MockToolProvider.ts`

- [ ] **Step 1: 实现 MockToolProvider**

```typescript
// apps/frontend-user/src/providers/MockToolProvider.ts
import { ToolProvider } from './ToolProvider';
import { Category, Tool, Review, GetToolsParams, PaginatedResult } from '../types';
import categoriesData from './mock-data/categories.json';
import toolsData from './mock-data/tools.json';
import reviewsData from './mock-data/reviews.json';

export class MockToolProvider implements ToolProvider {
  private categories: Category[] = categoriesData.items as Category[];
  private tools: Tool[] = toolsData.items as Tool[];

  async getCategories(): Promise<Category[]> {
    await this.delay(100);
    return [...this.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getTools(params: GetToolsParams = {}): Promise<PaginatedResult<Tool>> {
    await this.delay(150);
    
    let filtered = [...this.tools];

    if (params.categoryId) {
      filtered = filtered.filter(t => t.categoryId === params.categoryId);
    }

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.shortDescription.toLowerCase().includes(searchLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (params.isFeatured) {
      filtered = filtered.filter(t => t.isFeatured);
    }

    if (params.isNew) {
      filtered = filtered.filter(t => t.isNew);
    }

    if (params.isHot) {
      filtered = filtered.filter(t => t.isHot);
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: filtered.slice(start, end),
      total: filtered.length,
    };
  }

  async getToolById(id: string): Promise<Tool | null> {
    await this.delay(100);
    return this.tools.find(t => t.id === id) || null;
  }

  async getToolReviews(toolId: string, page = 1, pageSize = 5): Promise<PaginatedResult<Review>> {
    await this.delay(120);
    
    const toolReviews = (reviewsData as Record<string, { items: Review[]; total: number }>)[toolId];
    
    if (!toolReviews) {
      return { items: [], total: 0 };
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: toolReviews.items.slice(start, end),
      total: toolReviews.total,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const mockToolProvider = new MockToolProvider();
```

- [ ] **Step 2: 提交**

```bash
git add apps/frontend-user/src/providers/MockToolProvider.ts
git commit -m "feat: 实现MockToolProvider"
```

---

## 阶段二：状态管理

### Task 5: Zustand Stores

**Files:**
- Create: `apps/frontend-user/src/store/useCategoryStore.ts`
- Create: `apps/frontend-user/src/store/useToolStore.ts`

- [ ] **Step 1: 创建 useCategoryStore**

```typescript
// apps/frontend-user/src/store/useCategoryStore.ts
import { create } from 'zustand';
import { Category } from '../types';
import { mockToolProvider } from '../providers/MockToolProvider';

interface CategoryState {
  categories: Category[];
  selectedCategoryId: string | null;
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  setSelectedCategory: (categoryId: string | null) => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  selectedCategoryId: null,
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const categories = await mockToolProvider.getCategories();
      set({ categories, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败', loading: false });
    }
  },

  setSelectedCategory: (categoryId) => {
    set({ selectedCategoryId: categoryId });
    get().fetchCategories();
  },
}));
```

- [ ] **Step 2: 创建 useToolStore**

```typescript
// apps/frontend-user/src/store/useToolStore.ts
import { create } from 'zustand';
import { Tool, Review } from '../types';
import { mockToolProvider } from '../providers/MockToolProvider';

interface ToolState {
  // 列表状态
  tools: Tool[];
  totalTools: number;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  categoryFilter: string | null;

  // 详情状态
  currentTool: Tool | null;
  currentToolReviews: Review[];
  totalReviews: number;
  detailLoading: boolean;

  // Actions
  fetchTools: (params?: { categoryId?: string; search?: string }) => Promise<void>;
  fetchToolDetail: (id: string) => Promise<void>;
  fetchToolReviews: (toolId: string, page?: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (categoryId: string | null) => void;
  clearCurrentTool: () => void;
}

export const useToolStore = create<ToolState>((set, get) => ({
  tools: [],
  totalTools: 0,
  loading: false,
  error: null,
  searchQuery: '',
  categoryFilter: null,

  currentTool: null,
  currentToolReviews: [],
  totalReviews: 0,
  detailLoading: false,

  fetchTools: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const { categoryId, search } = params;
      const result = await mockToolProvider.getTools({
        categoryId: categoryId || get().categoryFilter,
        search: search !== undefined ? search : get().searchQuery,
      });
      set({ tools: result.items, totalTools: result.total, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败', loading: false });
    }
  },

  fetchToolDetail: async (id: string) => {
    set({ detailLoading: true, error: null });
    try {
      const tool = await mockToolProvider.getToolById(id);
      set({ currentTool: tool, detailLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败', detailLoading: false });
    }
  },

  fetchToolReviews: async (toolId: string, page = 1) => {
    try {
      const result = await mockToolProvider.getToolReviews(toolId, page);
      set({ 
        currentToolReviews: result.items, 
        totalReviews: result.total 
      });
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setCategoryFilter: (categoryId: string | null) => {
    set({ categoryFilter: categoryId });
  },

  clearCurrentTool: () => {
    set({ currentTool: null, currentToolReviews: [], totalReviews: 0 });
  },
}));
```

- [ ] **Step 3: 提交**

```bash
git add apps/frontend-user/src/store/useCategoryStore.ts apps/frontend-user/src/store/useToolStore.ts
git commit -m "feat: 添加Zustand状态管理"
```

---

## 阶段三：基础布局组件

### Task 6: Navbar & Footer

**Files:**
- Create: `apps/frontend-user/src/components/layout/Navbar.tsx`
- Create: `apps/frontend-user/src/components/layout/Footer.tsx`

- [ ] **Step 1: 创建 Navbar 组件**

```tsx
// apps/frontend-user/src/components/layout/Navbar.tsx
'use client';

import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E4E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
            <span className="font-bold text-xl text-[#1E3A5F]">灵创AI</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-[#475569] hover:text-[#1E3A5F] font-medium transition-colors focus-ring rounded">首页</Link>
            <Link href="/tools" className="text-[#475569] hover:text-[#1E3A5F] font-medium transition-colors focus-ring rounded">工具中心</Link>
            <Link href="/vote" className="text-[#475569] hover:text-[#1E3A5F] font-medium transition-colors focus-ring rounded">用户共创</Link>
            <Link href="/feedback" className="text-[#475569] hover:text-[#1E3A5F] font-medium transition-colors focus-ring rounded">帮助反馈</Link>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/user-center" className="hidden sm:block px-4 py-2 text-[#1E3A5F] font-medium hover:bg-[#F1F3F5] rounded-lg transition-colors focus-ring">个人中心</Link>
            <Link href="/pricing" className="btn-primary px-5 py-2 text-white font-semibold rounded-lg focus-ring">充值套餐</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: 创建 Footer 组件**

```tsx
// apps/frontend-user/src/components/layout/Footer.tsx
'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#1E3A5F] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <span className="font-bold text-xl">灵创AI工具箱</span>
            </div>
            <p className="text-white/70 text-sm">
              专注垂直专业场景的精品AI工具集合平台
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">产品服务</h4>
            <ul className="space-y-2">
              <li><Link href="/tools" className="text-white/70 hover:text-white transition-colors text-sm">全部工具</Link></li>
              <li><Link href="/vote" className="text-white/70 hover:text-white transition-colors text-sm">用户共创</Link></li>
              <li><Link href="/pricing" className="text-white/70 hover:text-white transition-colors text-sm">充值套餐</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">帮助支持</h4>
            <ul className="space-y-2">
              <li><Link href="/feedback" className="text-white/70 hover:text-white transition-colors text-sm">意见反馈</Link></li>
              <li><Link href="/help" className="text-white/70 hover:text-white transition-colors text-sm">使用帮助</Link></li>
              <li><Link href="/docs" className="text-white/70 hover:text-white transition-colors text-sm">API文档</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">联系我们</h4>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>客服邮箱：support@lingchuang.ai</li>
              <li>工作时间：周一至周五 9:00-18:00</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">© 2026 灵创AI工具箱. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-white/50 hover:text-white transition-colors text-sm">隐私政策</Link>
            <Link href="/terms" className="text-white/50 hover:text-white transition-colors text-sm">服务条款</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: 更新 layout.tsx**

修改 `apps/frontend-user/src/app/layout.tsx`：

```tsx
import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: '灵创AI工具箱 - 专业场景AI工具集合平台',
  description: '专注垂直专业场景的精品AI工具集合平台，深耕细分场景，做深做透每一个工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={`${dmSans.className} bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: 运行开发服务器验证**

```bash
cd apps/frontend-user && npm run dev
```

Expected: 页面正常加载，导航栏和页脚显示正常

- [ ] **Step 5: 提交**

```bash
git add apps/frontend-user/src/components/layout/Navbar.tsx
git add apps/frontend-user/src/components/layout/Footer.tsx
git add apps/frontend-user/src/app/layout.tsx
git commit -m "feat: 实现导航栏和页脚组件"
```

---

### Task 7: 共享组件 (StarRating & ToolCard)

**Files:**
- Create: `apps/frontend-user/src/components/shared/StarRating.tsx`
- Create: `apps/frontend-user/src/components/shared/ToolCard.tsx`

- [ ] **Step 1: 创建 StarRating 组件**

```tsx
// apps/frontend-user/src/components/shared/StarRating.tsx
'use client';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({ rating, size = 'md' }: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = i <= rating;
    stars.push(
      <svg
        key={i}
        className={`${sizeClasses[size]} ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {stars}
    </div>
  );
}
```

- [ ] **Step 2: 创建 ToolCard 组件**

```tsx
// apps/frontend-user/src/components/shared/ToolCard.tsx
'use client';

import Link from 'next/link';
import { Tool } from '../../types';
import { StarRating } from './StarRating';

interface ToolCardProps {
  tool: Tool;
  size?: 'normal' | 'large';
}

export function ToolCard({ tool, size = 'normal' }: ToolCardProps) {
  return (
    <Link href={`/tools/${tool.id}`} className="block">
      <div className={`tool-card card-hover ${size === 'large' ? 'p-6' : 'p-5'}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center text-2xl">
            {tool.icon}
          </div>
          <div className="flex gap-2">
            {tool.isNew && <span className="new-badge">NEW</span>}
            {tool.isHot && <span className="hot-badge">HOT</span>}
          </div>
        </div>

        <h3 className="font-bold text-lg text-[#1E3A5F] mb-2">{tool.name}</h3>
        <p className="text-[#64748B] text-sm mb-4 line-clamp-2">{tool.shortDescription}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(tool.avgRating)} size="sm" />
            <span className="text-sm text-[#64748B]">{tool.avgRating}</span>
            <span className="text-[#E4E7EB]">|</span>
            <span className="text-sm text-[#64748B]">{tool.useCount.toLocaleString()}人使用</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#E4E7EB]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#059669]">
              {tool.pricing.baseFee} 积分起
            </span>
            <span className="text-[#2563EB] font-medium text-sm flex items-center gap-1">
              立即使用
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add apps/frontend-user/src/components/shared/StarRating.tsx
git add apps/frontend-user/src/components/shared/ToolCard.tsx
git commit -m "feat: 实现StarRating和ToolCard共享组件"
```

---

## 阶段四：首页组件

### Task 8: HeroSection

**Files:**
- Create: `apps/frontend-user/src/components/home/HeroSection.tsx`

- [ ] **Step 1: 创建 HeroSection 组件**

```tsx
// apps/frontend-user/src/components/home/HeroSection.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToolStore } from '../../store/useToolStore';
import Link from 'next/link';

export function HeroSection() {
  const [searchInput, setSearchInput] = useState('');
  const { setSearchQuery, fetchTools } = useToolStore();

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
      fetchTools({ search: query });
    }, 300),
    [setSearchQuery, fetchTools]
  );

  useEffect(() => {
    debouncedSearch(searchInput);
  }, [searchInput, debouncedSearch]);

  return (
    <section className="relative overflow-hidden py-16 lg:py-24 bg-gradient-to-br from-[#F8FAFC] via-white to-[#F0F7FF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl lg:text-5xl font-bold text-[#1E3A5F] mb-6 leading-tight">
            专业场景
            <span className="gradient-text"> AI工具箱</span>
          </h1>
          <p className="text-xl text-[#64748B] mb-8 max-w-2xl mx-auto">
            深耕细分场景，做深做透每一个工具。让您在特定领域获得开箱即用的专业级效果。
          </p>

          {/* 搜索框 */}
          <div className="max-w-xl mx-auto mb-12">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索工具、标签..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full px-6 py-4 pl-14 rounded-2xl border-2 border-[#E4E7EB] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all text-lg"
              />
              <svg
                className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-[#94A3B8]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* 5个价值卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {valueCards.map((card, index) => (
              <div
                key={index}
                className="value-card bg-white rounded-xl p-4 flex flex-col items-center text-center card-hover"
              >
                <div className="text-3xl mb-2">{card.icon}</div>
                <h3 className="font-semibold text-[#1E3A5F] text-sm">{card.title}</h3>
                <p className="text-xs text-[#64748B] mt-1">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const valueCards = [
  { icon: '🎯', title: '场景化', desc: '细分领域深度优化' },
  { icon: '💎', title: '专业化', desc: '商用级输出质量' },
  { icon: '📦', title: '可交付', desc: '完整成果包下载' },
  { icon: '🔄', title: '可迭代', desc: '基于历史持续优化' },
  { icon: '💰', title: '按次计费', desc: '清晰透明无订阅' },
];

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/frontend-user/src/components/home/HeroSection.tsx
git commit -m "feat: 实现首页Hero区域和搜索"
```

---

### Task 9: CategoryGrid & BenchmarkTools

**Files:**
- Create: `apps/frontend-user/src/components/home/CategoryGrid.tsx`
- Create: `apps/frontend-user/src/components/home/BenchmarkTools.tsx`
- Create: `apps/frontend-user/src/components/home/SectionPlaceholder.tsx`

- [ ] **Step 1: 创建 CategoryGrid 组件**

```tsx
// apps/frontend-user/src/components/home/CategoryGrid.tsx
'use client';

import { useEffect } from 'react';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useToolStore } from '../../store/useToolStore';

export function CategoryGrid() {
  const { categories, fetchCategories, selectedCategoryId, setSelectedCategory } = useCategoryStore();
  const { categoryFilter, setCategoryFilter, fetchTools } = useToolStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCategoryClick = (categoryId: string) => {
    const newFilter = categoryFilter === categoryId ? null : categoryId;
    setCategoryFilter(newFilter);
    fetchTools({ categoryId: newFilter });
  };

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#1E3A5F] mb-3">工具分类</h2>
          <p className="text-[#64748B]">选择您需要的领域，快速找到合适工具</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`category-card cursor-pointer ${
                categoryFilter === category.id ? 'border-[#2563EB] bg-[#F0F7FF]' : ''
              }`}
            >
              <div className="text-4xl mb-3">{category.icon}</div>
              <h3 className="font-semibold text-[#1E3A5F] mb-1">{category.name}</h3>
              <p className="text-xs text-[#64748B]">{category.toolCount} 个工具</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 创建 BenchmarkTools 组件**

```tsx
// apps/frontend-user/src/components/home/BenchmarkTools.tsx
'use client';

import { useEffect } from 'react';
import { useToolStore } from '../../store/useToolStore';
import { ToolCard } from '../shared/ToolCard';

export function BenchmarkTools() {
  const { tools, loading, fetchTools } = useToolStore();

  useEffect(() => {
    fetchTools({ isFeatured: true });
  }, [fetchTools]);

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#1E3A5F] mb-3">标杆工具</h2>
          <p className="text-[#64748B]">经过深度打磨的明星工具，用户口碑之选</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#64748B]">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} size="large" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 创建 SectionPlaceholder 组件**

```tsx
// apps/frontend-user/src/components/home/SectionPlaceholder.tsx
'use client';

interface SectionPlaceholderProps {
  title: string;
  description?: string;
}

export function SectionPlaceholder({ title, description }: SectionPlaceholderProps) {
  return (
    <section className="py-16 bg-white border-y border-[#E4E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#F8FAFC] mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">{title}</h2>
          {description && <p className="text-[#64748B]">{description}</p>}
          <p className="text-sm text-[#94A3B8] mt-2">即将上线，敬请期待</p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 提交**

```bash
git add apps/frontend-user/src/components/home/CategoryGrid.tsx
git add apps/frontend-user/src/components/home/BenchmarkTools.tsx
git add apps/frontend-user/src/components/home/SectionPlaceholder.tsx
git commit -m "feat: 实现分类网格和标杆工具组件"
```

---

### Task 10: 首页组合

**Files:**
- Modify: `apps/frontend-user/src/app/page.tsx`

- [ ] **Step 1: 更新首页**

```tsx
// apps/frontend-user/src/app/page.tsx
import { HeroSection } from '../components/home/HeroSection';
import { CategoryGrid } from '../components/home/CategoryGrid';
import { BenchmarkTools } from '../components/home/BenchmarkTools';
import { SectionPlaceholder } from '../components/home/SectionPlaceholder';

export default function Home() {
  return (
    <>
      <HeroSection />
      <BenchmarkTools />
      <CategoryGrid />
      <SectionPlaceholder
        title="新工具 & 热门推荐"
        description="最新上线和用户最爱的AI工具"
      />
      <SectionPlaceholder
        title="用户共创"
        description="参与投票，决定下一个工具"
      />
      <SectionPlaceholder
        title="用户评价"
        description="来自真实用户的使用体验"
      />
    </>
  );
}
```

- [ ] **Step 2: 运行开发服务器验证首页**

```bash
cd apps/frontend-user && npm run dev
```

Expected: 首页完整加载，所有区块正常显示，搜索和分类可交互

- [ ] **Step 3: 提交**

```bash
git add apps/frontend-user/src/app/page.tsx
git commit -m "feat: 完成首页组件组合"
```

---

## 阶段五：工具详情页

### Task 11: Breadcrumb & ToolHero

**Files:**
- Create: `apps/frontend-user/src/components/layout/Breadcrumb.tsx`
- Create: `apps/frontend-user/src/components/tool-detail/ToolHero.tsx`

- [ ] **Step 1: 创建 Breadcrumb 组件**

```tsx
// apps/frontend-user/src/components/layout/Breadcrumb.tsx
'use client';

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center gap-2 text-sm text-[#64748B]">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <span>/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-[#1E3A5F] transition-colors focus-ring rounded">
                {item.label}
              </Link>
            ) : (
              <span className="text-[#1E3A5F] font-medium">{item.label}</span>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: 创建 ToolHero 组件**

```tsx
// apps/frontend-user/src/components/tool-detail/ToolHero.tsx
'use client';

import Link from 'next/link';
import { Tool } from '../../types';
import { StarRating } from '../shared/StarRating';

interface ToolHeroProps {
  tool: Tool;
}

export function ToolHero({ tool }: ToolHeroProps) {
  return (
    <section className="pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-[#E4E7EB] overflow-hidden">
          <div className="p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left: Icon */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center text-5xl lg:text-6xl shadow-lg">
                  {tool.icon}
                </div>
              </div>

              {/* Right: Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h1 className="text-2xl lg:text-3xl font-bold text-[#1E3A5F]">{tool.name}</h1>
                  {tool.isNew && <span className="new-badge">NEW</span>}
                  {tool.isHot && <span className="hot-badge">HOT</span>}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-3 mb-4">
                  <StarRating rating={Math.round(tool.avgRating)} size="md" />
                  <span className="font-semibold text-[#1E3A5F]">{tool.avgRating}</span>
                  <span className="text-[#E4E7EB]">|</span>
                  <span className="text-[#64748B]">{tool.useCount.toLocaleString()} 人使用过</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {tool.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-[#F8FAFC] text-[#64748B] text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="text-[#64748B] mb-6 leading-relaxed">{tool.description}</p>

                {/* Pricing Preview */}
                <div className="bg-[#F8FAFC] rounded-xl p-4 mb-6 inline-block">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-[#64748B]">基础费用</span>
                    <span className="text-3xl font-bold text-[#059669]">{tool.pricing.baseFee}</span>
                    <span className="text-[#64748B]">积分起</span>
                  </div>
                  {tool.pricing.example && (
                    <p className="text-sm text-[#94A3B8] mt-1">{tool.pricing.example}</p>
                  )}
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4">
                  <Link
                    href={`/tools/${tool.id}/generate`}
                    className="btn-primary px-8 py-3 text-white font-semibold rounded-xl text-lg inline-flex items-center gap-2"
                  >
                    <span>🔥 立即开始生成</span>
                  </Link>
                  <Link
                    href={`/tools/${tool.id}#demo`}
                    className="btn-secondary px-8 py-3 text-[#1E3A5F] font-semibold rounded-xl text-lg inline-flex items-center gap-2"
                  >
                    <span>💡 查看演示</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add apps/frontend-user/src/components/layout/Breadcrumb.tsx
git add apps/frontend-user/src/components/tool-detail/ToolHero.tsx
git commit -m "feat: 实现面包屑和工具头部组件"
```

---

### Task 12: ToolFeatures & ToolHowTo & ToolPricing & ToolReviews

**Files:**
- Create: `apps/frontend-user/src/components/tool-detail/ToolFeatures.tsx`
- Create: `apps/frontend-user/src/components/tool-detail/ToolHowTo.tsx`
- Create: `apps/frontend-user/src/components/tool-detail/ToolPricing.tsx`
- Create: `apps/frontend-user/src/components/tool-detail/ToolReviews.tsx`

- [ ] **Step 1: 创建 ToolFeatures 组件**

```tsx
// apps/frontend-user/src/components/tool-detail/ToolFeatures.tsx
'use client';

export function ToolFeatures() {
  return (
    <section className="py-12" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#1E3A5F] mb-3">核心功能</h2>
          <p className="text-[#64748B] max-w-2xl mx-auto">
            深度打磨每一个细节，让专业级创作触手可及
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="feature-card card-hover">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="font-bold text-lg text-[#1E3A5F] mb-2">{feature.title}</h3>
              <p className="text-[#64748B] text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: '🤖',
    title: '智能故事生成',
    desc: '基于先进的大语言模型，根据您的主题自动生成结构完整、情节丰富的故事内容',
  },
  {
    icon: '🎨',
    title: '风格化插图',
    desc: '支持多种绘画风格，水彩、卡通、手绘、3D等，每页插图风格统一、精美',
  },
  {
    icon: '🔊',
    title: '专业语音合成',
    desc: '媲美真人的AI语音合成，支持多音色、多语种，自动匹配角色情感',
  },
  {
    icon: '📄',
    title: '一键排版输出',
    desc: '自动排版生成PDF文件，适合打印、电子阅读、平板展示多种场景',
  },
  {
    icon: '🔄',
    title: '迭代优化',
    desc: '支持基于历史版本修改，不满意可以反复调整，逐步优化到完美',
  },
  {
    icon: '💾',
    title: '作品管理',
    desc: '所有作品云端保存，随时查看、下载、编辑，创建个人作品库',
  },
];
```

- [ ] **Step 2: 创建 ToolHowTo 组件**

```tsx
// apps/frontend-user/src/components/tool-detail/ToolHowTo.tsx
'use client';

export function ToolHowTo() {
  return (
    <section className="py-12 bg-white" id="howto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#1E3A5F] mb-3">使用步骤</h2>
          <p className="text-[#64748B]">简单三步，即可完成专业级创作</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* 连接线 */}
          <div className="hidden md:block absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-[#2563EB] via-[#10B981] to-[#059669] -translate-y-1/2" />

          {steps.map((step, index) => (
            <div key={index} className="step-card relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2563EB] to-[#059669] text-white font-bold text-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                {index + 1}
              </div>
              <h3 className="font-bold text-lg text-[#1E3A5F] mb-2">{step.title}</h3>
              <p className="text-[#64748B] text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    title: '填写参数',
    desc: '输入主题、目标受众、风格偏好等基础信息，也可以上传参考内容',
  },
  {
    title: 'AI生成',
    desc: '点击开始，AI自动完成故事创作、插图生成、语音合成等全部工作',
  },
  {
    title: '下载交付',
    desc: '预览效果满意后，一键下载完整成果包，包含全部源文件',
  },
];
```

- [ ] **Step 3: 创建 ToolPricing 组件**

```tsx
// apps/frontend-user/src/components/tool-detail/ToolPricing.tsx
'use client';

import { Tool } from '../../types';

interface ToolPricingProps {
  tool: Tool;
}

export function ToolPricing({ tool }: ToolPricingProps) {
  return (
    <section className="py-12" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#1E3A5F] mb-3">费用说明</h2>
          <p className="text-[#64748B]">按实际使用量计费，清晰透明，无隐藏费用</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="pricing-card featured">
            <h3 className="text-xl font-bold text-[#1E3A5F] mb-6 text-center">计费明细</h3>
            
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E4E7EB]">
                  <th className="text-left py-3 text-[#64748B] font-medium">项目</th>
                  <th className="text-center py-3 text-[#64748B] font-medium">单价</th>
                  <th className="text-right py-3 text-[#64748B] font-medium">说明</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#E4E7EB]">
                  <td className="py-4 font-medium text-[#1E3A5F]">基础服务费</td>
                  <td className="py-4 text-center font-bold text-[#059669]">{tool.pricing.baseFee} 积分</td>
                  <td className="py-4 text-right text-[#64748B] text-sm">包含文案生成、排版打包</td>
                </tr>
                {tool.pricing.resourceFees?.image && (
                  <tr className="border-b border-[#E4E7EB]">
                    <td className="py-4 font-medium text-[#1E3A5F]">图片生成</td>
                    <td className="py-4 text-center font-bold text-[#059669]">{tool.pricing.resourceFees.image} 积分/张</td>
                    <td className="py-4 text-right text-[#64748B] text-sm">每页一张插图</td>
                  </tr>
                )}
                {tool.pricing.resourceFees?.audio && (
                  <tr className="border-b border-[#E4E7EB]">
                    <td className="py-4 font-medium text-[#1E3A5F]">语音合成</td>
                    <td className="py-4 text-center font-bold text-[#059669]">{tool.pricing.resourceFees.audio} 积分/页</td>
                    <td className="py-4 text-right text-[#64748B] text-sm">每页语音 narration</td>
                  </tr>
                )}
              </tbody>
            </table>

            {tool.pricing.example && (
              <div className="mt-6 p-4 bg-[#F8FAFC] rounded-xl">
                <p className="text-center text-[#64748B]">
                  <span className="font-semibold text-[#1E3A5F]">参考示例：</span>
                  {tool.pricing.example}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 创建 ToolReviews 组件**

```tsx
// apps/frontend-user/src/components/tool-detail/ToolReviews.tsx
'use client';

import { Review } from '../../types';
import { StarRating } from '../shared/StarRating';

interface ToolReviewsProps {
  reviews: Review[];
  totalCount: number;
  avgRating: number;
}

export function ToolReviews({ reviews, totalCount, avgRating }: ToolReviewsProps) {
  return (
    <section className="py-12 bg-white" id="reviews">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#1E3A5F] mb-3">用户评价</h2>
          <p className="text-[#64748B]">来自 {totalCount} 位真实用户的使用体验</p>
        </div>

        {/* Rating Summary */}
        <div className="max-w-md mx-auto mb-10 text-center">
          <div className="flex items-center justify-center gap-4 mb-2">
            <StarRating rating={Math.round(avgRating)} size="lg" />
            <span className="text-4xl font-bold text-[#1E3A5F]">{avgRating}</span>
          </div>
          <p className="text-[#64748B]">综合评分</p>
        </div>

        {/* Review List */}
        <div className="max-w-3xl mx-auto space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="review-card">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2563EB] to-[#059669] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {review.userName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-[#1E3A5F]">{review.userName}</h4>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  <p className="text-[#64748B] text-sm leading-relaxed">{review.content}</p>
                  <p className="text-[#94A3B8] text-xs mt-2">
                    {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: 提交**

```bash
git add apps/frontend-user/src/components/tool-detail/ToolFeatures.tsx
git add apps/frontend-user/src/components/tool-detail/ToolHowTo.tsx
git add apps/frontend-user/src/components/tool-detail/ToolPricing.tsx
git add apps/frontend-user/src/components/tool-detail/ToolReviews.tsx
git commit -m "feat: 实现工具详情页功能、步骤、定价、评价组件"
```

---

### Task 13: 工具详情页组合

**Files:**
- Create: `apps/frontend-user/src/app/tools/[id]/page.tsx`

- [ ] **Step 1: 创建工具详情页**

```tsx
// apps/frontend-user/src/app/tools/[id]/page.tsx
'use client';

import { useEffect } from 'react';
import { useToolStore } from '../../../store/useToolStore';
import { Breadcrumb } from '../../../components/layout/Breadcrumb';
import { ToolHero } from '../../../components/tool-detail/ToolHero';
import { ToolFeatures } from '../../../components/tool-detail/ToolFeatures';
import { ToolHowTo } from '../../../components/tool-detail/ToolHowTo';
import { ToolPricing } from '../../../components/tool-detail/ToolPricing';
import { ToolReviews } from '../../../components/tool-detail/ToolReviews';
import Link from 'next/link';

interface ToolDetailPageProps {
  params: {
    id: string;
  };
}

export default function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { currentTool, currentToolReviews, totalReviews, detailLoading, fetchToolDetail, fetchToolReviews, clearCurrentTool } = useToolStore();

  useEffect(() => {
    clearCurrentTool();
    fetchToolDetail(params.id);
    fetchToolReviews(params.id, 1);
  }, [params.id, fetchToolDetail, fetchToolReviews, clearCurrentTool]);

  if (detailLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-[#64748B] text-lg">加载中...</div>
      </div>
    );
  }

  if (!currentTool) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="text-[#64748B] text-lg mb-4">工具不存在或已下线</div>
        <Link href="/" className="btn-primary px-6 py-2 text-white rounded-lg">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: '首页', href: '/' },
          { label: '工具中心', href: '/tools' },
          { label: currentTool.name },
        ]}
      />
      <ToolHero tool={currentTool} />
      <ToolFeatures />
      <ToolHowTo />
      <ToolPricing tool={currentTool} />
      <ToolReviews
        reviews={currentToolReviews}
        totalCount={totalReviews}
        avgRating={currentTool.avgRating}
      />

      {/* Bottom CTA */}
      <section className="py-16 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">准备好开始创作了吗？</h2>
          <p className="text-white/80 mb-8">立即开始，体验专业级AI创作工具</p>
          <Link
            href={`/tools/${currentTool.id}/generate`}
            className="inline-flex items-center gap-2 bg-white text-[#1E3A5F] px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all"
          >
            <span>🔥 立即开始生成</span>
          </Link>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: 运行开发服务器验证详情页**

```bash
cd apps/frontend-user && npm run dev
```

Expected: 访问 `/tools/storybook-generator` 能看到完整的工具详情页

- [ ] **Step 3: 提交**

```bash
git add apps/frontend-user/src/app/tools/[id]/page.tsx
git commit -m "feat: 完成工具详情页组合"
```

---

## 阶段六：集成测试与优化

### Task 14: 集成测试与优化

**Files:**
- 可能修改多个文件进行bug修复

- [ ] **Step 1: 测试首页完整流程**

测试项：
1. 页面加载无报错
2. 导航跳转正常
3. 搜索框输入触发筛选
4. 点击分类筛选工具
5. 工具卡片点击进入详情页
6. 响应式布局在移动端正常

- [ ] **Step 2: 测试详情页完整流程**

测试项：
1. 从首页点击工具进入详情页
2. 所有区块完整显示
3. 面包屑导航正常
4. 返回首页正常

- [ ] **Step 3: TypeScript 类型检查**

```bash
cd apps/frontend-user && npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 4: 构建验证**

```bash
cd apps/frontend-user && npm run build
```

Expected: 构建成功

- [ ] **Step 5: 提交最终代码**

```bash
git add .
git commit -m "feat: 完成首页与工具展示系统所有功能"
```

---

## ✅ 完成里程碑

所有任务完成，已实现：

1. **完整的首页**：
   - Hero区域 + 搜索
   - 标杆工具展示
   - 分类筛选网格
   - 占位区块

2. **完整的工具详情页**：
   - 面包屑导航
   - 工具头部信息
   - 功能特性展示
   - 使用步骤说明
   - 费用说明
   - 用户评价列表

3. **架构**：
   - TypeScript 类型系统
   - Provider 数据接口层
   - Zustand 状态管理
   - 组件化架构

4. **CSS**：
   - 与HTML原型1:1还原
   - 响应式布局
   - 动画效果完整
```

<seed:tool_call><function name="TodoWrite"><parameter name="todos" string="false">[{"content": "Explore project context - check files, docs, recent commits", "status": "completed", "activeForm": "Exploring project context"}, {"content": "Offer visual companion if needed", "status": "completed", "activeForm": "Offering visual companion"}, {"content": "Ask clarifying questions to understand next steps", "status": "completed", "activeForm": "Asking clarifying questions"}, {"content": "Propose 2-3 approaches with trade-offs", "status": "completed", "activeForm": "Proposing approaches"}, {"content": "Present design and get user approval", "status": "completed", "activeForm": "Presenting design"}, {"content": "Write design doc", "status": "completed", "activeForm": "Writing design doc"}, {"content": "Spec self-review", "status": "completed", "activeForm": "Reviewing spec"}]