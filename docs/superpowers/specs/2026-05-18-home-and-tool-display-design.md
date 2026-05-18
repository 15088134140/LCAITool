---
name: home-and-tool-display-design
description: 首页与工具展示系统设计文档 - 基于HTML原型1:1还原
metadata:
  type: design-spec
  date: 2026-05-18
  version: 1.0
  author: Claude
  component: frontend-user
---

# 首页与工具展示系统设计文档

## 1. 概述

### 1.1 目标

基于 `docs/design/` 目录下的HTML原型文件，实现像素级一致的首页与工具展示系统。采用增量分层架构，实现前后端完全解耦，支持Mock数据与真实API无缝切换。

### 1.2 范围

| 模块 | 功能 | 优先级 |
|------|------|--------|
| **首页** | Hero区域 + 搜索框 + 价值卡片 | P0 |
| **首页** | 标杆工具展示（3个） | P0 |
| **首页** | 工具分类网格（8个分类） | P0 |
| **首页** | 新工具&热门推荐占位 | P1 |
| **首页** | 用户共创投票占位 | P1 |
| **首页** | 用户评价占位 | P1 |
| **工具详情页** | 面包屑导航 | P0 |
| **工具详情页** | 工具头部信息（图标、名称、评分、标签、描述） | P0 |
| **工具详情页** | 核心功能展示（6个卡片） | P0 |
| **工具详情页** | 使用步骤说明（3步） | P0 |
| **工具详情页** | 费用说明（计费明细表格） | P0 |
| **工具详情页** | 用户评价列表 | P0 |
| **工具详情页** | 底部CTA区域 | P0 |
| **交互** | 搜索筛选工具 | P0 |
| **交互** | 分类筛选工具 | P0 |
| **交互** | 点击工具卡片进入详情页 | P0 |

### 1.3 非目标

- 工具执行逻辑（二期开发）
- 用户认证系统（后续模块）
- 支付与充值系统（后续模块）
- 后端API实现（前端只定义接口）

---

## 2. 架构设计

### 2.1 分层架构

```
┌─────────────────────────────────────────┐
│  页面层 (app/)                          │
│  - 路由、布局组合                        │
│  - 无业务逻辑，只组合组件               │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  组件层 (components/)                    │
│  - UI渲染、用户交互                      │
│  - 调用store获取状态                    │
│  - 无直接API调用                         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Store层 (store/)                        │
│  - 状态管理、业务逻辑                    │
│  - 调用Provider获取数据                 │
│  - 管理loading/error状态                │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Provider层 (providers/)                 │
│  - 数据接口定义                          │
│  - Mock数据实现                          │
│  - 未来可无缝切换到真实API              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  类型层 (types/)                         │
│  - TypeScript类型定义                    │
│  - 接口契约定义                          │
└─────────────────────────────────────────┘
```

### 2.2 数据流

```
用户交互
    ↓
组件触发store action
    ↓
Store调用Provider接口
    ↓
Provider返回数据（Mock/API）
    ↓
Store更新状态
    ↓
组件自动重渲染
```

### 2.3 目录结构

```
apps/frontend-user/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # 根布局
│   │   ├── page.tsx                    # 首页
│   │   ├── globals.css                 # 全局样式
│   │   └── tools/
│   │       └── [id]/
│   │           └── page.tsx            # 工具详情页
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx              # 导航栏
│   │   │   ├── Footer.tsx              # 页脚
│   │   │   └── Breadcrumb.tsx          # 面包屑
│   │   │
│   │   ├── shared/
│   │   │   ├── StarRating.tsx          # 星级评分
│   │   │   └── ToolCard.tsx            # 工具卡片
│   │   │
│   │   ├── home/
│   │   │   ├── HeroSection.tsx         # Hero区域
│   │   │   ├── BenchmarkTools.tsx      # 标杆工具
│   │   │   ├── CategoryGrid.tsx        # 分类网格
│   │   │   └── SectionPlaceholder.tsx  # 占位组件
│   │   │
│   │   └── tool-detail/
│   │       ├── ToolHero.tsx            # 工具头部
│   │       ├── ToolFeatures.tsx        # 核心功能
│   │       ├── ToolHowTo.tsx           # 使用步骤
│   │       ├── ToolPricing.tsx         # 费用说明
│   │       └── ToolReviews.tsx         # 用户评价
│   │
│   ├── store/
│   │   ├── useToolStore.ts             # 工具状态管理
│   │   └── useCategoryStore.ts         # 分类状态管理
│   │
│   ├── providers/
│   │   ├── ToolProvider.ts             # 接口定义
│   │   ├── MockToolProvider.ts         # Mock实现
│   │   └── mock-data/
│   │       ├── tools.json               # 工具数据
│   │       ├── categories.json          # 分类数据
│   │       └── reviews.json             # 评价数据
│   │
│   └── types/
│       └── index.ts                     # 类型定义
```

