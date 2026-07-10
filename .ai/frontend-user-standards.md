# 用户端前端规范（apps/frontend-user）

本规范仅适用于 `apps/frontend-user`。处理用户端任务时，本文件应在 `.ai/coding-standards.md` 之后阅读，并与通用规范共同生效。

## 技术栈边界

- 用户端是 Next.js 14 + React 18 + TypeScript + Tailwind CSS 应用。
- 状态管理使用 Zustand。
- UI 图标使用 Lucide React。
- 不将后端或管理后台的实现约束套用到用户端。
- 修改前先查看目标页面、相邻组件和已有 hooks/store 的写法。

## 项目结构

```
apps/frontend-user/
├── src/
│   ├── app/           # Next.js App Router
│   ├── components/    # 通用组件
│   ├── stores/        # Zustand 状态管理
│   ├── hooks/         # 自定义 React Hooks
│   ├── services/      # API 服务层
│   ├── utils/         # 工具函数
│   └── types/         # TypeScript 类型定义
├── tests/             # 测试文件
├── next.config.js     # Next.js 配置
└── tailwind.config.ts # Tailwind 配置
```

## Next.js App Router 规范

- 使用 App Router (`src/app/`) 而非 Pages Router。
- 路由结构与文件系统结构保持一致。
- 服务端组件（Server Components）是默认，需要客户端交互时标记 `'use client'`。
- 页面组件命名为 `page.tsx`，布局组件命名为 `layout.tsx`。
- 加载状态使用 `loading.tsx`，错误边界使用 `error.tsx`。

## React 组件规范

- 使用函数组件 + Hooks。
- 组件名使用 `PascalCase`。
- Props 使用 TypeScript 接口定义，有默认值时显式给出。
- 保持组件职责单一，复杂逻辑拆分为自定义 Hooks。

## 服务端 vs 客户端组件

- **服务端组件**：数据获取、不依赖浏览器 API、不需要交互状态。
- **客户端组件**：需要 `useState`、`useEffect`、事件处理、依赖浏览器 API。
- 最小化客户端组件范围，尽可能使用服务端组件。

## 数据获取

- 服务端组件使用直接数据获取（直接调用函数）。
- 客户端组件使用 SWR 或 React Query（如项目已有配置）。
- 避免在客户端组件中直接 fetch 敏感数据，通过 API Route 代理。

## API Routes

- 服务端 API 定义在 `src/app/api/` 目录。
- 用于需要隐藏密钥或需要服务端处理的场景。
- 遵循 RESTful 设计原则。

## 状态管理

- 组件局部状态使用 `useState` 或 `useReducer`。
- 跨页面、跨组件或需要复用的复杂状态使用 Zustand（`stores/`）。
- 避免把一次性页面状态提升为全局状态。

## API 调用

- API 调用统一封装在 `services/` 目录，使用 axios。
- 不在组件中直接裸用 `fetch` 或新建不一致的 axios 实例。
- 接口字段变化时，同步检查后端 Schema。

## 样式规范

- 使用 Tailwind CSS，优先使用 utility class。
- 通用样式抽离到 `@lcaitool/ui` 包中复用。
- 避免自定义颜色、字号或间距常量，使用 Tailwind 主题值。

## 组件通信

- 父子组件通信优先使用 Props + callbacks。
- 跨层级或跨页面共享状态再使用 Zustand。
- 不通过隐式全局变量传递业务状态。

## 自定义 Hooks

- 可复用的逻辑抽离为自定义 Hooks，放在 `hooks/` 目录。
- Hook 命名使用 `use` 前缀，如 `useLcaCalculation`。
- Hook 返回值和参数应有明确的类型定义。

## 用户端验证命令

```bash
cd apps/frontend-user

# 开发服务
pnpm dev

# 构建
pnpm build

# 启动生产服务
pnpm start

# 代码检查
pnpm lint
```
