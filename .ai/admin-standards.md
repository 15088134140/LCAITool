# 管理后台前端规范（apps/frontend-admin）

本规范仅适用于 `apps/frontend-admin`。处理管理后台任务时，本文件应在 `.ai/coding-standards.md` 之后阅读，并与通用规范共同生效。

## 技术栈边界

- 管理后台是 React 18 + Vite + TypeScript + Tailwind CSS 应用。
- 状态管理使用 Zustand。
- 路由使用 React Router。
- UI 图标使用 Lucide React。
- 图表使用 ECharts。
- 不将后端或用户端的实现约束套用到管理后台。
- 修改前先查看目标页面、相邻组件和已有 hooks/store 的写法。

## 项目结构

```
apps/frontend-admin/
├── src/
│   ├── components/    # 通用组件
│   ├── pages/         # 页面组件
│   ├── stores/        # Zustand 状态管理
│   ├── hooks/         # 自定义 React Hooks
│   ├── services/      # API 服务层
│   ├── utils/         # 工具函数
│   ├── types/         # TypeScript 类型定义
│   ├── App.tsx        # 根组件
│   └── main.tsx       # 入口文件
├── tests/             # 测试文件
├── vite.config.ts     # Vite 配置
└── tailwind.config.ts # Tailwind 配置
```

## React 组件规范

- 使用函数组件 + Hooks，不使用 Class 组件。
- 组件名使用 `PascalCase`。
- Props 使用 TypeScript 接口定义，有默认值时显式给出。
- 保持组件职责单一，复杂逻辑拆分为自定义 Hooks。

## 状态管理

- 组件局部状态使用 `useState` 或 `useReducer`。
- 跨页面、跨组件或需要复用的复杂状态使用 Zustand（`stores/`）。
- 避免把一次性页面状态提升为全局状态。

## API 调用

- API 调用统一封装在 `services/` 目录，使用 axios。
- 不在组件中直接裸用 `fetch` 或新建不一致的 axios 实例。
- 接口字段变化时，同步检查后端 Schema。

## 路由

- 使用 React Router 配置路由。
- 路由定义集中管理，不要散落在各个组件。
- 受保护路由使用统一的认证守卫逻辑。

## 样式规范

- 使用 Tailwind CSS，优先使用 utility class。
- 通用样式抽离到 `@lcaitool/ui` 包中复用。
- 避免自定义颜色、字号或间距常量，使用 Tailwind 主题值。
- 深层样式封装优先使用 CSS Modules 或 Tailwind。

## 组件通信

- 父子组件通信优先使用 Props + callbacks。
- 跨层级或跨页面共享状态再使用 Zustand。
- 不通过隐式全局变量传递业务状态。

## 自定义 Hooks

- 可复用的逻辑抽离为自定义 Hooks，放在 `hooks/` 目录。
- Hook 命名使用 `use` 前缀，如 `useAiProviders`。
- Hook 返回值和参数应有明确的类型定义。

## 管理后台验证命令

```bash
cd apps/frontend-admin

# 开发服务
pnpm dev

# 构建
pnpm build

# 代码检查
pnpm lint

# 预览构建结果
pnpm preview
```
