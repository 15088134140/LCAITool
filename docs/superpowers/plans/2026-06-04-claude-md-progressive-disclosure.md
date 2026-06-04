# CLAUDE.md Progressive Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前臃肿的 `CLAUDE.md` 重构为短小的 Claude 工作入口，并把项目、开发、架构等详细资料拆分到按需读取的专题文档。

**Architecture:** 文档采用“入口 + 专题资料”的渐进式披露结构。`CLAUDE.md` 只保留强制行为规则和读取路由；`docs/project/`、`docs/development/`、`docs/architecture/` 分别承载产品、开发和架构资料。

**Tech Stack:** Markdown 文档、Git、现有 `docs/superpowers/specs/2026-06-04-claude-md-progressive-disclosure-design.md` 设计文档。

---

## File Structure

### Create

- `docs/project/overview.md`：项目定位、核心差异化、产品目标。
- `docs/project/roadmap.md`：MVP/P0/P1/P2 功能状态。
- `docs/project/reference-index.md`：PRD、技术方案、设计稿、superpowers specs/plans 等资料索引。
- `docs/development/tech-stack.md`：前后端技术栈、部署方式、目录结构。
- `docs/development/design-system.md`：色彩、字体、组件交互规范。
- `docs/development/coding-principles.md`：开发原则、测试要求、数据库迁移、安全编码原则。
- `docs/development/agent-workflow.md`：子代理工作流、commit 规则、Superpowers + gstack 分工。
- `docs/architecture/business-flows.md`：注册认证、工具使用、支付充值、迭代创作业务流程。
- `docs/architecture/executor-patterns.md`：标杆工具执行规范和执行器模式。
- `docs/architecture/security-and-performance.md`：数据安全、接口安全、资金安全、性能指标。

### Modify

- `CLAUDE.md`：缩减为 Claude 工作入口，保留强制规则、工具分工和按需读取规则。

### Reference

- `docs/superpowers/specs/2026-06-04-claude-md-progressive-disclosure-design.md`：本计划依据的设计文档。

---

## Task 1: Create project documentation

**Files:**
- Create: `docs/project/overview.md`
- Create: `docs/project/roadmap.md`
- Create: `docs/project/reference-index.md`
- Reference: `CLAUDE.md:3-14`, `CLAUDE.md:294-330`, `CLAUDE.md:432-441`

- [ ] **Step 1: Create `docs/project/overview.md`**

Write this file:

```markdown
# 项目概览

## 项目定位

**灵创AI工具箱（LCAITool）** 是专注于垂直专业场景的精品 AI 工具集合平台，深耕细分场景，做深做透每一个工具，让用户在特定场景下获得开箱即用的专业级效果。

## 核心差异化优势

- **场景化**：针对具体场景深度优化，不是通用大模型的简单封装。
- **专业化**：每个工具都经过专业人员调试，输出质量达到商用标准。
- **可交付**：提供完整可下载的成果包，不只是在线预览。
- **可迭代**：支持基于历史成果持续优化，形成个人创作资产。
- **透明化**：按次按量计费，费用清晰可见，无订阅负担。

## 使用场景

项目围绕有声绘本、电商商品详情页、营销文案等专业工具展开，优先实现可直接交付的 AI 成果包，并支持后续迭代优化。
```

- [ ] **Step 2: Create `docs/project/roadmap.md`**

Write this file:

