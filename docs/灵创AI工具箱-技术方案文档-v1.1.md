# 灵创AI工具箱 - 技术方案文档

| 文档版本 | V2.1 |
|----------|------|
| 创建日期 | 2026-05-18 |
| 最近更新 | 2026-05-29 |
| 项目名称 | 灵创AI工具箱（LCAITool） |
| 架构类型 | 单体架构 + 模块化设计 |

---

## 目录

1. [技术选型总览](#1-技术选型总览)
2. [系统整体架构](#2-系统整体架构)
3. [目录结构设计](#3-目录结构设计)
4. [核心数据模型设计](#4-核心数据模型设计)
5. [AI 任务执行引擎设计](#5-ai-任务执行引擎设计)
6. [安全与权限设计](#6-安全与权限设计)
7. [部署与运维架构](#7-部署与运维架构)
8. [扩展路线图](#8-扩展路线图)
9. [风险与应对](#9-风险与应对)
10. [核心业务流程设计](#10-核心业务流程设计)
11. [标杆工具执行引擎详细设计](#11-标杆工具执行引擎详细设计)
12. [🔴 P0级缺失数据表设计](#12-p0级缺失数据表设计)
13. [🟡 P1级优化项设计](#13-p1级优化项设计)
14. [🔧 架构设计优化补充](#14-架构设计优化补充)
15. [📊 数据库索引完整设计](#15-数据库索引完整设计)
16. [🆕 新增 API 端点设计（P0 已实现）](#16-新增-api-端点设计p0-已实现)
17. [🆕 SSE 事件模型（已实现）](#17-sse-事件模型已实现)
18. [🆕 本地文件存储设计（已实现）](#18-本地文件存储设计已实现)
19. [🆕 执行器架构扩展（已实现）](#19-执行器架构扩展已实现)

---

## 1. 技术选型总览

### 1.1 核心技术栈

| 层级 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| **用户端前端** | Next.js 14+ (App Router) | 14.x | SSR/SSG + CSR 混合渲染，SEO友好 |
| **管理端前端** | React + Vite | 18.x / 5.x | 纯 SPA，后台管理系统 |
| **UI框架** | Tailwind CSS + shadcn/ui | 3.x | 原子化CSS，高度可定制 |
| **后端框架** | FastAPI | 0.100+ | 高性能异步Python Web框架 |
| **数据库** | PostgreSQL | 16.x | 关系型数据库，支持JSONB |
| **缓存/队列** | Redis | 7.x | 缓存 + Celery 任务队列 |
| **ORM** | SQLAlchemy + Alembic | 2.x | 数据模型 + 数据库迁移 |
| **状态管理** | Zustand | 4.x | 轻量级React状态管理 |
| **部署** | Docker Compose | — | 容器化一键部署 |

### 1.2 技术选型决策依据

1. **Next.js 用户端**：满足SEO优化需求，首屏加载性能优秀，React生态完整
2. **分离前端架构**：用户端侧重SEO和体验，管理端侧重效率和交互，职责分离
3. **FastAPI 后端**：Python AI生态丰富，异步性能优秀，自动生成API文档
4. **PostgreSQL**：支持JSONB字段，适合存储灵活的AI任务参数和元数据
5. **shadcn/ui**：与设计系统完美契合，定制自由度高，社区活跃

---

## 2. 系统整体架构

### 2.1 系统分层架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                           Nginx 反向代理                            │
│  /          ──►  Next.js 用户端                                     │
│  /admin/*   ──►  React 管理端                                       │
│  /api/*     ──►  FastAPI 后端服务                                   │
└──────────────────────┬──────────────────┬──────────────────────────┘
                       │                  │
        ┌──────────────▼─────────┐ ┌──────▼──────────────┐
        │    Next.js 用户端       │ │   React 管理端       │
        │  (SSR/SSG + CSR)       │ │    (纯SPA)           │
        └──────────────┬─────────┘ └──────┬──────────────┘
                       │                  │
                       └────────┬─────────┘
                                │
                     ┌──────────▼──────────┐
                     │    FastAPI 后端      │
                     │   (统一API服务)       │
                     └──────────┬──────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                     │
        ┌─────▼──────┐                       ┌──────▼──────┐
        │ PostgreSQL │                       │    Redis     │
        │  (主数据库)  │                       │  (缓存+队列)   │
        └────────────┘                       └──────────────┘
```

### 2.2 后端分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        FastAPI 后端                                │
├─────────────────────────────────────────────────────────────────┤
│  路由层 (Routers)  →  API入口点，参数校验                          │
├─────────────────────────────────────────────────────────────────┤
│  服务层 (Services) →  业务逻辑核心                                │
│  • 用户服务 • 工具服务 • 任务服务 • 支付服务 • 成果服务           │
├─────────────────────────────────────────────────────────────────┤
│  抽象层 (Providers) →  第三方集成                                │
│  • AI提供商 • 存储提供商 • 支付提供商                              │
├─────────────────────────────────────────────────────────────────┤
│  数据层 (Models)  →  数据库操作                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 目录结构设计

### 3.1 项目根目录

```
LCAiTool/
├── apps/
│   ├── frontend-user/          # 用户端前端 (Next.js)
│   ├── frontend-admin/         # 管理端前端 (React + Vite)
│   └── backend/                # FastAPI 后端
├── packages/                   # 共享包
├── docs/                       # 文档目录
│   ├── design/                 # 设计稿 (HTML原型)
│   └── superpowers/            # 设计文档与实施计划
├── nginx/                      # Nginx配置
├── docker-compose.yml          # Docker编排
└── README.md
```

### 3.2 后端目录结构

```
apps/backend/
├── app/
│   ├── api/                    # API路由层
│   │   ├── v1/
│   │   │   ├── endpoints/      # 按模块拆分
│   │   │   │   ├── users.py    # 用户相关接口 (含 /users/stats)
│   │   │   │   ├── tools.py    # 工具市场接口 (含 /tools/recent)
│   │   │   │   ├── tasks.py    # 任务执行接口 (含 /tasks/{id}/progress/retry)
│   │   │   │   ├── payment.py  # 支付相关接口 (含 custom-recharge, 订单列表)
│   │   │   │   ├── works.py    # 成果管理接口
│   │   │   │   ├── files.py    # 文件服务接口
│   │   │   │   ├── chat.py     # 对话模式接口（预留）
│   │   │   │   └── admin.py    # 管理后台接口
│   │   │   └── webhooks/
│   │   │       └── dify.py     # Dify Webhook回调
│   │   └── deps.py             # 依赖注入
│   │
│   ├── core/                   # 核心配置
│   │   ├── config.py           # 配置管理
│   │   ├── security.py         # 安全相关
│   │   └── exceptions.py       # 异常定义
│   │
│   ├── models/                 # 数据模型层
│   │   ├── base.py             # 基础模型
│   │   ├── user.py             # 用户模型
│   │   ├── tool.py             # 工具模型 (含 usage_modes)
│   │   ├── task.py             # 任务模型
│   │   ├── payment.py          # 支付模型
│   │   └── work.py             # 成果模型
│   │
│   ├── schemas/                # Pydantic 模式
│   │   ├── user.py
│   │   ├── tool.py
│   │   ├── task.py
│   │   ├── payment.py
│   │   ├── stats.py            # 用户统计 (新增)
│   │   └── work.py
│   │
│   ├── services/               # 业务服务层
│   │   ├── user_service.py     # 用户服务
│   │   ├── tool_service.py     # 工具服务
│   │   ├── task_service.py     # 任务服务 (含进度更新与结算)
│   │   ├── payment_service.py  # 支付服务
│   │   ├── work_service.py     # 成果服务
│   │   └── auth_service.py     # 认证服务
│   │
│   ├── providers/              # 第三方提供商
│   │   ├── ai/                 # AI提供商
│   │   │   ├── base.py         # 抽象基类
│   │   │   ├── volcengine.py   # 火山方舟(豆包)实现
│   │   │   └── dify.py         # Dify平台适配
│   │   ├── storage/            # 存储提供商
│   │   │   ├── base.py         # 抽象基类
│   │   │   ├── local.py        # 本地存储
│   │   │   └── oss.py          # OSS存储
│   │   └── payment/            # 支付提供商
│   │       ├── base.py         # 抽象基类
│   │       └── wechat.py       # 微信支付
│   │
│   ├── executors/              # 工具执行器
│   │   ├── base.py             # 执行器基类 (含Mock执行模式 + ProgressEvent)
│   │   ├── storybook.py        # 有声绘本执行器 (本地逐步执行)
│   │   ├── ecommerce.py        # 电商详情页执行器 (Dify SSE流式消费)
│   │   └── marketing.py        # 营销文案执行器 (Celery转发+HTTP回调)
│   │
│   ├── workers/                # 异步任务
│   │   ├── celery_app.py       # Celery配置 (3级队列: fast/medium/heavy)
│   │   └── task_worker.py      # 任务执行器
│   │
│   └── main.py                 # 应用入口
│
├── alembic/                    # 数据库迁移
├── storage/                    # 本地文件存储 (works/{task_id}/)
├── tests/                      # 测试目录 (unit/e2e/api)
├── Dockerfile
└── requirements.txt
```

### 3.3 用户端前端目录结构

```
apps/frontend-user/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页 (SSG)
│   │   ├── tools/              # 工具市场
│   │   │   ├── page.tsx        # 列表页 (SSG)
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx    # 通用详情页 (SSR, UUID降级)
│   │   │   ├── storybook-generator/    # 定制页：有声绘本
│   │   │   ├── ecommerce-detail/       # 定制页：电商详情
│   │   │   └── marketing-copywriter/   # 定制页：营销文案
│   │   ├── pricing/            # 充值中心 (CSR，一站式充值)
│   │   ├── works/              # 成果管理 (CSR)
│   │   ├── orders/             # 订单管理 (CSR)
│   │   ├── user-center/        # 个人中心 (CSR，分组导航)
│   │   │   ├── page.tsx        # 个人中心主页
│   │   │   ├── favorites/      # 我的收藏
│   │   │   ├── points/         # 积分明细
│   │   │   ├── verification/   # 实名认证
│   │   │   ├── profile/        # 个人信息
│   │   │   └── security/       # 账号安全
│   │   └── (auth)/             # 登录/注册
│   ├── components/             # 组件
│   │   ├── ui/                 # shadcn/ui 组件
│   │   ├── common/             # 公共业务组件
│   │   ├── layout/             # 布局组件 (Navbar/Footer)
│   │   ├── home/               # 首页组件
│   │   ├── tool-detail/        # 工具详情公共组件
│   │   └── payment/            # 支付相关组件
│   ├── lib/                    # API客户端、工具函数
│   │   ├── api/                # API 层
│   │   │   ├── client.ts       # HTTP 客户端
│   │   │   ├── modules/        # 按模块拆分
│   │   │   │   ├── user.ts / tool.ts / task.ts / payment.ts / work.ts
│   │   │   └── types.ts        # 类型定义
│   │   └── utils/              # 工具函数
│   ├── store/                  # Zustand 状态管理
│   │   ├── useAuthStore.ts
│   │   ├── useToolStore.ts
│   │   ├── useUserStore.ts
│   │   └── ...
│   ├── providers/              # Provider 层
│   │   └── ApiToolProvider.ts
│   └── styles/                 # 全局样式
├── public/
├── package.json
└── next.config.js
```

### 3.4 管理端前端目录结构

```
apps/frontend-admin/
├── src/
│   ├── pages/                  # 页面路由
│   │   ├── dashboard/          # 仪表盘
│   │   ├── tools/              # 工具管理 (含 usage_modes 配置)
│   │   ├── users/              # 用户管理
│   │   ├── orders/             # 订单管理
│   │   ├── tasks/              # 任务监控
│   │   └── settings/           # 系统设置
│   ├── components/             # 通用组件
│   ├── api/                    # API客户端
│   ├── store/                  # 状态管理
│   ├── router/                 # 路由配置
│   └── main.tsx
├── public/
├── package.json
└── vite.config.ts
```

---

## 4. 核心数据模型设计

### 4.1 ER 图概览

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│   User   │       │   Tool   │       │   Work   │
│  (用户)   │       │  (工具)   │       │  (成果)   │
└────┬─────┘       └────┬─────┘       └────┬─────┘
     │                   │                   │
     │ 1:N               │ 1:N               │ 1:1
     ▼                   ▼                   ▼
┌──────────┐       ┌──────────┐       ┌──────────┐
│  Order   │       │   Task   │       │ WorkFile │
│  (订单)   │       │  (任务)   │       │ (成果文件) │
└──────────┘       └────┬─────┘       └──────────┘
                         │
                         │ 1:N
                         ▼
                    ┌──────────┐
                    │ TaskLog  │
                    │ (任务日志) │
                    └──────────┘
```

### 4.2 现有数据表设计

#### 用户表 (users)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| username | VARCHAR(50) | 用户名 |
| email | VARCHAR(100) | 邮箱 |
| phone | VARCHAR(20) | 手机号 |
| password_hash | VARCHAR(255) | 密码哈希 |
| avatar_url | VARCHAR(255) | 头像 |
| nickname | VARCHAR(50) | 昵称 |
| real_name | VARCHAR(50) | 真实姓名 |
| id_card_number | VARCHAR(20) | 身份证号(加密) |
| id_card_verified | BOOLEAN | 是否已实名认证 |
| points | INTEGER | 积分余额 |
| is_active | BOOLEAN | 是否激活 |
| is_admin | BOOLEAN | 是否管理员 |
| wechat_openid | VARCHAR(100) | 微信OpenID |
| inviter_id | UUID | 邀请人ID |
| invite_code | VARCHAR(32) | 我的邀请码（唯一） |
| language_preference | VARCHAR(10) | 语言偏好：zh-CN/en-US/ja-JP |
| total_checkin_days | INTEGER | 累计签到天数 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### 工具表 (tools)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| slug | VARCHAR(100) | URL友好标识 |
| name | VARCHAR(100) | 工具名称 |
| description | TEXT | 详细描述 |
| short_desc | VARCHAR(200) | 一句话描述 |
| cover_image | VARCHAR(255) | 封面图 |
| category | VARCHAR(50) | 分类 |
| tags | VARCHAR(255)[] | 标签数组 |
| base_fee | INTEGER | 基础调用费(积分) |
| image_fee | INTEGER | 图片单价 |
| audio_fee | INTEGER | 语音单价 |
| video_fee | INTEGER | 视频单价(每分钟) |
| token_fee | INTEGER | Token单价(每千token) |
| config | JSONB | 工具配置 |
| status | VARCHAR(20) | 状态: draft/active/developing/planning |
| use_count | INTEGER | 使用次数 |
| favorite_count | INTEGER | 收藏次数 |
| rating_count | INTEGER | 评价次数 |
| rating_avg | DECIMAL(3,2) | 平均评分 |
| i18n_name | JSONB | 多语言名称 {"zh-CN": "", "en-US": ""} |
| i18n_description | JSONB | 多语言描述 |
| usage_modes | VARCHAR[] | 使用模式: ['form'] / ['dialog'] / ['form','dialog'] |
| created_at | TIMESTAMP | 创建时间 |

#### 任务表 (tasks)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| tool_id | UUID | 工具ID |
| parent_task_id | UUID | 父任务ID（迭代创作追溯） |
| iteration_version | INTEGER | 迭代版本号 |
| input_params | JSONB | 用户输入参数 |
| prompt_text | TEXT | 最终提示词 |
| context | JSONB | 迭代创作上下文 |
| estimated_cost | INTEGER | 预估费用 |
| frozen_points | INTEGER | 预冻结积分 |
| actual_cost | INTEGER | 实际消耗积分 |
| settlement_status | VARCHAR(20) | 结算状态：unsettled/settled/refunded/partial_refund |
| settlement_at | TIMESTAMP | 结算时间 |
| refund_reason | VARCHAR(200) | 退费原因 |
| refunded_by | UUID | 退费操作人（系统自动/管理员） |
| status | VARCHAR(20) | 状态: pending/running/completed/failed/timeout |
| progress | INTEGER | 进度百分比 |
| status_message | VARCHAR(500) | 当前状态描述 |
| started_at | TIMESTAMP | 开始时间 |
| completed_at | TIMESTAMP | 完成时间 |
| ai_provider | VARCHAR(50) | AI服务商 |
| tokens_used | INTEGER | Token消耗量 |
| created_at | TIMESTAMP | 创建时间 |

#### 成果表 (works)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| tool_id | UUID | 工具ID |
| task_id | UUID | 关联任务ID |
| title | VARCHAR(200) | 成果标题 |
| description | TEXT | 成果描述 |
| cover_image | VARCHAR(255) | 封面图 |
| metadata | JSONB | 工具扩展数据 |
| version | INTEGER | 版本号 |
| parent_id | UUID | 父版本ID(迭代创作) |
| is_public | BOOLEAN | 是否公开分享 |
| created_at | TIMESTAMP | 创建时间 |

#### 成果文件表 (work_files)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| work_id | UUID | 成果ID |
| file_type | VARCHAR(20) | 文件类型: image/audio/video/text |
| file_name | VARCHAR(255) | 文件名 |
| file_url | VARCHAR(500) | 文件URL |
| file_size | BIGINT | 文件大小 |
| page_number | INTEGER | 页码(分页内容) |
| description | TEXT | 文件描述 |
| metadata | JSONB | 文件扩展信息 |
| created_at | TIMESTAMP | 创建时间 |

#### 积分交易表 (point_transactions)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| task_id | UUID | 关联任务ID |
| related_order_id | VARCHAR(100) | 支付平台订单号 |
| amount | INTEGER | 变动积分(正加负扣) |
| balance_after | INTEGER | 变动后余额 |
| type | VARCHAR(30) | 类型: recharge/task_fee/refund/bounty |
| description | VARCHAR(200) | 描述 |
| payment_provider | VARCHAR(30) | 支付渠道：wechat/alipay |
| reconciliation_status | VARCHAR(20) | 对账状态：unmatched/matched/mismatch |
| reconciled_at | TIMESTAMP | 对账时间 |
| created_at | TIMESTAMP | 创建时间 |

#### 实名认证记录表 (real_name_verifications)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| real_name | VARCHAR(50) | 真实姓名（加密存储） |
| id_card_hash | VARCHAR(255) | 身份证号SHA-256哈希（用于去重） |
| id_card_encrypted | VARCHAR(255) | 身份证号AES-256加密值 |
| id_card_masked | VARCHAR(20) | 脱敏展示值：前4后4 |
| verification_source | VARCHAR(30) | 核验渠道：manual/api_third_party |
| status | VARCHAR(20) | 状态：pending/passed/failed |
| operator_ip | VARCHAR(50) | 提交者IP |
| device_fingerprint | VARCHAR(255) | 设备指纹（反作弊） |
| failure_reason | VARCHAR(200) | 失败原因 |
| reviewer_id | UUID | 审核人ID（人工审核时） |
| reviewed_at | TIMESTAMP | 审核时间 |
| created_at | TIMESTAMP | 提交时间 |

**身份证双存储安全机制**：
```
存储策略：
1. AES-256加密值 → 用于需要完整展示（仅管理员可见，需审计日志）
2. SHA-256哈希值 → 用于去重校验，防止同一身份证多次认证

计算公式：
  id_card_encrypted = AES-256(原始身份证, ENCRYPTION_KEY)
  id_card_hash = SHA-256(原始身份证 + GLOBAL_SALT)
  id_card_masked = 前4位 + '********' + 后4位

验证逻辑（防止刷分）：
  IF EXISTS(SELECT 1 FROM real_name_verifications WHERE id_card_hash = ?)
    THEN 拒绝认证，返回"该身份证已被使用"
```

#### 内容审核日志表 (content_audit_logs)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| task_id | UUID | 关联任务ID |
| work_file_id | UUID | 关联成果文件ID |
| audit_type | VARCHAR(30) | 审核类型：input_keyword/image_api/text_moderation |
| content_category | VARCHAR(30) | 违规分类：porn/terrorism/politics/ad/other |
| confidence_score | DECIMAL(5,2) | 置信度 0-100 |
| action_taken | VARCHAR(20) | 处理动作：blocked/manual_review/passed |
| audit_provider | VARCHAR(30) | 审核服务商：aliyun/tencent/baidu |
| raw_response | JSONB | 服务商原始响应 |
| reviewer_id | UUID | 人工审核人ID |
| review_comment | VARCHAR(500) | 审核备注 |
| client_ip | VARCHAR(50) | 用户IP |
| created_at | TIMESTAMP | 创建时间 |

**置信度阈值策略**：
```
置信度 > 90 → 自动拦截 (blocked)
置信度 50-90 → 人工复核 (manual_review)
置信度 < 50 → 通过 (passed)
```

#### 用户定时任务表 (scheduled_tasks)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| tool_id | UUID | 工具ID |
| name | VARCHAR(100) | 任务名称 |
| cron_expression | VARCHAR(100) | Cron表达式 |
| timezone | VARCHAR(50) | 时区，默认 Asia/Shanghai |
| params_json | JSONB | 工具参数配置 |
| last_run_at | TIMESTAMP | 上次执行时间 |
| next_run_at | TIMESTAMP | 下次计划执行时间 |
| last_status | VARCHAR(20) | 上次执行状态 |
| run_count | INTEGER | 累计执行次数 |
| success_count | INTEGER | 成功次数 |
| is_active | BOOLEAN | 是否启用 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### 用户邀请表 (user_invites)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| inviter_id | UUID | 邀请人ID |
| invitee_id | UUID | 被邀请人ID（注册后回填） |
| invite_code | VARCHAR(32) | 邀请码（唯一） |
| invitee_phone_hash | VARCHAR(255) | 被邀请人手机号哈希 |
| register_ip | VARCHAR(50) | 注册IP |
| device_fingerprint | VARCHAR(255) | 设备指纹 |
| status | VARCHAR(20) | 状态：pending/registered/verified/fraud |
| register_bonus_awarded | BOOLEAN | 注册奖励是否已发放 |
| first_recharge_bonus_awarded | BOOLEAN | 首充奖励是否已发放 |
| created_at | TIMESTAMP | 邀请创建时间 |
| registered_at | TIMESTAMP | 被邀请人注册时间 |
| verified_at | TIMESTAMP | 被邀请人实名认证时间 |

**邀请奖励规则**：
```
奖励触发条件：
1. 被邀请人完成注册 → 邀请人 +10分，被邀请人 +10分
2. 被邀请人完成实名认证 → 双方各 +10分
3. 被邀请人完成首次充值（≥30元）→ 邀请人再 +20分

反作弊机制：
- IP去重：同一IP 24小时内最多关联3个邀请关系
- 设备指纹去重：同一设备只能关联1个邀请关系
- 邀请链深度：无多级分销，仅直接邀请有效
```

#### 用户签到表 (user_checkins)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| checkin_date | DATE | 签到日期（YYYY-MM-DD） |
| consecutive_days | INTEGER | 连续签到天数 |
| points_awarded | INTEGER | 本次获得积分 |
| bonus_awarded | BOOLEAN | 连续签到额外奖励是否已发放 |
| created_at | TIMESTAMP | 创建时间 |

#### 创意提交表 (idea_submissions)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 提交用户ID |
| name | VARCHAR(100) | 工具名称 |
| description | TEXT | 功能描述 |
| use_cases | TEXT | 适用场景 |
| reference_urls | VARCHAR(500) | 参考链接（逗号分隔） |
| status | VARCHAR(30) | 状态：pending/reviewing/accepted/developing/rejected/voting |
| vote_target | INTEGER | 目标投票数（默认500） |
| current_votes | INTEGER | 当前投票数 |
| vote_end_date | TIMESTAMP | 投票截止日 |
| priority_score | INTEGER | 优先级评分（运营内部使用） |
| admin_comment | VARCHAR(500) | 运营回复 |
| bonus_points | INTEGER | 采纳奖励积分 |
| bonus_awarded | BOOLEAN | 奖励是否已发放 |
| created_at | TIMESTAMP | 提交时间 |
| reviewed_at | TIMESTAMP | 审核时间 |

**采纳奖励标准**：
```
- 进入开发队列：奖励 200 积分
- 正式上线后额外：奖励 300 积分 + 前3个月流水 5% 分润
```

#### API限流配置表 (api_rate_limits)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID（NULL为全局默认配置） |
| endpoint | VARCHAR(100) | API端点路径 |
| limit_per_minute | INTEGER | 每分钟限流次数 |
| limit_per_hour | INTEGER | 每小时限流次数 |
| limit_per_day | INTEGER | 每日限流次数 |
| is_active | BOOLEAN | 是否启用 |
| created_at | TIMESTAMP | 创建时间 |

**默认限流策略**：
```
未登录用户（访客）：
  - 工具查询类：60次/分钟
  - 其他接口：30次/分钟

已注册未认证用户：
  - 工具查询类：120次/分钟
  - 生成任务：5次/分钟
  - 其他接口：60次/分钟

已认证用户：
  - 工具查询类：200次/分钟
  - 生成任务：30次/分钟
  - 其他接口：100次/分钟
```

#### 用户会话表 (user_sessions)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| session_token_hash | VARCHAR(255) | JWT Token哈希 |
| device_info | JSONB | 设备信息：型号、OS、浏览器 |
| ip_address | VARCHAR(50) | 登录IP |
| location | VARCHAR(100) | IP归属地 |
| login_at | TIMESTAMP | 登录时间 |
| last_active_at | TIMESTAMP | 最后活跃时间 |
| expires_at | TIMESTAMP | 过期时间 |
| is_revoked | BOOLEAN | 是否已被吊销 |
| created_at | TIMESTAMP | 创建时间 |

---

## 5. AI 任务执行引擎设计

### 5.1 三层抽象架构

```
┌─────────────────────────────────────────────────────────┐
│           任务调度层 (Task Orchestrator)                 │
│    负责：任务队列、状态管理、进度追踪、费用结算          │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│           工具执行层 (Tool Executors)                    │
│    每个工具独立的执行器实现                              │
│    ├─ 有声绘本执行器 (StorybookExecutor)                │
│    ├─ 电商详情页执行器 (EcommerceExecutor)              │
│    └─ ... 其他工具                                      │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│           AI 提供商层 (AI Providers)                     │
│    抽象统一接口                                          │
│    ├─ OpenAIProvider                                    │
│    ├─ ZhipuAIProvider                                   │
│    ├─ DifyProvider                                      │
│    └─ ... 其他服务商                                    │
└─────────────────────────────────────────────────────────┘
```

### 5.2 AI 提供商抽象接口

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict

@dataclass
class AIResponse:
    success: bool
    content: str = None
    url: str = None
    tokens_used: int = 0
    error: str = None
    raw: Any = None

class BaseAIProvider(ABC):
    """AI提供商抽象基类"""
    
    @abstractmethod
    async def generate_text(
        self, 
        prompt: str, 
        system_prompt: str = None,
        **kwargs
    ) -> AIResponse:
        """生成文本"""
        pass
    
    @abstractmethod  
    async def generate_image(
        self, 
        prompt: str, 
        size: str = "1024x1024",
        **kwargs
    ) -> AIResponse:
        """生成图片"""
        pass
    
    @abstractmethod
    async def generate_audio(
        self, 
        text: str, 
        voice: str = "default",
        **kwargs
    ) -> AIResponse:
        """生成语音"""
        pass
    
    @abstractmethod
    async def generate_video(
        self,
        prompt: str,
        duration: int = 5,  # 视频时长(秒)
        resolution: str = "1080p",
        aspect_ratio: str = "16:9",
        **kwargs
    ) -> AIResponse:
        """生成视频"""
        pass
```

### 5.3 Dify 平台适配

```python
class DifyProvider(BaseAIProvider):
    """Dify平台适配
    
    支持：
    1. 调用Dify工作流
    2. 调用Dify Agent
    3. 支持流式输出
    4. 支持文件上传
    """
    
    def __init__(self, api_key: str, base_url: str = "https://api.dify.ai/v1"):
        self.api_key = api_key
        self.base_url = base_url
    
    async def run_workflow(
        self,
        workflow_id: str,
        inputs: Dict[str, Any],
        stream: bool = False
    ) -> AIResponse:
        """运行Dify工作流"""
        pass
    
    async def run_agent(
        self,
        agent_id: str,
        query: str,
        conversation_id: str = None,
        stream: bool = False
    ) -> AIResponse:
        """运行Dify Agent"""
        pass
```

### 5.3.1 火山方舟（字节跳动）平台适配

```python
class VolcEngineProvider(BaseAIProvider):
    """火山方舟（字节跳动）平台适配

    支持模型：
    - 文本模型：doubao-pro-32k / doubao-lite-4k / doubao-128k
    - 多模态：doubao-vision（图片理解）
    - 图片生成：seedance-v1.5（画匠）
    - 语音合成：speech-tts-v1
    - 视频生成：jimeng-v1（即梦）

    核心特点：
    - ✅ 100% 兼容 OpenAI API 格式，迁移零成本
    - ✅ 国内服务器，低延迟，高稳定
    - ✅ 支持 SSE 流式输出
    - ✅ 支持 Function Calling
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://ark.cn-beijing.volces.com/api/v3",
        model: str = "doubao-pro-32k"
    ):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model

    async def generate_text(
        self,
        prompt: str,
        system_prompt: str = None,
        stream: bool = False,
        **kwargs
    ) -> AIResponse:
        """调用豆包大模型生成文本"""
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=stream,
            temperature=kwargs.get("temperature", 0.7),
            max_tokens=kwargs.get("max_tokens", 2048),
            tools=kwargs.get("tools"),          # 支持 Function Calling
            tool_choice=kwargs.get("tool_choice")
        )

        return AIResponse(
            success=True,
            content=response.choices[0].message.content,
            tokens_used=response.usage.total_tokens,
            raw=response
        )
```

**火山方舟接入优势**：

| 维度 | 优势说明 |
|------|---------|
| **API兼容性** | 完全兼容 OpenAI SDK，现有代码几乎零修改即可切换 |
| **访问速度** | 国内北京机房，RTT < 50ms，比海外模型快3-5倍 |
| **内容合规** | 内置中文内容审核，降低违规风险 |
| **全模态覆盖** | 文本、图片、语音、视频全链路支持 |
| **成本优势** | 同等能力下，价格约为 GPT-4 的 1/3-1/5 |

### 5.4 工具执行器基类

```python
class BaseToolExecutor(ABC):
    """工具执行器抽象基类"""
    
    def __init__(self, task_id: UUID):
        self.task_id = task_id
        self.ai_provider: BaseAIProvider = None
    
    @abstractmethod
    async def estimate_cost(self, params: Dict) -> int:
        """预估费用"""
        pass
    
    @abstractmethod  
    async def execute(self) -> Work:
        """执行工具核心逻辑"""
        pass
    
    async def update_progress(self, percent: int, message: str):
        """更新任务进度"""
        pass
    
    async def add_log(self, level: str, message: str):
        """添加任务日志"""
        pass
```

### 5.5 任务状态流转

```
pending (排队中)
    ↓
running (执行中) → generating_story
    ↓
running → generating_images (进度30%)
    ↓
running → generating_audio (进度60%)
    ↓
running → packaging (进度90%)
    ↓
completed (完成) / failed (失败) / timeout (超时)
    ↓                   ↓
退费/结算             自动重试 → 仍失败 → 全额退费
```

### 5.6 实时通信方案（SSE）

#### 5.6.1 技术选型决策

**选型结论：采用 Server-Sent Events (SSE)，不使用 Socket.IO**

**决策依据**：
| 需求 | SSE适配度 | Socket.IO适配度 |
|------|----------|----------------|
| AI对话流式输出（打字机效果） | ✅ 完美适配 | ✅ 也支持 |
| 任务进度实时推送 | ✅ 完美适配 | ✅ 也支持 |
| 用户输入发送 | ➡️ 走普通HTTP POST即可 | ✅ 双向通信 |
| 架构复杂度 | 低（标准HTTP） | 高（WebSocket握手、Redis适配器） |
| 基础设施兼容 | 100%兼容所有Nginx/CDN | 需配置WebSocket支持 |

#### 5.6.2 SSE 架构设计

```
SSE实时通信链路：
  前端发起SSE连接
    → GET /api/v1/stream?session_id=xxx
    → 后端保持连接，设置超时30分钟
    → 会话状态存入Redis，绑定用户ID
  
  用户输入消息
    → POST /api/v1/chat/messages （普通HTTP）
    → 后端写入任务队列
    → 立即返回ACK
  
  AI流式响应
    → Worker调用LLM API，获取流式响应
    → 每生成一个token，通过Redis Pub/Sub发布
    → SSE连接监听到消息，推送给前端
    → 前端渲染打字机效果
  
  任务进度更新
    → Worker执行每一步，发布进度事件
    → SSE推送给前端，更新进度条
```

#### 5.6.3 FastAPI 实现示例

```python
# app/api/v1/stream.py
from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse
import redis.asyncio as redis
import json

router = APIRouter(prefix="/stream")

async def event_generator(session_id: str, user_id: UUID):
    """SSE事件生成器"""
    r = await redis.from_url(REDIS_URL)
    pubsub = r.pubsub()
    
    # 订阅该用户的所有频道
    channels = [
        f"session:{session_id}",      # 当前会话消息
        f"user:{user_id}:notifications",  # 用户通知
    ]
    await pubsub.subscribe(*channels)
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                yield {
                    "event": data["event"],
                    "data": json.dumps(data["payload"]),
                }
    finally:
        await pubsub.unsubscribe(*channels)
        await r.aclose()

@router.get("/session/{session_id}")
async def session_stream(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """会话级SSE流，支持对话消息和任务进度"""
    return EventSourceResponse(
        event_generator(session_id, current_user.id),
        ping=30,  # 每30秒发一次心跳
    )
```

#### 5.6.4 事件类型定义

| 事件类型 | 触发时机 | 数据结构 |
|---------|---------|---------|
| `chat_token` | LLM生成单个token时 | `{token: "你", position: 123}` |
| `chat_complete` | LLM回答完成时 | `{message_id: "...", full_text: "..."}` |
| `progress` | 任务执行进度更新 | `{percent: 45, message: "正在生成第3张插图..."}` |
| `task_completed` | 任务完成 | `{task_id: "...", work_id: "...", cost: 28}` |
| `task_failed` | 任务失败 | `{task_id: "...", error: "...", refunded: 28}` |
| `notification` | 系统通知 | `{type: "info", title: "...", content: "..."}` |

#### 5.6.5 可靠性保障机制

**断线重连与消息补发**：

```typescript
// 前端断线重连 + 消息序号机制
class ReliableSSE {
    private lastEventId: string = '0'
    private messageBuffer: Map<string, any> = new Map()
    private expectedSequence: number = 0
    
    connect(sessionId: string) {
        const es = new EventSource(
            `/api/v1/stream/session/${sessionId}?last_id=${this.lastEventId}`
        )
        
        es.addEventListener('message', (e) => {
            const data = JSON.parse(e.data)
            const sequence = data.sequence
            
            // 检测丢包
            if (sequence > this.expectedSequence) {
                // 请求补发缺失的消息
                this.requestMissedMessages(this.expectedSequence, sequence - 1)
            }
            
            // 缓存消息
            this.messageBuffer.set(sequence, data)
            this.expectedSequence = sequence + 1
            this.lastEventId = e.lastEventId
        })
        
        // 内置自动重连（EventSource默认3秒后重试）
        es.onerror = () => {
            console.log('SSE断开，3秒后自动重连')
        }
    }
}
```

**服务端消息持久化**：

```python
# Redis消息队列（环形缓冲区，保留最近1000条消息）
MAX_MESSAGES_PER_SESSION = 1000
MESSAGE_RETENTION = 3600 * 24  # 保留24小时

async def publish_with_sequence(session_id: str, event: str, payload: dict):
    """带序号的消息发布"""
    # 获取并递增序号
    sequence = await redis.incr(f"session:{session_id}:seq")
    
    message = {
        "sequence": sequence,
        "event": event,
        "payload": payload,
        "timestamp": time.time()
    }
    
    # 发布到Pub/Sub
    await redis.publish(
        f"session:{session_id}",
        json.dumps(message)
    )
    
    # 持久化到Redis List，用于补发
    key = f"session:{session_id}:messages"
    await redis.rpush(key, json.dumps(message))
    await redis.ltrim(key, -MAX_MESSAGES_PER_SESSION, -1)  # 只保留最近N条
    await redis.expire(key, MESSAGE_RETENTION)
```

**会话超时策略**：
```
超时规则：
  ├→ 单SSE连接最长保持：30分钟
  ├→ 用户无操作自动断开：15分钟
  └→ 页面卸载时主动close()

重连限制：
  ├→ 1分钟内最多重连5次
  ├→ 超过阈值：降级为轮询（5秒一次）
  └→ 用户刷新页面重置计数器
```

#### 5.6.6 任务超时与异常处理

**任务超时配置表**：

| 工具类型 | 硬超时 | 软超时 | 说明 |
|---------|--------|--------|------|
| AI有声绘本 | 15分钟 | 10分钟 | 10分钟未完成发提醒，15分钟强制终止 |
| 电商详情页 | 20分钟 | 15分钟 | |
| 单张图片生成 | 2分钟 | 1分钟 | |
| 文本生成 | 30秒 | 20秒 | |

**超时处理流程**：

```
任务启动 → 写入超时时间到Redis
    ↓
Celery Beat 每分钟巡检所有running任务
    ↓
┌─ 超过软超时？─┐
│      Yes      │      No
↓               ↓
推送"任务可能较慢"      正常等待
友好提示
    ↓
┌─ 超过硬超时？─┐
│      Yes      │      No
↓               ↓
强制终止任务      继续等待
  ├→ 标记status = timeout
  ├→ 全额退还积分
  ├→ 推送SSE事件告知用户
  └→ 记录告警日志（P1）
```

**异常处理分级策略**：

| 异常类型 | 重试策略 | 最终处理 | 用户感知 |
|---------|---------|---------|---------|
| AI服务商限流 | 重试3次，指数退避 | 仍失败切换备用服务商 | 进度条暂停，静默重试 |
| 网络超时 | 重试2次 | 仍失败标记异常 | 显示"网络波动，正在重试" |
| 内容审核拦截 | 不重试，重新生成 | 3次仍失败终止 | 提示"内容违规，请调整输入" |
| 服务器内部错误 | 不重试 | 立即终止，全额退费 | 提示"服务异常，已全额退款" |

**自动降级机制**：

```
主服务商失败率 > 20% → 自动切换到备用服务商
    ↓
  发内部告警（P1）
    ↓
  保持运行，用户无感知
    ↓
  主服务商恢复后自动切回
```

#### 5.6.7 Dify工作流回调集成

**架构设计**：

```
                        ┌──────────────────────┐
用户点击生成 ───────────►   我方 FastAPI       │
                        │  1. 创建Task记录     │
                        │  2. 调用Dify API     │
                        │  3. 返回task_id      │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │      Dify平台        │
                        │  异步执行工作流节点   │
                        └──────────┬───────────┘
                                   │
    节点1完成 / 进度30%  ──────────┤
    节点2完成 / 进度60%  ──────────┤  Webhook回调
    节点3完成 / 进度90%  ──────────┤
    全部完成 / 结果URL  ──────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  我方 Webhook 接口   │
                        │  1. 验签            │
                        │  2. 更新Task进度    │
                        │  3. 下载结果文件    │
                        │  4. 推送SSE事件     │
                        └──────────────────────┘
```

**FastAPI Webhook接口实现**：

```python
# app/api/v1/webhooks/dify.py
from fastapi import APIRouter, Request, HTTPException
import hmac
import hashlib

router = APIRouter(prefix="/webhooks/dify")

@router.post("/workflow/{task_id}")
async def dify_workflow_callback(
    task_id: UUID,
    request: Request,
):
    """Dify工作流回调接口"""
    
    # 1. 验证签名（防止伪造回调）
    signature = request.headers.get("X-Dify-Signature")
    body = await request.body()
    
    expected_signature = hmac.new(
        DIFY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(401, "Invalid signature")
    
    # 2. 解析回调数据
    data = json.loads(body)
    event_type = data["event"]
    
    # 3. 幂等性检查
    event_id = data.get("event_id")
    existing = await DifyWebhookEvent.filter(event_id=event_id).first()
    if existing and existing.processed:
        return {"status": "already_processed"}
    
    # 4. 处理不同事件类型
    if event_type == "node_completed":
        # 工作流节点完成：更新进度
        pass
    
    elif event_type == "workflow_completed":
        # 工作流完成：处理结果
        pass
    
    elif event_type == "workflow_failed":
        # 工作流失败：记录错误，退费
        pass
    
    # 5. 推送到SSE，前端实时更新
    await sse_publish(task_id, event_type, data)
    
    # 6. 记录处理状态
    await DifyWebhookEvent.create(
        event_id=event_id,
        task_id=task_id,
        processed=True
    )
    
    return {"status": "ok"}
```

**轮询兜底实现（防止Webhook丢失）**：
```python
@app.task
def poll_dify_workflow_status(task_id: str, dify_workflow_run_id: str):
    """定期轮询Dify工作流状态（Webhook兜底）"""
    for attempt in range(20):  # 最多轮询20次
        status = dify_client.get_workflow_status(dify_workflow_run_id)
        
        if status in ["completed", "failed"]:
            # 处理完成或失败，结束轮询
            process_final_status(task_id, status)
            return
        
        # 未完成，继续等
        sleep(30)
    
    # 超时，标记失败
    mark_task_timeout(task_id)
```

---

## 6. 安全与权限设计

### 6.1 认证体系

- **用户端**: JWT Token 认证
- **管理端**: JWT Token + 双因素认证(可选)
- **API 接口**: 请求签名 + 时间戳防重放

### 6.2 权限控制矩阵

| 角色 | 权限 |
|------|------|
| **访客** | 浏览工具、查看演示、搜索、查看评价 |
| **注册用户** | 访客权限 + 免费体验1次 + 收藏工具 |
| **认证用户** | 注册用户权限 + 使用付费工具 + 迭代创作 + 投票 + 评价 |
| **运营管理员** | 所有用户权限 + 工具上架/下架 + 用户管理 + 订单管理 + 数据看板 |

### 6.3 关键安全措施

1. **API 安全**
   - 所有接口请求签名校验
   - 按 User + IP 双重限流
   - SQL 注入/XSS/CSRF 防护
   - 敏感接口（支付、扣费）加幂等性Token

2. **数据安全**
   - 用户隐私信息 AES-256 加密存储
   - 身份证号脱敏显示（仅显示前后4位）
   - 数据库每日全量备份 + 小时级增量备份
   - 所有操作日志留存6个月

3. **资金安全**
   - 扣费前预冻结，任务完成后结算
   - 异常扣费自动检测和退款机制
   - 财务数据每日对账校验

---

## 7. 部署与运维架构

### 7.1 Docker Compose 编排

```yaml
version: '3.8'

services:
  # 用户端前端
  frontend-user:
    build: ./frontend-user
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    restart: always
    depends_on:
      - backend
  
  # 管理端前端
  frontend-admin:
    build: ./frontend-admin
    ports:
      - "3001:3001"
    restart: always
    depends_on:
      - backend
  
  # FastAPI 后端
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://lcaitool:${DB_PASSWORD}@postgres:5432/lcaitool
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    restart: always
  
  # Celery Worker (AI任务执行)
  celery-worker:
    build: ./backend
    command: celery -A app.workers.celery_app worker --loglevel=info --concurrency=4
    environment:
      - DATABASE_URL=postgresql://lcaitool:${DB_PASSWORD}@postgres:5432/lcaitool
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    restart: always
  
  # 数据库
  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: lcaitool
      POSTGRES_USER: lcaitool
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    restart: always
  
  # 缓存/消息队列
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: always
  
  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - frontend-user
      - frontend-admin
      - backend
    restart: always

volumes:
  postgres_data:
  redis_data:
```

### 7.2 多级缓存策略

```
┌─────────────────────────────────────────────────────────┐
│                    多级缓存架构                            │
├─────────────────────────────────────────────────────────┤
│  L1: 浏览器缓存 → 静态资源(JS/CSS/图片)                   │
│  L2: Nginx缓存 → 工具列表、详情页等公开页面                │
│  L3: Redis缓存 → 热点数据（用户信息、工具配置、统计数据）  │
│  L4: 数据库查询缓存 → SQLAlchemy 查询缓存                  │
└─────────────────────────────────────────────────────────┘
```

### 7.3 性能目标

| 指标 | 目标 |
|------|------|
| 首页加载 | < 1.5秒 (LCP) |
| 工具详情页 | < 2秒 |
| API响应 | 99% < 500ms |
| 并发用户 | 支持2000并发 |
| AI任务排队 | 高峰期最多5分钟等待 |

---

## 8. 扩展路线图

### 8.1 MVP 阶段（0-3个月）

- ✅ 单体架构
- ✅ 垂直扩容服务器
- ✅ 核心功能：登录、工具、任务、支付、成果

### 8.2 成长期（3-6个月）

- 🔄 任务服务分离
- 🔄 增加 Celery Worker 数量
- 🔄 引入 Elasticsearch 搜索
- 🔄 CDN 加速静态资源

### 8.3 规模化（6个月+）

- 📋 微服务架构拆分
- 📋 按服务独立扩容
- 📋 引入消息队列（RabbitMQ/Kafka）
- 📋 多可用区部署

---

## 9. 风险与应对

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| AI服务商接口不稳定 | 高 | 中 | 接入至少2家服务商，支持自动降级切换 |
| 上线初期流量突增 | 中 | 低 | 做好性能压测，支持弹性扩容，排队机制 |
| 合规政策变化 | 高 | 低 | 密切关注政策动态，预留调整开发时间 |
| 工具数量太少用户流失 | 中 | 高 | 建立快速工具上架机制，每周可上新 |

---

## 10. 核心业务流程设计

### 10.1 用户注册与认证流程

```
微信一键登录流程：
  用户点击「微信登录」
    → 前端跳转微信OAuth授权页
    → 用户扫码确认
    → 微信回调code到后端
    → 后端换取openid + access_token
    → 查询用户是否存在
      → 存在：生成JWT，返回登录成功
      → 不存在：创建新用户，赠送体验积分，生成JWT
    → 前端存储Token，跳转首页

实名认证流程：
  用户填写姓名+身份证号
    → 后端调用第三方实名核验API
    → 核验通过：
      → AES-256加密存储身份证号
      → 标记id_card_verified = true
      → 赠送认证奖励积分
      → 记录实名日志
    → 核验失败：返回错误信息，不保存敏感数据
```

### 10.2 工具使用完整链路

```
用户使用工具流程：
  1. 用户进入工具详情页
     → 读取工具配置（Redis缓存）
     → 展示费用说明和案例
     
  2. 用户填写参数/对话交互
     → 前端实时校验输入
     → 实时估算费用：base_fee + 资源费
     
  3. 点击「开始生成」
     → 检查用户积分余额 ≥ 预估费用
     → 检查实名认证状态
     → 创建Task记录（status=pending）
     → 预冻结积分（创建冻结交易记录）
     → 提交任务到Celery队列
     → 返回task_id，前端进入进度页
     
  4. 任务执行中
     → Worker拉取任务，更新status=running
     → 执行器分步执行，每步调用update_progress
     → 实时写入TaskLog
     → 调用AI Provider API
     
  5. 任务完成
     → 计算实际费用（多退少不补）
     → 结算：解冻预冻结，扣取实际费用
     → 创建Work记录和WorkFile记录
     → 更新Task状态=completed
     → 触发站内通知（可选）
     
  6. 异常处理
     → AI调用失败：自动重试2次 → 仍失败 → 标记failed
     → 超时失败：status=timeout，全额退还积分
     → 用户主动取消：根据进度按比例扣费
```

### 10.3 支付与充值流程

```
积分充值流程：
  用户选择充值档位
    → 创建Order记录（status=pending）
    → 调用微信支付统一下单API
    → 返回prepay_id和支付参数
    → 前端唤起微信支付
    → 用户支付完成
    → 微信异步回调notify_url
    → 后端验证签名，更新order=paid
    → 发放积分 + 赠送积分
    → 记录交易流水
    → 返回支付成功页

充值档位设计（带赠送梯度）：
  | 档位 | 支付金额 | 基础积分 | 赠送积分 | 总积分 | 性价比 |
  |------|---------|---------|---------|--------|-------|
  | 入门 | ¥30    | 300     | 20      | 320    | 1.07x |
  | 进阶 | ¥100   | 1000    | 100     | 1100   | 1.10x |
  | 专业 | ¥300   | 3000    | 400     | 3400   | 1.13x |
  | 企业 | ¥1000  | 10000   | 2000    | 12000  | 1.20x |
```

### 10.4 迭代创作流程

```
基于已有成果继续优化：
  用户在成果详情页点击「继续优化」
    → 加载历史版本树（支持选择任意版本为父节点）
    → 展示历史输入参数和最终提示词
    → 用户输入修改需求（如：风格改成卡通、增加XX场景）
    → 系统合并上下文：原输入 + 修改需求 + 历史产出分析
    → 生成新的prompt_text
    → 费用预估（迭代优惠：基础费8折）
    → 创建新Task，parent_id指向原Work
    → 执行生成流程
    → 完成后生成新版本Work（version+1）
    → 版本对比：自动生成差异说明
```

---

## 11. 标杆工具执行引擎详细设计

### 11.1 AI有声绘本生成专家（StorybookExecutor）

**执行步骤拆解**：

| 阶段 | 进度 | 操作 | 费用计算 |
|------|------|------|---------|
| 1. 故事生成 | 0-15% | LLM根据主题生成完整故事大纲 + 分页故事文本 | 包含在基础费 |
| 2. 插画提示词生成 | 15-25% | 为每一页生成精准的绘画提示词（风格统一、角色一致） | 包含在基础费 |
| 3. 批量生成插图 | 25-60% | 并行调用图片生成API，N页同时生成 | image_fee × 页数 |
| 4. 语音合成 | 60-80% | 为每一页故事文本生成语音 narration | audio_fee × 页数 |
| 5. 排版与打包 | 80-95% | 生成统一封面、PDF排版、打包ZIP | 包含在基础费 |
| 6. 完成结算 | 100% | 计算总费用，生成预览，保存成果 | - |

---

## 12. 🔴 P0级缺失数据表设计

### 12.1 工具收藏表 (tool_favorites)

**业务场景**：注册用户可收藏感兴趣的工具，个人中心快捷访问

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID (FK → users.id) |
| tool_id | UUID | 工具ID (FK → tools.id) |
| created_at | TIMESTAMP | 收藏时间 |

**业务逻辑**：
- 收藏/取消收藏时同步更新 tools.favorite_count 计数器
- 用户个人中心"我的收藏"列表按收藏时间倒序

### 12.2 工具评价表 (tool_ratings)

**业务场景**：用户使用工具后可进行评分和文字评价，支持晒图

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 评价用户ID |
| tool_id | UUID | 工具ID |
| task_id | UUID | 关联任务ID（确保使用过才能评价） |
| rating | INTEGER | 评分 1-5星 |
| content | VARCHAR(1000) | 评价文字内容 |
| images | VARCHAR(255)[] | 晒图URL数组 |
| is_useful_count | INTEGER | 标记"有用"次数 |
| status | VARCHAR(20) | 状态：active/deleted/auditing |
| admin_reply | VARCHAR(500) | 官方回复 |
| replied_at | TIMESTAMP | 回复时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**审核机制**：
- 关键词自动过滤 → 命中进入 `auditing` 状态
- 人工审核通过 → `active` / 驳回 → `deleted`
- 删除为软删除，保留记录

### 12.3 构思工具投票表 (tool_idea_votes)

**业务场景**：认证用户对构思中的工具进行投票，达到目标票数优先开发

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 投票用户ID |
| idea_id | UUID | 构思ID (FK → idea_submissions.id) |
| vote_weight | INTEGER | 投票权重（默认1，高级用户可设计更高权重） |
| created_at | TIMESTAMP | 投票时间 |

**投票业务规则**：
- 仅实名认证用户可投票
- 每人对每个构思只能投1票
- 投票后不可撤销
- 达到 vote_target 自动触发开发排期流程
- 定期对高票构思发送邮件通知关注用户

### 12.4 成果分享表 (work_shares)

**业务场景**：用户可将生成的作品设为公开分享，首页瀑布流展示

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| work_id | UUID | 成果ID (FK → works.id) |
| user_id | UUID | 分享用户ID |
| share_slug | VARCHAR(100) | 分享短链接ID |
| title | VARCHAR(200) | 分享标题（默认取work.title） |
| description | VARCHAR(500) | 分享描述 |
| cover_image | VARCHAR(255) | 封面图 |
| preview_images | VARCHAR(255)[] | 预览图数组（最多9张） |
| is_featured | BOOLEAN | 是否精选推荐 |
| is_public | BOOLEAN | 是否公开可见 |
| view_count | INTEGER | 浏览次数 |
| like_count | INTEGER | 点赞次数 |
| share_count | INTEGER | 分享次数 |
| sort_weight | INTEGER | 排序权重（运营手动调整） |
| status | VARCHAR(20) | pending/approved/rejected |
| reject_reason | VARCHAR(200) | 驳回原因 |
| created_at | TIMESTAMP | 分享时间 |
| updated_at | TIMESTAMP | 更新时间 |

**内容审核流程**：
```
用户提交分享
    ↓
AI自动审核（图片+文字）
    ├→ 违规 → status=rejected，通知用户
    └→ 通过 → status=approved，进入公开池
          ↓
    运营后台可手动设为 is_featured 精选
```

### 12.5 工具演示案例表 (tool_demos)

**业务场景**：工具详情页展示成品效果演示，无需登录即可查看

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| tool_id | UUID | 工具ID |
| title | VARCHAR(200) | 案例标题 |
| description | VARCHAR(500) | 案例描述 |
| cover_image | VARCHAR(255) | 封面图 |
| demo_type | VARCHAR(20) | 类型：image/video/mixed |
| demo_images | VARCHAR(255)[] | 演示图片数组 |
| demo_video | VARCHAR(255) | 演示视频URL |
| input_params | JSONB | 生成该案例的输入参数 |
| result_sample | JSONB | 生成结果示例数据 |
| sort_order | INTEGER | 排序号，越小越靠前 |
| is_active | BOOLEAN | 是否启用 |
| created_by | UUID | 创建人（管理员） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**案例展示逻辑**：
- 标杆工具至少配置3-5个高质量演示案例
- 支持 Tab 切换：图文案例 / 视频演示
- 点击案例可放大查看细节，显示"输入 → 输出"对比

---

## 13. 🟡 P1级优化项设计

### 13.1 订单表完整设计 (orders)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| order_no | VARCHAR(50) | 平台订单号（唯一） |
| third_party_order_no | VARCHAR(100) | 微信/支付宝侧订单号 |
| recharge_package_id | UUID | 充值档位ID（关联充值档位配置表） |
| pay_amount | DECIMAL(10,2) | 实际支付金额（元） |
| base_points | INTEGER | 基础积分 |
| bonus_points | INTEGER | 赠送积分 |
| total_points | INTEGER | 总积分 = base + bonus |
| payment_provider | VARCHAR(20) | 支付渠道：wechat_jsapi / wechat_native / alipay |
| status | VARCHAR(20) | pending/paid/failed/refunded/expired |
| paid_at | TIMESTAMP | 支付成功时间 |
| expired_at | TIMESTAMP | 订单过期时间（未支付30分钟自动过期） |
| client_ip | VARCHAR(50) | 下单IP |
| device_info | VARCHAR(200) | 设备信息 |
| callback_raw | JSONB | 支付回调原始数据 |
| reconciliation_status | VARCHAR(20) | 对账状态：unmatched/matched/mismatch |
| reconciled_at | TIMESTAMP | 对账时间 |
| created_at | TIMESTAMP | 下单时间 |
| updated_at | TIMESTAMP | 更新时间 |

**订单状态流转**：
```
pending (待支付)
    ├→ 用户支付成功 → paid (已支付) → 发放积分
    ├→ 超时未支付 → expired (已过期)
    └→ 支付失败 → failed (支付失败)

paid (已支付)
    └→ 特殊情况退款 → refunded (已退款) → 扣减对应积分
```

### 13.2 充值档位配置表 (recharge_packages)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(100) | 档位名称：入门档/进阶档/专业档 |
| price | DECIMAL(10,2) | 售价（元） |
| base_points | INTEGER | 基础积分 |
| bonus_points | INTEGER | 赠送积分 |
| bonus_percentage | INTEGER | 赠送百分比（冗余便于展示） |
| badge_text | VARCHAR(50) | 角标文字：推荐/最划算/超值 |
| badge_color | VARCHAR(20) | 角标颜色：yellow/orange/red |
| sort_order | INTEGER | 排序号 |
| is_active | BOOLEAN | 是否上架 |
| is_popular | BOOLEAN | 是否热门推荐 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**业务逻辑**：
- 支持动态配置充值档位，无需发版
- 节假日可配置限时特惠档位
- 新用户首充额外赠送逻辑在业务层处理

### 13.3 工具分类表 (tool_categories)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| slug | VARCHAR(50) | URL友好标识 |
| name | VARCHAR(50) | 分类名称 |
| icon | VARCHAR(100) | 图标名称/路径 |
| description | VARCHAR(200) | 分类描述 |
| sort_order | INTEGER | 排序号 |
| tool_count | INTEGER | 工具数量（统计缓存） |
| is_active | BOOLEAN | 是否启用 |
| is_featured | BOOLEAN | 是否在首页突出展示 |
| parent_id | UUID | 父分类ID（支持二级分类） |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**首页第三屏展示逻辑**：
```sql
-- 查询首页展示的一级分类
SELECT * FROM tool_categories 
WHERE parent_id IS NULL AND is_active = true
ORDER BY sort_order LIMIT 8;
```

### 13.4 Dify Webhook事件记录表 (dify_webhook_events)

解决Dify回调重试的幂等性问题

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| event_id | VARCHAR(100) | Dify事件ID（用于去重） |
| task_id | UUID | 关联我方任务ID |
| dify_workflow_run_id | VARCHAR(100) | Dify工作流运行ID |
| event_type | VARCHAR(50) | 事件类型 |
| raw_payload | JSONB | 原始回调Payload |
| processed | BOOLEAN | 是否已处理 |
| process_result | JSONB | 处理结果 |
| retry_count | INTEGER | 重试次数 |
| created_at | TIMESTAMP | 接收时间 |
| processed_at | TIMESTAMP | 处理完成时间 |

### 13.5 管理后台操作审计日志表 (admin_audit_logs)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| admin_user_id | UUID | 操作管理员ID |
| action | VARCHAR(50) | 操作类型：login/tool_edit/user_ban/order_refund |
| resource_type | VARCHAR(50) | 资源类型：user/tool/order/work |
| resource_id | UUID | 资源ID |
| old_value | JSONB | 修改前的值（diff用） |
| new_value | JSONB | 修改后的值 |
| ip_address | VARCHAR(50) | 操作IP |
| user_agent | VARCHAR(500) | 浏览器UA |
| created_at | TIMESTAMP | 操作时间 |

**关键操作必须留痕**：
- 用户封禁/解封
- 人工退费
- 工具上架/下架
- 订单金额修改
- 管理员权限变更

---

## 14. 🔧 架构设计优化补充

### 14.1 Celery多队列优先级设计

**问题**：不同工具执行时间差异巨大（30秒 vs 15分钟），FIFO队列导致小任务阻塞

**解决方案**：按执行时长分队列，配置不同Worker数

```python
# celery_app.py
from kombu import Exchange, Queue

task_routes = {
    # 快速任务：文本生成、简单处理 (< 30秒)
    'tasks.generate_text': {'queue': 'fast'},
    'tasks.send_notification': {'queue': 'fast'},
    
    # 中等任务：单张图片生成、语音生成 (30秒 - 2分钟)
    'tasks.generate_image': {'queue': 'medium'},
    'tasks.generate_audio': {'queue': 'medium'},
    
    # 重量级任务：有声绘本、电商详情页、视频 (2分钟 - 15分钟)
    'tasks.execute_storybook_tool': {'queue': 'heavy'},
    'tasks.execute_ecommerce_tool': {'queue': 'heavy'},
    'tasks.generate_video': {'queue': 'heavy'},
}

# 启动命令示例：
# celery -A app.workers.celery_app worker -Q fast --concurrency=10  # 快速队列：10并发
# celery -A app.workers.celery_app worker -Q medium --concurrency=4  # 中等队列：4并发
# celery -A app.workers.celery_app worker -Q heavy --concurrency=2   # 重量级：2并发
```

**队列监控告警**：
- fast队列堆积 > 100 → P2告警
- medium队列堆积 > 50 → P2告警  
- heavy队列堆积 > 20 → P1告警
- 支持自动扩容（K8s环境）

### 14.2 文件存储层优化设计

**补充文件生命周期管理**：

| 文件类型 | 存储位置 | TTL策略 | CDN加速 | 鉴权方式 |
|---------|---------|---------|---------|---------|
| 临时生成文件 | OSS temp/ | 24小时自动删除 | 否 | URL签名 |
| 用户成果文件 | OSS works/{user_id}/ | 永久（用户主动删除） | 是 | Referer+签名 |
| 分享预览图 | OSS share/ | 永久 | 是 | 公开读 |
| 工具演示图 | OSS demo/ | 永久 | 是 | 公开读 |
| 用户头像 | OSS avatars/ | 永久 | 是 | 公开读 |
| 导出打包ZIP | 本地/OSS | 7天自动删除 | 否 | 登录态校验 |

**自动清理任务**：
```python
# 每日凌晨清理过期文件
@app.task
def cleanup_expired_files():
    # 清理24小时以上的临时文件
    # 清理7天以上的导出ZIP包
    pass
```

### 14.3 SSE断线重连状态同步优化

**问题**：用户刷新页面后如何快速恢复任务状态

**解决方案**：任务快照 + 批量拉取接口

```python
# app/api/v1/stream.py
@router.get("/tasks/snapshot")
async def get_tasks_snapshot(
    task_ids: str,  # 逗号分隔的task_id列表
    current_user: User = Depends(get_current_user),
):
    """批量获取任务最新状态（SSE重连后调用）"""
    ids = task_ids.split(',')
    
    tasks = await Task.filter(
        id__in=ids,
        user_id=current_user.id
    ).prefetch_related('work')
    
    result = []
    for task in tasks:
        result.append({
            "task_id": str(task.id),
            "status": task.status,
            "progress": task.progress,
            "status_message": task.status_message,
            "work_id": str(task.work.id) if task.work else None,
            "actual_cost": task.actual_cost,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None
        })
    
    return result
```

---

## 15. 📊 数据库索引完整设计

### 15.1 用户相关表

```sql
-- users表
CREATE INDEX idx_users_wechat_openid ON users(wechat_openid);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_is_active ON users(is_active, created_at DESC);

-- real_name_verifications表
CREATE UNIQUE INDEX idx_id_card_hash ON real_name_verifications(id_card_hash);
CREATE INDEX idx_user_id_status ON real_name_verifications(user_id, status);

-- user_checkins表
CREATE UNIQUE INDEX idx_checkin_user_date ON user_checkins(user_id, checkin_date);
CREATE INDEX idx_checkin_date ON user_checkins(checkin_date);

-- user_invites表
CREATE INDEX idx_invites_inviter ON user_invites(inviter_id, created_at DESC);
CREATE INDEX idx_invites_invitee ON user_invites(invitee_id);
```

### 15.2 工具相关表

```sql
-- tools表
CREATE INDEX idx_tools_slug ON tools(slug);
CREATE INDEX idx_tools_category ON tools(category);
CREATE INDEX idx_tools_status ON tools(status, created_at DESC);
CREATE INDEX idx_tools_rating ON tools(rating_avg DESC, use_count DESC);
CREATE INDEX idx_tools_search ON tools USING GIN(to_tsvector('chinese', name || ' ' || description));

-- tool_favorites表
CREATE UNIQUE INDEX idx_user_tool_unique ON tool_favorites(user_id, tool_id);
CREATE INDEX idx_favorites_user_id ON tool_favorites(user_id);
CREATE INDEX idx_favorites_tool_id ON tool_favorites(tool_id);

-- tool_ratings表
CREATE UNIQUE INDEX idx_task_rating_unique ON tool_ratings(task_id);
CREATE INDEX idx_ratings_tool_id ON tool_ratings(tool_id, created_at DESC);
CREATE INDEX idx_ratings_user_id ON tool_ratings(user_id);
```

### 15.3 任务与成果表

```sql
-- tasks表
CREATE INDEX idx_tasks_user_time ON tasks(user_id, created_at DESC);
CREATE INDEX idx_tasks_tool ON tasks(tool_id);
CREATE INDEX idx_tasks_status ON tasks(status, created_at DESC);
CREATE INDEX idx_tasks_running ON tasks(status, started_at) WHERE status = 'running';

-- works表
CREATE INDEX idx_works_user_time ON works(user_id, created_at DESC);
CREATE INDEX idx_works_tool ON works(tool_id);
CREATE INDEX idx_works_task ON works(task_id);

-- work_files表
CREATE INDEX idx_work_files_work ON work_files(work_id);
CREATE INDEX idx_work_files_type ON work_files(file_type);

-- tool_demos表
CREATE INDEX idx_demos_tool_id ON tool_demos(tool_id, sort_order);
CREATE INDEX idx_demos_active ON tool_demos(is_active);
```

### 15.4 支付与积分表

```sql
-- orders表
CREATE UNIQUE INDEX idx_order_no_unique ON orders(order_no);
CREATE UNIQUE INDEX idx_third_party_order ON orders(third_party_order_no);
CREATE INDEX idx_orders_user_id ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_paid_date ON orders(paid_at);

-- point_transactions表
CREATE INDEX idx_transactions_user ON point_transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_type ON point_transactions(type);
CREATE INDEX idx_transactions_task ON point_transactions(task_id);

-- recharge_packages表
CREATE INDEX idx_recharge_active ON recharge_packages(is_active, sort_order);
```

### 15.5 其他表

```sql
-- tool_categories表
CREATE UNIQUE INDEX idx_category_slug_unique ON tool_categories(slug);
CREATE INDEX idx_category_parent ON tool_categories(parent_id);
CREATE INDEX idx_category_active ON tool_categories(is_active, sort_order);

-- work_shares表
CREATE UNIQUE INDEX idx_share_slug_unique ON work_shares(share_slug);
CREATE INDEX idx_shares_public_featured ON work_shares(is_public, is_featured, sort_weight DESC, created_at DESC);
CREATE INDEX idx_shares_user_id ON work_shares(user_id, created_at DESC);

-- tool_idea_votes表
CREATE UNIQUE INDEX idx_user_idea_vote_unique ON tool_idea_votes(user_id, idea_id);
CREATE INDEX idx_votes_idea_id ON tool_idea_votes(idea_id);
CREATE INDEX idx_votes_user_id ON tool_idea_votes(user_id);

-- dify_webhook_events表
CREATE UNIQUE INDEX idx_dify_event_id ON dify_webhook_events(event_id);
CREATE INDEX idx_dify_task_id ON dify_webhook_events(task_id);

-- admin_audit_logs表
CREATE INDEX idx_audit_admin_id ON admin_audit_logs(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON admin_audit_logs(resource_type, resource_id);
```

---

## 16. 🆕 新增 API 端点设计（P0 ✅ 已实现）

### 16.1 GET /users/stats — 用户统计数据

**业务场景**：个人中心欢迎横幅和统计卡片需要真实数据。

**响应格式**：
```json
{
  "days_used": 42,         // 注册天数
  "today_count": 3,        // 今日任务数
  "total_works": 15,       // 作品总数
  "total_consumed": 280,   // 累计消费积分
  "reward_points": 50      // 奖励积分
}
```

**实现逻辑**：
- days_used: `now() - user.created_at` 天数差
- today_count: 当日 `Task.created_at >= 今日0点` 的总数
- total_works: Work 表中该用户的记录数
- total_consumed: PointTransaction type=consume 的绝对值之和
- reward_points: PointTransaction type=reward/adjust 且 amount>0 之和

### 16.2 GET /tools/recent — 最近使用工具

**业务场景**：个人中心展示用户最近使用的工具（去重，最多3条）。

**响应格式**：
```json
[
  {
    "id": "uuid",
    "name": "AI有声绘本生成专家",
    "cover_image": "cover.jpg",
    "use_count": 42,
    "last_used_at": 1716518400
  }
]
```

**实现逻辑**：
- 查询当前用户最近的 Task 记录（按 created_at 倒序）
- GROUP BY tool_id + 取最大 created_at
- 仅筛选 status=completed 的任务
- 关联 Tool 表获取 tool 元数据

### 16.3 POST /payment/custom-recharge — 自定义充值

**业务场景**：用户在 /pricing 页面输入自定义金额，一步完成充值。

**请求**：
```json
{ "amount": 30 }
```

**响应**：
```json
{
  "success": true,
  "order_no": "ORD20260524xxxx",
  "pay_amount": 30.0,
  "total_points": 300,
  "balance": 1300,
  "message": "充值成功"
}
```

**实现逻辑**：
- 1元 = 10积分，自定义金额不额外赠送
- 创建 Order 记录 → 模拟支付（同一事务）→ 积分到账
- 前端一次调用即可完成充值，无需二次确认

### 16.4 GET /payment/orders — 用户订单列表

**业务场景**：用户查看自己的充值订单记录。

**参数**：page, page_size, status(可选筛选)

**响应**：
```json
{
  "items": [Order],
  "total": 50,
  "page": 1,
  "page_size": 20
}
```

### 16.5 POST /tasks/{task_id}/progress — 通用进度更新

**业务场景**：Dify 平台 / 外部 HTTP 服务主动汇报任务进度。

**请求体**：
```json
{
  "progress": 45,
  "message": "正在生成商品主图...",
  "data": { "node": "image_generation" },
  "completed": false,
  "actual_cost": null
}
```

**completed=true 时后端逻辑**：
- actual_cost = actual_cost ?? task.estimated_cost
- TaskService.complete_task(task_id, actual_cost)
- 差额 = 冻结金额 - actual_cost → 多退少补
- status = completed, progress = 100
- 写入交易流水 → Redis pubsub → SSE → 前端跳转成果页

**鉴权方式**：
- 内网: X-Internal-Token header（第三方平台用）
- 外网: 用户 Bearer Token（调试用）

### 16.6 POST /tasks/{id}/retry — 任务重试

**业务场景**：任务失败后用户可点击重试。

**实现逻辑**：
- 重置 task 状态为 pending
- 清除旧的错误信息和结算记录
- 重新提交到 Celery 队列
- 重新预冻结积分

---

## 17. 🆕 SSE 事件模型（✅ 已实现）

### 17.1 三条独立事件线

SSE 推送三条不同事件类型，不再混用：

| 事件类型 | 触发时机 | 数据结构 |
|---------|---------|---------|
| `progress` | 进度更新（可多次） | `{percent, message, step_index, total_steps, step_status, sub_progress}` |
| `completed` | 完成结算（终端事件，仅一次） | `{task_id, status, work_id, message}` |
| `error` | 执行失败（终端事件，仅一次） | `{task_id, status, message}` |

终端事件（`completed`/`error`）发出后 SSE 连接关闭。

### 17.2 ProgressEvent 结构化进度

```python
class ProgressEvent:
    percent: int           # 0-100 总进度
    message: str           # 当前步骤描述
    step_index: int        # 当前步骤索引 (0-based)
    total_steps: int       # 总步骤数
    step_status: str       # running | completed | pending
    sub_progress: Optional[str]  # 如 "3/10" 表子进度
```

### 17.3 前端监听逻辑

```typescript
sse.addEventListener("progress", (e) => updateProgressModal(JSON.parse(e.data)));
sse.addEventListener("completed", (e) => {
  const { work_id } = JSON.parse(e.data);
  window.location.href = `/works/detail/${work_id}`;
});
sse.addEventListener("error", (e) => showError(JSON.parse(e.data).message));
```

### 17.4 页面刷新恢复

SSE 断开后，前端通过 REST API 恢复状态：
1. `GET /tasks/{id}` → task.status + task.progress + task.work_id → 判定状态
2. `GET /tasks/{id}/logs?level=progress` → TaskLog[] 按时间排序 → 恢复进度时间线

---

## 18. 🆕 本地文件存储设计（✅ 已实现）

### 18.1 存储目录结构

```
./storage/
└── works/
    └── {task_id}/
        ├── images/
        │   ├── page_1.png
        │   └── page_2.png
        ├── audio/
        │   ├── page_1.mp3
        │   └── page_2.mp3
        ├── storybook.pdf
        ├── package.zip
        └── metadata.json
```

### 18.2 文件服务 API

`GET /api/v1/files/{work_file_id}` 从本地存储读取文件流。

支持：
- 图片预览（直接返回图片二进制）
- ZIP 下载（设置 Content-Disposition: attachment）
- 断点续传（支持 Range header）

### 18.3 文件生命周期

| 文件类型 | 存储位置 | TTL策略 |
|---------|---------|---------|
| 用户成果文件 | storage/works/{task_id}/ | 永久（用户主动删除） |
| 导出打包ZIP | storage/works/{task_id}/package.zip | 7天自动清理 |
| 工具演示图 | 静态目录/CDN | 永久 |

---

## 19. 🆕 执行器架构扩展（✅ 已实现）

### 19.1 三种执行模式

| 执行器 | 模式 | AI Provider | 进度驱动 |
|--------|------|------------|---------|
| StorybookExecutor | 本地逐步执行 | 火山方舟(豆包) | 每步直接调用 update_progress() |
| EcommerceExecutor | Dify SSE 流式消费 | Dify Workflow | 消费 Dify SSE 事件流 → 映射为进度 |
| MarketingExecutor | Celery 转发 + HTTP 回调 | 外部平台 | 外部平台通过 POST /tasks/{id}/progress 驱动 |

### 19.2 Mock 执行模式

通过环境变量 `MOCK_AI_EXECUTION=true` 开启，适用于开发和测试：

- 模拟 7 步进度（从 0% → 100%）
- 每步随机延迟 1-3 秒
- 创建真实的 Work/WorkFile 记录
- 不依赖任何外部 AI API
- E2E 测试自动启用

---

## ✅ 数据表汇总（总计25张核心业务表）

| 分类 | 表名 | 说明 |
|------|------|------|
| **用户相关** | users | 用户主表 |
| | real_name_verifications | 实名认证记录表 |
| | user_checkins | 用户签到表 |
| | user_invites | 用户邀请表 |
| | user_sessions | 用户会话表 |
| **工具相关** | tools | 工具主表（含 usage_modes 字段） |
| | tool_categories | 工具分类表 |
| | tool_favorites | 工具收藏表 |
| | tool_ratings | 工具评价表 |
| | tool_demos | 工具演示案例表 |
| | idea_submissions | 创意提交表 |
| | tool_idea_votes | 构思工具投票表 |
| **任务与成果** | tasks | 任务表（支持进度追踪与结算） |
| | works | 成果表（支持版本迭代） |
| | work_files | 成果文件表 |
| | work_shares | 成果分享表 |
| | scheduled_tasks | 用户定时任务表 |
| | content_audit_logs | 内容审核日志表 |
| **支付与积分** | orders | 订单表（含对账状态） |
| | recharge_packages | 充值档位配置表（4个PRD标准档位） |
| | point_transactions | 积分交易表 |
| **系统与运维** | api_rate_limits | API限流配置表 |
| | dify_webhook_events | Dify Webhook事件记录表 |
| | admin_audit_logs | 管理后台操作审计日志表 |

---

**文档结束**

*本文档整合了技术方案 V1.0、V1.1 与 V2.0 补充内容，完整覆盖 PRD 所有业务场景。V2.0 新增：目录结构修正(apps/前缀)、新API端点设计、SSE事件模型、本地文件存储、执行器架构扩展(三种模式+Mock)*
