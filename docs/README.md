# 文档中心

欢迎来到 灵创AI工具箱 (LCAITool) 文档中心。本目录包含所有项目相关的文档资源。

---

## 📂 文档结构

```
docs/
├── README.md                    # 本文档 - 文档索引
├── requirements/                # 需求文档
│   └── 灵创AI工具箱产品需求文档PRD.md  # 产品需求规格说明书
├── architecture/                # 架构设计
│   └── 灵创AI工具箱-技术方案文档-v1.1.md  # 技术架构设计
├── design/                      # 🎨 设计资源
│   ├── images/                  # 设计图片资源
│   ├── index.html              # 首页原型
│   ├── login.html              # 登录页原型
│   ├── register.html           # 注册页原型
│   ├── tools.html              # 工具列表页原型
│   ├── tool-detail.html        # 工具详情页原型
│   ├── pricing.html            # 定价页原型
│   ├── user-center.html        # 用户中心原型
│   ├── user-center-v2.html     # 用户中心V2原型
│   ├── works.html              # 作品管理页原型
│   ├── works-detail.html       # 作品详情页原型
│   ├── orders.html             # 订单管理页原型
│   ├── vote.html               # 投票页原型
│   ├── feedback.html           # 反馈页原型
│   └── verification.html       # 验证页原型
└── superpowers/                 # AI 超能力开发流程
    ├── plans/                  # 实施计划文档
    └── specs/                  # 设计规格文档
```

---

## 📋 文档索引

### 产品文档

| 文档                                                              | 版本 | 说明                     |
| ----------------------------------------------------------------- | ---- | ------------------------ |
| [灵创AI工具箱产品需求文档PRD](./requirements/灵创AI工具箱产品需求文档PRD.md) | v1.0 | 完整的产品需求规格说明书 |

### 技术文档

| 文档                                                              | 版本 | 说明                                     |
| ----------------------------------------------------------------- | ---- | ---------------------------------------- |
| [灵创AI工具箱-技术方案文档-v1.1](./architecture/灵创AI工具箱-技术方案文档-v1.1.md) | v1.1 | 系统架构、技术选型、数据库设计、API 设计 |

### AI 开发指南

| 文档                                              | 版本 | 说明                                     |
| ------------------------------------------------- | ---- | ---------------------------------------- |
| [AI 开发工作流](../.ai/workflow.md)               | v1.0 | AI 协作流程、任务状态与 Superpowers 入口 |
| [通用编码规范](../.ai/coding-standards.md)        | v1.0 | TypeScript、Git、验证与通用编码原则      |
| [后端规范](../.ai/backend-standards.md)           | v1.0 | apps/backend FastAPI 服务端规范          |
| [管理后台规范](../.ai/admin-standards.md)         | v1.0 | apps/frontend-admin React 管理端规范     |
| [用户端规范](../.ai/frontend-user-standards.md)   | v1.0 | apps/frontend-user Next.js 用户端规范    |
| [AI 工具规则](../.ai/tool-rules.md)               | v1.0 | Hermes、Claude Code 与子代理工具规则     |
| [代码审查清单](../.ai/review-checklist.md)        | v1.0 | 代码审查检查项清单                       |
| [CLAUDE.md](../CLAUDE.md)                         | v1.0 | Claude Code 开发规范                     |

### 设计资源

设计资源统一托管在 `docs/design/` 目录下，包含 10+ 个可直接在浏览器预览的 HTML 静态原型：

| 资源                                                            | 说明                                   |
| --------------------------------------------------------------- | -------------------------------------- |
| [首页原型](./design/index.html)                                 | 首页设计原型，可直接浏览器预览         |
| [登录页原型](./design/login.html)                               | 用户登录页面原型                       |
| [注册页原型](./design/register.html)                            | 用户注册页面原型                       |
| [工具列表页原型](./design/tools.html)                           | AI 工具列表展示页面                    |
| [工具详情页原型](./design/tool-detail.html)                     | 单个工具详情与使用页面                |
| [定价页原型](./design/pricing.html)                             | 套餐定价与支付页面                    |
| [用户中心原型](./design/user-center.html)                       | 用户中心设计（V1 版本）                |
| [用户中心V2原型](./design/user-center-v2.html)                  | 用户中心设计（V2 版本）                |
| [作品管理页原型](./design/works.html)                           | 用户作品管理列表                       |
| [作品详情页原型](./design/works-detail.html)                    | 单个作品详情展示                       |
| [订单管理页原型](./design/orders.html)                           | 用户订单管理页面                       |

### Superpowers 流程文档

Superpowers 是本项目的 AI 驱动超能力开发流程，相关文档托管在 `docs/superpowers/` 目录下：

| 目录                                                            | 说明                                   |
| --------------------------------------------------------------- | -------------------------------------- |
| [plans/](./superpowers/plans/)                                  | 功能实施计划文档                       |
| [specs/](./superpowers/specs/)                                  | 功能设计规格文档                       |

---

## 🔗 相关文档

- [项目根目录 README](../README.md) - 快速开始指南
- [CLAUDE.md](../CLAUDE.md) - Claude Code 开发规范
- [AI 开发工作流](../.ai/workflow.md) - AI 协作流程与任务状态

---

## 📝 文档更新规范

1. **版本号规则**：遵循语义化版本 `主版本.次版本.修订号`
2. **PRD 变更**：需求变更需同步更新需求文档并标注版本
3. **架构变更**：技术架构变更需同步更新技术设计文档
4. **Superpowers 文档**：进入超能力流程的功能，需在 `docs/superpowers/` 对应目录下留存计划和规格文档

---

_最后更新: 2026-07-11 v1.0 初始化文档中心_