```markdown
# 项目路线图与功能范围

## P0 - 已完成（上线即有）

- [x] 完整首页设计（8个区块）、工具卡片、分类导航、搜索。
- [x] 完整工具详情页、效果演示、定价说明、评价展示。
- [x] 微信一键登录注册、个人实名认证。
- [x] 积分充值（微信/支付宝）、按次扣费、消费明细，统一在 `/pricing` 一站式完成。
- [x] AI有声绘本生成专家完整功能（表单模式），含 Mock 执行模式。
- [x] AI电商商品详情页生成器完整功能，Dify 平台对接。
- [x] AI营销文案大师完整功能，HTTP 回调驱动。
- [x] 成果列表、详情预览、打包下载（含文件服务 API）。
- [x] 构思工具列表、投票功能、查看全部。
- [x] 工具配置管理、用户管理、订单管理、基础数据看板。
- [x] 个人中心完整功能（侧边栏分组 + 4个内容区块 + 真实数据替换）。
- [x] 收藏管理（后端同步 + 乐观更新 + 独立收藏页面）。
- [x] 订单管理（时间筛选 + 统计卡片 + 详情弹窗 + CSV导出）。
- [x] SSE 实时进度推送（Redis Pub/Sub + progress/completed/error 事件）。
- [x] 通用进度更新 API（支持 Dify/外部平台 HTTP 回调）。
- [x] `retryTask` 任务重试机制（前后端完整实现）。
- [x] 本地文件存储服务（`storage/works/{task_id}/` 按任务隔离）。
- [x] 新增业务 API 端点：`/users/stats`、`/tools/recent`、`/payment/custom-recharge`、`/payment/orders`。
- [x] SSE 事件模型优化：独立 progress、completed、error 三条事件线，支持断线重连状态恢复，结构化进度信息。
- [x] 执行器架构扩展：支持本地逐步执行、Dify SSE 流式消费、外部 HTTP 回调驱动，Mock 执行模式完善。

## P1 - 已部分完成 / 开发中

- [x] 对话模式工具（通用对话界面 + 后端预留接口 `POST /api/v1/chat/`）。
- [x] 迭代创作基础能力（前端入口梳理 + 后端 `parent_id` / `task_id` 链路）。
- [x] 通用详情页 `usage_modes` 配置驱动（form/dialog Tab 切换）。
- [x] 每日签到功能（数据表设计 + 后端接口实现）。
- [ ] 工具评价、通用反馈、建议奖励机制（数据表设计完成，前端开发中）。
- [ ] 邀请机制（用户邀请表、奖励规则已设计，前端接入中）。
- [ ] 中英文切换支持（数据表字段设计完成，前端适配中）。

## P2 - 后续迭代（上线后 1-2 个月）

- [ ] 定时任务、批量生成。
- [ ] 工具定制咨询入口、私有化部署咨询。
- [ ] 开发者入驻初步方案、工具分账机制设计。
```

- [ ] **Step 3: Create `docs/project/reference-index.md`**

Write this file:

```markdown
# 项目参考资料索引

## 产品与技术文档

| 文档 | 说明 |
|---|---|
| `docs/灵创AI工具箱产品需求文档PRD.md` | 完整产品需求说明。 |
| `docs/灵创AI工具箱-技术方案文档-v1.1.md` | 技术架构与详细设计。 |
| `docs/design/` | 页面设计稿与 HTML 原型。 |

## Superpowers 文档

| 目录 | 说明 |
|---|---|
| `docs/superpowers/specs/` | 各模块设计文档。 |
| `docs/superpowers/plans/` | 各模块实施计划。 |
| `docs/superpowers/plans/MVP完整开发实施计划.md` | MVP 整体开发计划。 |

## 渐进式披露文档

| 文档 | 说明 |
|---|---|
| `docs/project/overview.md` | 项目定位、核心差异化、产品目标。 |
| `docs/project/roadmap.md` | MVP/P0/P1/P2 功能状态。 |
| `docs/development/tech-stack.md` | 技术栈、部署方式、目录结构。 |
| `docs/development/design-system.md` | 设计系统规范。 |
| `docs/development/coding-principles.md` | 开发原则和质量要求。 |
| `docs/development/agent-workflow.md` | 子代理、commit、Superpowers/gstack 协作规则。 |
| `docs/architecture/business-flows.md` | 核心业务流程。 |
| `docs/architecture/executor-patterns.md` | 执行器模式和标杆工具执行规范。 |
| `docs/architecture/security-and-performance.md` | 安全与性能要求。 |
```

- [ ] **Step 4: Verify project docs exist**

Run:

```bash
git status --short docs/project
```

Expected output includes:

```text
?? docs/project/
```

- [ ] **Step 5: Commit project docs**

Run:

```bash
git add docs/project/overview.md docs/project/roadmap.md docs/project/reference-index.md
git commit -m "docs: 拆分项目概览与路线图文档" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected: commit succeeds.

---

## Task 2: Create development documentation

**Files:**
- Create: `docs/development/tech-stack.md`
- Create: `docs/development/design-system.md`
- Create: `docs/development/coding-principles.md`
- Create: `docs/development/agent-workflow.md`
- Reference: `CLAUDE.md:18-138`, `CLAUDE.md:334-428`

- [ ] **Step 1: Create `docs/development/tech-stack.md`**

Write this file:

```markdown
# 技术栈与目录结构