---

## 3. 类型定义

### 3.1 分类类型

```typescript
export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  toolCount: number;
  sortOrder: number;
}
```

### 3.2 工具类型

```typescript
export interface ToolPricing {
  baseFee: number;
  resourceFees?: {
    image?: number;
    audio?: number;
    video?: number;
  };
  example?: string;
}

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
```

### 3.3 评价类型

```typescript
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
```

### 3.4 查询参数类型

```typescript
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

---

## 4. Provider接口设计

### 4.1 ToolProvider接口

```typescript
import { Category, Tool, Review, GetToolsParams, PaginatedResult } from '../types';

export interface ToolProvider {
  /**
   * 获取所有分类
   */
  getCategories(): Promise<Category[]>;

  /**
   * 获取工具列表（支持筛选）
   */
  getTools(params?: GetToolsParams): Promise<PaginatedResult<Tool>>;

  /**
   * 获取工具详情
   */
  getToolById(id: string): Promise<Tool | null>;

  /**
   * 获取工具评价
   */
  getToolReviews(
    toolId: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<Review>>;
}
```

### 4.2 Mock实现策略

- 从 `docs/design/index.html` 中提取实际展示的数据
- 包含8个分类、3个标杆工具
- 每个工具包含静态的评价数据
- 模拟网络延迟（100-150ms）
- 支持搜索、分类筛选、featured筛选

---

## 5. 状态管理设计

### 5.1 useCategoryStore

```typescript
interface CategoryState {
  categories: Category[];
  selectedCategoryId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchCategories(): Promise<void>;
  setSelectedCategory(categoryId: string | null): void;
}
```

### 5.2 useToolStore

```typescript
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
  fetchTools(params?: { categoryId?: string; search?: string }): Promise<void>;
  fetchToolDetail(id: string): Promise<void>;
  fetchToolReviews(toolId: string, page?: number): Promise<void>;
  setSearchQuery(query: string): void;
  setCategoryFilter(categoryId: string | null): void;
  clearCurrentTool(): void;
}
```

---

## 6. 组件设计规范

### 6.1 通用设计原则

- **严格按照HTML原型**：类名、颜色、间距、动画完全一致
- **组件职责单一**：每个组件只做一件事
- **无状态优先**：优先使用函数组件，通过props传递数据
- **错误边界**：关键组件要有loading/empty/error状态

### 6.2 CSS样式规范（从HTML原样移植）

```css
/* 颜色定义 */
:root {
  --primary-dark: #1E3A5F;      /* 主色深蓝 */
  --primary-light: #2563EB;     /* 主色浅蓝 */
  --success-dark: #059669;      /* 成功色深绿 */
  --success-light: #10B981;     /* 成功色浅绿 */
  --border-color: #E4E7EB;      /* 边框色 */
  --bg-color: #F8FAFC;          /* 背景色 */
  --text-primary: #1E3A5F;      /* 主文字 */
  --text-secondary: #64748B;    /* 次要文字 */
  --text-muted: #94A3B8;        /* 辅助文字 */
}

