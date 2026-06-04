# 技术栈与目录结构

## 前端技术栈

| 层级       | 技术选型                 | 版本要求   |
| ---------- | ------------------------ | ---------- |
| 用户端前端 | Next.js App Router       | 14.x       |
| 管理端前端 | React + Vite             | 18.x / 5.x |
| UI 框架    | Tailwind CSS + shadcn/ui | 3.x        |
| 状态管理   | Zustand                  | 4.x        |

## 后端技术栈

| 层级      | 技术选型             | 版本要求 |
| --------- | -------------------- | -------- |
| 后端框架  | FastAPI              | 0.100+   |
| 数据库    | PostgreSQL           | 16.x     |
| 缓存/队列 | Redis                | 7.x      |
| ORM       | SQLAlchemy + Alembic | 2.x      |
| 异步任务  | Celery               | 5.x      |

## 部署

- Docker + Docker Compose 容器化部署。
- Nginx 反向代理。

## 目录结构

```text
LCAiTool/
├── apps/
│   ├── frontend-user/          # 用户端前端 (Next.js)
│   │   ├── src/app/            # App Router 页面
│   │   ├── src/components/     # ui/common/layout/home/tool-detail 等组件
│   │   ├── src/lib/            # API 客户端、工具函数
│   │   ├── src/store/          # Zustand 状态管理
│   │   ├── src/providers/      # Provider 层：接口定义、Mock、真实 API
│   │   └── src/styles/         # 全局样式
│   │
│   ├── frontend-admin/         # 管理端前端 (React + Vite)
│   │   ├── src/pages/          # 页面路由
│   │   ├── src/components/     # 通用组件
│   │   ├── src/api/            # API 客户端
│   │   └── src/store/          # 状态管理
│   │
│   └── backend/                # FastAPI 后端
│       ├── app/api/v1/         # API 路由层
│       ├── app/core/           # 核心配置
│       ├── app/models/         # 数据模型层
│       ├── app/schemas/        # Pydantic 模式
│       ├── app/services/       # 业务服务层
│       ├── app/providers/      # 第三方提供商
│       ├── app/executors/      # 工具执行器
│       ├── app/workers/        # Celery 异步任务
│       ├── alembic/            # 数据库迁移
│       ├── storage/            # 本地文件存储
│       └── tests/              # 测试目录
│
├── docs/                       # 文档目录
├── packages/                   # 共享包
├── docker-compose.yml          # Docker 编排
└── nginx/                      # Nginx 配置
```