## 前端技术栈

| 层级 | 技术选型 | 版本要求 |
|---|---|---|
| 用户端前端 | Next.js App Router | 14.x |
| 管理端前端 | React + Vite | 18.x / 5.x |
| UI 框架 | Tailwind CSS + shadcn/ui | 3.x |
| 状态管理 | Zustand | 4.x |

## 后端技术栈

| 层级 | 技术选型 | 版本要求 |
|---|---|---|
| 后端框架 | FastAPI | 0.100+ |
| 数据库 | PostgreSQL | 16.x |
| 缓存/队列 | Redis | 7.x |
| ORM | SQLAlchemy + Alembic | 2.x |
| 异步任务 | Celery | 5.x |

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
```

- [ ] **Step 2: Create `docs/development/design-system.md`**

Write this file:

```markdown
# 设计系统规范

## 色彩系统

| 用途 | 色值 | 说明 |
|---|---|---|
| 主色调 | `#1E3A5F` | 深蓝色，品牌主色。 |
| 主色调渐变 | `#2563EB` | 蓝色，强调和渐变。 |
| 强调色 | `#059669` → `#10B981` | 绿色渐变，主按钮、成功状态。 |
| 边框色 | `#E4E7EB` | 浅灰，卡片边框。 |
| 背景色 | `#F8FAFC` | 极浅蓝，悬浮背景。 |
| 文字色 | `#1F2937` | 深灰，主文字。 |

## 字体规范

- 首选字体：`DM Sans`。
- 备用字体：`system-ui, -apple-system, sans-serif`。
- 字体粗细：400（常规）、500（中等）、700（粗体）。

## 组件交互规范

```css
.card-hover {
    transition: all 0.25s ease-out;
}
.card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(30, 58, 95, 0.12);
}

.btn-primary {
    background: linear-gradient(135deg, #059669 0%, #10B981 100%);
}
.btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 25px rgba(5, 150, 105, 0.3);
}

.progress-fill {
    background: linear-gradient(90deg, #059669, #10B981);
}
```
```

- [ ] **Step 3: Create `docs/development/coding-principles.md`**

Write this file:

```markdown
# 开发原则

## 先设计后编码

- 功能开发前先对照 PRD 或相关设计文档确认需求边界。
- 技术方案确认后再动手编码。
- 不确定的地方及时沟通，不做假设。

## 最小可行原则

- 优先实现核心路径，边缘场景后置。
- 不做过度设计，不提前抽象。
- 每个功能完成后及时自测验证。

## 代码质量

- 遵循现有代码风格。
- 新增代码必须有注释，注释密度应匹配周边代码。
- 关键业务逻辑必须有单元测试。
- 数据库变更必须通过 Alembic migration。

## 安全第一

- 涉及用户数据的操作必须留痕。
- 支付相关代码必须双人 Review。
- 新增接口必须考虑权限控制。
- 涉及资金、扣费、支付回调的接口必须考虑幂等性。
```

- [ ] **Step 4: Create `docs/development/agent-workflow.md`**

Write this file:

```markdown
# Agent 工作流规范

## 子代理工作流规范

本项目所有子代理任务必须遵循以下规则。

### 禁止子代理自行执行 git commit

子代理（implementer）只负责写代码，不执行 `git commit`。

- 子代理完成工作后，只需要在报告中列出所有修改/创建的文件路径清单。
- git commit 操作统一由父代理（父会话）按任务批量执行。
- 原因：子代理隔离环境中的 git 操作可能静默失败，导致“报告说已提交，实际没提交”的不一致问题。

### 派遣子代理的标准 prompt 必须附加规则

父代理每次构造子代理 prompt 时，末尾必须加上这一行：

```text
⚠️ 重要规则：不要执行 git commit 命令！完成后只需要列出你修改/创建的所有文件路径，提交操作由父代理统一执行。
```

### 父代理提交责任

子代理完成实现后，父代理应：

1. 查看子代理列出的文件清单。
2. 运行必要验证。
3. `git add` 相关文件。
4. 按任务单独 `git commit`。
5. 向用户报告“已完成并提交”。

提交信息格式：

```text
feat: 实现 XXX (Task N)
```

## Superpowers + gstack 搭配配置

### Superpowers（思考与流程层）

负责所有 plan、brainstorm、debug、TDD、verify、code review。

触发方式：自动触发。