/* 必须保留的核心类名 */
.card-hover        /* 卡片上浮效果 */
.btn-primary       /* 主按钮渐变 */
.btn-secondary     /* 次要按钮 */
.tool-card         /* 工具卡片容器 */
.category-card     /* 分类卡片 */
.gradient-text     /* 渐变文字 */
.new-badge         /* NEW标签 */
.hot-badge         /* HOT标签 */
.focus-ring        /* 聚焦环样式 */
.value-card        /* 价值卡片 */
.feature-card      /* 功能卡片 */
.step-card         /* 步骤卡片 */
.pricing-card      /* 定价卡片 */
.review-card       /* 评价卡片 */
```

### 6.3 动画规范

```css
/* 卡片悬停效果 */
.card-hover {
  transition: all 0.25s ease-out;
}
.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(30, 58, 95, 0.12);
}

/* 按钮悬停效果 */
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 25px rgba(5, 150, 105, 0.3);
}
```

---

## 7. 页面组件详细设计

### 7.1 首页 (page.tsx)

```tsx
// 组件组合
<HeroSection />
<BenchmarkTools />
<CategoryGrid />
<SectionPlaceholder title="新工具 & 热门推荐" description="最新上线和用户最爱的AI工具" />
<SectionPlaceholder title="用户共创" description="参与投票，决定下一个工具" />
<SectionPlaceholder title="用户评价" description="来自真实用户的使用体验" />
```

### 7.2 HeroSection组件

**功能**：
- 大标题 + 副标题
- 搜索框（防抖300ms）
- 5个价值卡片

**状态依赖**：
- useToolStore.setSearchQuery
- useToolStore.fetchTools

### 7.3 BenchmarkTools组件

**功能**：
- 展示3个featured工具
- 支持loading状态
- 工具卡片可点击进入详情页

**状态依赖**：
- useToolStore.tools
- useToolStore.loading
- useToolStore.fetchTools

### 7.4 CategoryGrid组件

**功能**：
- 8个分类卡片网格（2x4布局，移动端2xN）
- 点击分类筛选工具
- 选中状态高亮
- 支持loading状态

**状态依赖**：
- useCategoryStore.categories
- useToolStore.categoryFilter
- useToolStore.setCategoryFilter
- useToolStore.fetchTools

### 7.5 ToolDetailPage组件

**功能**：
- 面包屑导航
- 工具头部（图标、名称、评分、标签、描述、定价预览）
- 核心功能6宫格
- 使用步骤3步
- 费用说明表格
- 用户评价列表
- 底部CTA

**状态依赖**：
- useToolStore.currentTool
- useToolStore.currentToolReviews
- useToolStore.totalReviews
- useToolStore.detailLoading
- useToolStore.fetchToolDetail
- useToolStore.fetchToolReviews
- useToolStore.clearCurrentTool

---

## 8. Mock数据设计

### 8.1 分类数据 (8个)

| ID | 名称 | 图标 | 工具数 |
|----|------|------|--------|
| creative-writing | 创意写作 | ✍️ | 5 |
| image-generation | 图像生成 | 🎨 | 8 |
| ecommerce | 电商工具 | 🛒 | 4 |
| audio-processing | 音频处理 | 🎵 | 3 |
| office-efficiency | 办公效率 | 📊 | 6 |
| video-editing | 视频创作 | 🎬 | 3 |
| education | 教育学习 | 📚 | 4 |
| marketing | 营销推广 | 📈 | 5 |

### 8.2 工具数据 (3个标杆)

1. **AI有声绘本生成专家** (storybook-generator)
   - 分类: creative-writing
   - 定价: 基础费15积分，图片1积分/张，音频1积分/页
   - 评分: 4.9
   - 使用数: 12580

2. **AI电商商品详情页生成器** (ecommerce-detail)
   - 分类: ecommerce
   - 定价: 基础费12积分，图片1积分/张
   - 评分: 4.8
   - 使用数: 8932

3. **AI营销文案大师** (marketing-copywriter)
   - 分类: marketing
   - 定价: 基础费8积分
   - 评分: 4.7
   - 使用数: 15420

---

## 9. 实现计划与里程碑

### 阶段一：基础搭建 (0.5天)

| 任务 | 说明 |
|------|------|
| CSS移植 | globals.css完整样式，Tailwind颜色配置 |
| 类型定义 | types/index.ts完整类型 |
| Provider接口 | ToolProvider接口定义 |
| Mock数据 | 分类、工具、评价JSON数据 |
| MockProvider实现 | 完整的数据获取逻辑 |

### 阶段二：状态管理 (0.5天)

| 任务 | 说明 |
|------|------|
| Zustand stores | useToolStore + useCategoryStore |
| 单元测试 | store逻辑验证 |

### 阶段三：布局组件 (0.5天)

| 任务 | 说明 |
|------|------|
| Navbar | 导航栏组件 |
| Footer | 页脚组件 |
| Breadcrumb | 面包屑导航 |
| RootLayout | layout.tsx整合 |

### 阶段四：共享组件 (0.5天)

| 任务 | 说明 |
|------|------|
| StarRating | 星级评分组件 |
| ToolCard | 工具卡片组件 |

### 阶段五：首页组件 (1天)

| 任务 | 说明 |
|------|------|
| HeroSection | Hero区域 + 搜索 + 价值卡片 |
| BenchmarkTools | 标杆工具展示 |
| CategoryGrid | 分类网格 |
| SectionPlaceholder | 占位组件 |
| 首页整合 | page.tsx完整组合 |

### 阶段六：工具详情页 (1天)

| 任务 | 说明 |
|------|------|
| ToolHero | 工具头部信息 |
| ToolFeatures | 核心功能6宫格 |
| ToolHowTo | 使用步骤说明 |
| ToolPricing | 费用说明表格 |
| ToolReviews | 用户评价列表 |
| 详情页整合 | tools/[id]/page.tsx完整组合 |

### 阶段七：集成测试与优化 (0.5天)

| 任务 | 说明 |
|------|------|
| 完整流程测试 | 首页搜索、分类筛选、详情页跳转 |
| TypeScript类型检查 | tsc --noEmit无错误 |
| 构建验证 | next build成功 |
| 性能优化 | 防抖、懒加载等 |

**总工期**：约5天

---

## 10. 验收标准

### 10.1 视觉验收

- [ ] 浏览器中Next.js版本与HTML原型像素级一致
- [ ] 响应式布局在 375px / 768px / 1280px 下正常展示
- [ ] 所有动画、悬停效果与原型一致
- [ ] 渐变、阴影、圆角样式准确

### 10.2 功能验收

- [ ] 导航跳转正常（首页 → 工具中心 → 详情页）
- [ ] 搜索框输入实时筛选工具（防抖300ms）
- [ ] 点击分类标签筛选工具
- [ ] 工具卡片点击进入详情页
- [ ] 工具详情页数据正确展示
- [ ] breadcrumb导航正常

### 10.3 代码质量

- [ ] TypeScript编译无错误，无any类型
- [ ] ESLint无警告
- [ ] 无console.log残留
- [ ] 组件props完整类型定义
- [ ] Store类型完整

### 10.4 架构验收

- [ ] 分层清晰，无跨层依赖
- [ ] Provider接口完整，可无缝切换真实API
- [ ] 组件职责单一，无业务逻辑
- [ ] 状态管理逻辑集中在store

---

## 11. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| HTML原型与实际需求有差异 | 高 | 严格按照现有HTML实现，需求变更单独提PR |
| 数据结构与后续后端API不匹配 | 中 | Provider层做适配层，不影响上层 |
| Zustand状态管理复杂度超出预期 | 低 | 先按设计实现，必要时拆分store |
| CSS样式冲突 | 中 | 使用CSS Module或类名前缀隔离 |

---

## 附录：颜色规范速查表

| 用途 | 色值 | CSS变量 |
|------|------|---------|
| 主色（深蓝） | #1E3A5F | --primary-dark |
| 主色（浅蓝） | #2563EB | --primary-light |
| 成功色（深绿） | #059669 | --success-dark |
| 成功色（浅绿） | #10B981 | --success-light |
| 边框色 | #E4E7EB | --border-color |
| 背景色 | #F8FAFC | --bg-color |
| 主文字 | #1E3A5F | --text-primary |
| 次要文字 | #64748B | --text-secondary |
| 辅助文字 | #94A3B8 | --text-muted |
| NEW标签渐变 | #F59669 → #EF4444 | - |
| HOT标签渐变 | #EF4444 → #DC2626 | - |
| 背景blob渐变1 | #2563EB → #3B82F6 | - |
| 背景blob渐变2 | #10B981 → #34D399 | - |