### gstack（执行与外部世界层）

负责浏览器操作、QA、ship、deploy、canary、安全审计。

触发方式：斜杠命令手动触发。

### 浏览器规则

- 使用 `/browse` 作为唯一浏览器入口。
- 禁止使用 `mcp__claude-in-chrome__*` 操作浏览器。

### 分工裁决

- 计划撰写 → Superpowers: writing-plans。
- 计划多视角审查 → gstack: `/autoplan`。
- 编码 → Superpowers: test-driven-development。
- 调试 → Superpowers: systematic-debugging。
- 真实环境验证 → gstack: `/qa`。
- 代码审查 → Superpowers: requesting-code-review。
- 发布 → gstack: `/ship`。
- 安全审计 → gstack: `/cso`。

可用技能以当前会话的 Available skills 为准，不在本文档中维护完整技能列表。
```

- [ ] **Step 5: Verify development docs exist**

Run:

```bash
git status --short docs/development
```

Expected output includes:

```text
?? docs/development/
```

- [ ] **Step 6: Commit development docs**

Run:

```bash
git add docs/development/tech-stack.md docs/development/design-system.md docs/development/coding-principles.md docs/development/agent-workflow.md
git commit -m "docs: 拆分开发规范文档" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected: commit succeeds.

---

## Task 3: Create architecture documentation

**Files:**
- Create: `docs/architecture/business-flows.md`
- Create: `docs/architecture/executor-patterns.md`
- Create: `docs/architecture/security-and-performance.md`
- Reference: `CLAUDE.md:142-290`

- [ ] **Step 1: Create `docs/architecture/business-flows.md`**

Write this file:

```markdown
# 核心业务流程

## 用户注册与认证流程

```text
微信一键登录：
  用户点击「微信登录」
    → 前端跳转微信 OAuth 授权页
    → 用户扫码确认
    → 微信回调 code 到后端
    → 后端换取 openid + access_token
    → 查询用户是否存在
      → 存在：生成 JWT，返回登录成功
      → 不存在：创建新用户，赠送体验积分
    → 前端存储 Token

实名认证：
  用户填写姓名 + 身份证号
    → 后端调用第三方实名核验 API
    → 核验通过：AES-256 加密存储身份证号
    → 标记 id_card_verified = true
    → 赠送认证奖励积分
```

## 工具使用完整链路

```text
用户使用工具流程：
  1. 用户进入工具详情页
     → 读取工具配置（Redis 缓存）
     → 展示费用说明和案例

  2. 用户填写参数/对话交互
     → 前端实时校验输入
     → 实时估算费用：base_fee + 资源费

  3. 点击「开始生成」
     → 检查用户积分余额 ≥ 预估费用
     → 检查实名认证状态
     → 创建 Task 记录（status=pending）
     → 预冻结积分
     → 提交任务到 Celery 队列
     → 返回 task_id，前端进入进度页

  4. 任务执行中
     → Worker 拉取任务，更新 status=running
     → 执行器分步执行，每步调用 update_progress
     → 实时写入 TaskLog
     → 调用 AI Provider API

  5. 任务完成
     → 计算实际费用（多退少不补）
     → 结算：解冻预冻结，扣取实际费用
     → 创建 Work 记录和 WorkFile 记录
     → 更新 Task 状态=completed
     → 触发站内通知（可选）

  6. 异常处理
     → AI 调用失败：自动重试 2 次 → 仍失败 → 标记 failed
     → 超时失败：status=timeout，全额退还积分
     → 用户主动取消：根据进度按比例扣费
```

## 支付与充值流程

```text
积分充值流程：
  用户选择充值档位
    → 创建 Order 记录（status=pending）
    → 调用微信支付统一下单 API
    → 返回 prepay_id 和支付参数
    → 前端唤起微信支付
    → 用户支付完成
    → 微信异步回调 notify_url
    → 后端验证签名，更新 order=paid
    → 发放积分 + 赠送积分
    → 记录交易流水
```

## 迭代创作流程

```text
基于已有成果继续优化：
  用户在成果详情页点击「继续优化」
    → 加载历史版本树（支持选择任意版本为父节点）
    → 展示历史输入参数和最终提示词
    → 用户输入修改需求
    → 系统合并上下文
    → 生成新的 prompt_text
    → 费用预估（迭代优惠：基础费 8 折）
    → 创建新 Task，parent_id 指向原 Work
    → 执行生成流程
    → 完成后生成新版本 Work（version+1）
    → 版本对比：自动生成差异说明
```
```

- [ ] **Step 2: Create `docs/architecture/executor-patterns.md`**

Write this file:

```markdown
# 执行器模式与标杆工具规范

## 执行器模式

项目支持三种执行模式：

1. **本地逐步执行**：由本地执行器分阶段调用 LLM、图片、音频、打包等能力。
2. **Dify SSE 流式消费**：由执行器消费 Dify 工作流 SSE 事件并同步任务进度。
3. **外部 HTTP 回调驱动**：任务提交后由外部平台通过 HTTP 回调更新进度和结果。

## 标杆工具 1：AI 有声绘本生成专家

| 阶段 | 进度 | 操作 | 费用计算 |
|---|---|---|---|
| 1. 故事生成 | 0-15% | LLM 根据主题生成完整故事大纲 + 分页故事文本 | 包含在基础费 |
| 2. 插画提示词生成 | 15-25% | 为每一页生成精准的绘画提示词 | 包含在基础费 |
| 3. 批量生成插图 | 25-60% | 并行调用图片生成 API，N 页同时生成 | image_fee × 页数 |
| 4. 语音合成 | 60-80% | 为每一页故事文本生成语音 narration | audio_fee × 页数 |
| 5. 排版与打包 | 80-95% | 生成统一封面、PDF 排版、打包 ZIP | 包含在基础费 |
| 6. 完成结算 | 100% | 计算总费用，生成预览，保存成果 | - |

## 标杆工具 2：AI 电商商品详情页生成器

- 基础费：12 积分。
- 图片费：1 积分/张。
- 输出：商品主图、详情页分段图片、营销文案、PSD 源文件。
- 执行模式：Dify 平台工作流（SSE 流式消费）。

## 标杆工具 3：AI 营销文案大师

- 基础费：8 积分。
- 输出：营销文案。
- 执行模式：Celery 转发 + 外部 HTTP 回调。
```

- [ ] **Step 3: Create `docs/architecture/security-and-performance.md`**

Write this file:

```markdown
# 安全与性能要求

## 数据安全

- 用户隐私信息：AES-256 加密存储。
- 身份证号：脱敏显示（仅显示前后 4 位）+ SHA-256 哈希去重。
- 数据库备份：每日全量备份 + 小时级增量备份。
- 操作日志：所有关键操作留存 6 个月，可审计。

## 接口安全

- 签名校验：所有接口请求签名校验。
- 限流策略：按 User + IP 双重限流。
- 防护：SQL 注入 / XSS / CSRF 防护。
- 幂等性：敏感接口（支付、扣费）加幂等性 Token。

## 资金安全

- 预冻结机制：扣费前预冻结，任务完成后结算。
- 异常检测：异常扣费自动检测和退款机制。
- 每日对账：财务数据每日对账校验。

## 性能指标

| 指标 | 目标值 |
|---|---|
| 首屏加载 | < 1.5 秒 (LCP) |
| 工具详情页 | < 2 秒 |
| API 响应 | 99% < 500ms |
| 并发用户 | 支持 2000 并发 |
| 搜索响应 | < 300ms |
```

- [ ] **Step 4: Verify architecture docs exist**

Run:

```bash
git status --short docs/architecture
```

Expected output includes:

```text
?? docs/architecture/
```

- [ ] **Step 5: Commit architecture docs**

Run:

```bash
git add docs/architecture/business-flows.md docs/architecture/executor-patterns.md docs/architecture/security-and-performance.md
git commit -m "docs: 拆分架构与业务流程文档" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected: commit succeeds.

---

## Task 4: Rewrite CLAUDE.md as the progressive disclosure entrypoint

**Files:**
- Modify: `CLAUDE.md`
- Reference: `docs/superpowers/specs/2026-06-04-claude-md-progressive-disclosure-design.md`

- [ ] **Step 1: Replace `CLAUDE.md` content**

Replace the whole file with:

```markdown
# 灵创AI工具箱（LCAITool）- Claude 工作入口

## 项目一句话

**灵创AI工具箱** 是专注于垂直专业场景的精品 AI 工具集合平台，深耕细分场景，提供可交付、可迭代的专业 AI 工具成果。

## 基础沟通规则

- 使用中文回复用户问题。
- 不确定需求边界时先沟通，不做假设。
- 功能开发前先对照 PRD、设计文档或相关专题文档确认边界。

## 渐进式披露原则

本文件是 Claude 工作入口，不是完整项目手册。

- 只有每次会话必须生效的强制行为规则进入本文件。
- 产品背景、技术栈、业务流程、安全规范、路线图等详细资料放入专题文档。
- Claude 应根据任务类型按需读取下方专题文档，避免默认加载全部背景资料。
- 后续新增规范时，优先判断应进入哪个专题文档；只有强制行为规则才加入本文件。

## 按需读取规则

- 涉及产品定位、业务边界、用户价值：读取 `docs/project/overview.md`。
- 涉及 MVP 范围、功能状态、后续路线：读取 `docs/project/roadmap.md`。
- 涉及技术栈、目录结构、部署：读取 `docs/development/tech-stack.md`。
- 涉及 UI 视觉、颜色、字体、组件交互：读取 `docs/development/design-system.md`。
- 涉及编码原则、测试、数据库迁移、安全编码：读取 `docs/development/coding-principles.md`。
- 涉及子代理、commit、Superpowers/gstack 协作：读取 `docs/development/agent-workflow.md`。
- 涉及认证、工具使用、支付、迭代创作流程：读取 `docs/architecture/business-flows.md`。
- 涉及执行器、任务队列、AI Provider、Dify、回调：读取 `docs/architecture/executor-patterns.md`。
- 涉及隐私、接口安全、资金安全、性能目标：读取 `docs/architecture/security-and-performance.md`。
- 查找完整 PRD、技术方案、设计稿、历史 plans/specs：读取 `docs/project/reference-index.md`。

## 高优先级开发原则

- 先设计后编码。
- 遵循现有代码风格。
- 优先实现核心路径，不做过度设计。
- 新增接口必须考虑权限控制。
- 涉及数据库变更必须通过 Alembic migration。
- 涉及用户数据、支付、资金和安全相关逻辑必须考虑审计、幂等和回滚。

## 子代理工作流规范（强制执行）

本项目所有子代理任务必须遵循以下规则。

### 禁止子代理自行执行 git commit

子代理只负责写代码，不执行 `git commit`。

- 子代理完成工作后，只需要在报告中列出所有修改/创建的文件路径清单。
- git commit 操作统一由父代理按任务批量执行。
- 原因：子代理隔离环境中的 git 操作可能静默失败，导致“报告说已提交，实际没提交”的不一致问题。

### 派遣子代理的标准 prompt 必须附加规则

父代理每次构造子代理 prompt 时，末尾必须加上这一行：

```text
⚠️ 重要规则：不要执行 git commit 命令！完成后只需要列出你修改/创建的所有文件路径，提交操作由父代理统一执行。
```

### 父代理提交责任

子代理完成实现后，父代理应：

1. 查看子代理列出的文件清单。
2. 运行必要验证。
3. `git add` 相关文件。
4. 按任务单独 `git commit`。
5. 向用户报告“已完成并提交”。

## Superpowers + gstack 搭配配置

### Superpowers（思考与流程层）

负责所有 plan、brainstorm、debug、TDD、verify、code review。

触发方式：自动触发。

### gstack（执行与外部世界层）

负责浏览器操作、QA、ship、deploy、canary、安全审计。

触发方式：斜杠命令手动触发。

### 浏览器规则

- 使用 `/browse` 作为唯一浏览器入口。
- 禁止使用 `mcp__claude-in-chrome__*` 操作浏览器。

### 分工裁决

- 计划撰写 → Superpowers: writing-plans。
- 计划多视角审查 → gstack: `/autoplan`。
- 编码 → Superpowers: test-driven-development。
- 调试 → Superpowers: systematic-debugging。
- 真实环境验证 → gstack: `/qa`。
- 代码审查 → Superpowers: requesting-code-review。
- 发布 → gstack: `/ship`。
- 安全审计 → gstack: `/cso`。

可用技能以当前会话的 Available skills 为准，不在本文件维护完整技能列表。

## 参考入口

- `docs/project/reference-index.md`：项目资料总索引。
- `docs/superpowers/specs/2026-06-04-claude-md-progressive-disclosure-design.md`：本文件渐进式披露重构设计。
- `docs/superpowers/plans/2026-06-04-claude-md-progressive-disclosure.md`：本文件渐进式披露重构实施计划。

**最后更新时间**：2026-06-04  
**文档版本**：V2.0
```

- [ ] **Step 2: Verify removed large sections from entrypoint**

Run:

```bash
grep -n "核心差异化优势\|技术栈规范\|核心业务流程规范\|MVP功能范围\|Available skills" CLAUDE.md || true
```

Expected: no output.

- [ ] **Step 3: Verify routing links are present**

Run:

```bash
grep -n "docs/project/overview.md\|docs/development/tech-stack.md\|docs/architecture/business-flows.md\|docs/project/reference-index.md" CLAUDE.md
```

Expected output includes all four paths.

- [ ] **Step 4: Commit entrypoint rewrite**

Run:

```bash
git add CLAUDE.md
git commit -m "docs: 精简 CLAUDE 工作入口" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected: commit succeeds.

---

## Task 5: Verify migration coverage and final state

**Files:**
- Inspect: `CLAUDE.md`
- Inspect: `docs/project/overview.md`
- Inspect: `docs/project/roadmap.md`
- Inspect: `docs/project/reference-index.md`
- Inspect: `docs/development/tech-stack.md`
- Inspect: `docs/development/design-system.md`
- Inspect: `docs/development/coding-principles.md`
- Inspect: `docs/development/agent-workflow.md`
- Inspect: `docs/architecture/business-flows.md`
- Inspect: `docs/architecture/executor-patterns.md`
- Inspect: `docs/architecture/security-and-performance.md`

- [ ] **Step 1: Check working tree**

Run:

```bash
git status --short
```

Expected: no unstaged or uncommitted files related to this plan.

- [ ] **Step 2: Confirm `CLAUDE.md` is shorter than before**

Run:

```bash
wc -l CLAUDE.md
```

Expected: approximately 120-180 lines.

- [ ] **Step 3: Confirm all target docs exist**

Run:

```bash
for f in \
  docs/project/overview.md \
  docs/project/roadmap.md \
  docs/project/reference-index.md \
  docs/development/tech-stack.md \
  docs/development/design-system.md \
  docs/development/coding-principles.md \
  docs/development/agent-workflow.md \
  docs/architecture/business-flows.md \
  docs/architecture/executor-patterns.md \
  docs/architecture/security-and-performance.md; do
  test -f "$f" && printf "OK %s\n" "$f" || printf "MISSING %s\n" "$f"
done
```

Expected: every line starts with `OK`.

- [ ] **Step 4: Confirm no placeholder text exists**

Run:

```bash
grep -RIn "TBD\|TODO\|待定\|占位" CLAUDE.md docs/project docs/development docs/architecture || true
```

Expected: no output.

- [ ] **Step 5: Confirm topic coverage**

Run:

```bash
grep -RIn "场景化\|Next.js\|Docker Compose\|微信一键登录\|AI有声绘本\|AES-256\|首屏加载\|Superpowers" docs/project docs/development docs/architecture CLAUDE.md
```

Expected output includes matches showing each migrated topic exists in either `CLAUDE.md` or a dedicated topic document.

- [ ] **Step 6: Final report**

Report to the user:

```text
已完成 CLAUDE.md 渐进式披露重构：
- CLAUDE.md 已缩减为 Claude 工作入口。
- 项目、开发、架构资料已拆分到 docs/project、docs/development、docs/architecture。
- 已验证所有目标文档存在，且无 TBD/TODO/待定/占位文本。
- 已按任务分批提交。
```

No commit is needed in this task if previous tasks already committed all changes and `git status --short` is clean.

---

## Self-Review

### Spec coverage

- Spec 要求 `CLAUDE.md` 只保留高优先级规则：Task 4 覆盖。
- Spec 要求新增 `docs/project/`、`docs/development/`、`docs/architecture/`：Tasks 1-3 覆盖。
- Spec 要求按需读取路由：Task 4 Step 1-3 覆盖。
- Spec 要求避免信息丢失：Tasks 1-3 迁移主要内容，Task 5 Step 5 验证关键主题。
- Spec 要求防止再次膨胀：Task 4 写入“渐进式披露原则”。

### Placeholder scan

本计划未使用 TBD、TODO、待定、占位，也没有“类似 Task N”一类省略步骤。

### Consistency check

所有路径与设计文档一致。提交信息均包含 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。执行阶段应按 Task 1-4 分批提交，Task 5 只做最终验证。