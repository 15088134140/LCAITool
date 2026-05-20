# MVP完整开发实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## 📋 项目当前状态

**已完成模块（阶段1）：**
- ✅ 用户系统模型（User模型）
- ✅ 积分系统API（points.py）
- ✅ 用户端前端页面骨架（Next.js 14）- 20+页面已创建
- ✅ 管理端前端基础框架（React + Vite）- 登录、用户管理、Dashboard等
- ✅ 登录登出功能（两端都已实现）
- ✅ 测试框架配置（SQLite内存数据库）

**设计系统规范：**
- 🎨 `docs/design/*.html` - 共12个设计稿，必须严格遵循
- 🛠️ **设计稿缺失处理**：无对应设计稿的页面，**强制使用 ui-ux-pro-max 技能**完成UI/UX设计与实现
- 🎯 必须保持与整体设计系统一致（深蓝主色调 #1E3A5F、绿色渐变按钮、卡片悬停效果等）

---

## 🎯 计划目标

完成灵创AI工具箱MVP所有P0级功能开发，实现：
- 后端完整数据模型（共17张表）
- 核心业务服务层
- AI工具执行引擎（2个标杆工具）
- 支付与积分系统
- 用户端前端功能完善（严格按设计稿）
- 管理端核心功能
- 完整测试覆盖（单元测试 + E2E有头模式）

---

## 🔧 技术栈

| 层级 | 技术 | 版本 |
|------|-----|------|
| **后端框架** | FastAPI + SQLAlchemy 2.0 | 0.100+ |
| **数据库** | PostgreSQL + Alembic | 16.x |
| **缓存/队列** | Redis + Celery | 7.x / 5.x |
| **用户端** | Next.js 14 + Tailwind + shadcn/ui | 14.x |
| **管理端** | React 18 + Vite + Tailwind | 18.x / 5.x |
| **测试** | pytest + Playwright（有头模式）| |

---

## 📦 MVP范围调整（按审查建议）

### ✅ P0必须完成（MVP包含）
1. **数据模型层** - 17张表
2. **核心业务服务** - 工具、任务、成果、支付服务
3. **AI执行引擎** - 2个标杆工具（有声绘本、电商详情页）
4. **异步任务+SSE** - Celery + Redis Pub/Sub实时推送
5. **API端点** - 工具、任务、支付、构思投票
6. **用户端前端** - 所有页面功能完善（严格按设计稿）
7. **管理端** - 简化MVP版本（工具、用户、订单管理）
8. **构思工具与投票** - 完整功能

### ⏳ P1后续迭代（V1.1）
- 深度性能优化
- 完整安全审计
- 高级管理功能（对账、内容审核详细）

---

## 📋 任务清单（共24个任务）

---

## 第一部分：基础架构与数据模型

### Task 0: Alembic数据库迁移初始化

**Files:**
- Create: `apps/backend/alembic.ini`
- Create: `apps/backend/alembic/` 目录

- [ ] **Step 1: 初始化Alembic迁移环境**
  ```bash
  cd apps/backend && alembic init alembic
  ```
- [ ] **Step 2: 配置数据库连接与自动导入模型**
- [ ] **Step 3: 生成首次迁移脚本（用户系统表）**
- [ ] **Step 4: 执行首次迁移验证**
- [ ] **Step 5: 提交代码**

---

### Task 0.1: 全局异常处理与统一响应格式

**Files:**
- Create: `apps/backend/app/core/response.py`
- Create: `apps/backend/app/core/exceptions.py`
- Modify: `apps/backend/app/main.py`

- [ ] **Step 1: 实现统一响应格式包装器（SuccessResponse/ErrorResponse）**
- [ ] **Step 2: 实现全局异常处理器（BusinessException/ValidationException/Exception）**
- [ ] **Step 3: 实现幂等性Token检查中间件**
- [ ] **Step 4: 在main.py中注册全局处理器**
- [ ] **Step 5: 提交代码**

---

### Task 1: 工具相关数据模型（新增5张表）

**Files:**
- Create: `apps/backend/app/models/tool.py`
- Modify: `apps/backend/app/models/__init__.py`
- Test: `apps/backend/tests/unit/models/test_tool_models.py`

- [ ] **Step 1: 编写工具主表 (tools) 模型**
- [ ] **Step 2: 编写工具分类表 (tool_categories) 模型**
- [ ] **Step 3: 编写工具收藏表 (tool_favorites) 模型**
- [ ] **Step 4: 编写工具评价表 (tool_ratings) 模型**
- [ ] **Step 5: 编写工具演示案例表 (tool_demos) 模型**
- [ ] **Step 6: 更新`__init__.py`导出所有模型**
- [ ] **Step 7: 生成并执行Alembic迁移**
- [ ] **Step 8: 运行单元测试验证**
- [ ] **Step 9: 提交代码**

**参考代码结构：**
```python
# 关键字段说明
Tool: id, slug, name, description, short_desc, cover_image, category, tags,
      base_fee, image_fee, audio_fee, token_fee, config(JSONB), status,
      use_count, favorite_count, rating_count, rating_avg, created_at

ToolCategory: id, slug, name, icon, description, sort_order, tool_count,
              is_active, is_featured, parent_id(自引用), created_at, updated_at

ToolFavorite: id, user_id, tool_id, created_at

ToolRating: id, user_id, tool_id, task_id(唯一), rating, content, images,
            is_useful_count, status, admin_reply, replied_at, created_at, updated_at

ToolDemo: id, tool_id, title, description, cover_image, demo_type, demo_images,
          input_params(JSONB), result_sample(JSONB), sort_order, is_active,
          created_by, created_at, updated_at
```

---

### Task 2: 任务与成果相关数据模型（新增5张表）

**Files:**
- Create: `apps/backend/app/models/task.py`
- Modify: `apps/backend/app/models/__init__.py`
- Test: `apps/backend/tests/unit/models/test_task_models.py`

- [ ] **Step 1: 编写任务表 (tasks) 模型**
- [ ] **Step 2: 编写任务日志表 (task_logs) 模型**
- [ ] **Step 3: 编写成果表 (works) 模型**
- [ ] **Step 4: 编写成果文件表 (work_files) 模型**
- [ ] **Step 5: 编写成果分享表 (work_shares) 模型**
- [ ] **Step 6: 更新`__init__.py`导出**
- [ ] **Step 7: 生成并执行Alembic迁移**
- [ ] **Step 8: 运行单元测试验证**
- [ ] **Step 9: 提交代码**

**关键字段说明：**
- tasks: 增加`snapshot_data(JSONB)`字段用于断点续跑
- task_logs: level(debug/info/warn/error), message, details(JSONB)
- works: parent_id(自引用用于迭代版本), version号
- work_files: file_type, file_url, file_size, page_number
- work_shares: view_count, like_count, share_count, status(pending/approved/rejected)

---

### Task 3: 支付与积分数据模型（新增3张表）

**Files:**
- Create: `apps/backend/app/models/payment.py`
- Modify: `apps/backend/app/models/__init__.py`
- Test: `apps/backend/tests/unit/models/test_payment_models.py`

- [ ] **Step 1: 编写订单表 (orders) 模型**
- [ ] **Step 2: 编写充值档位配置表 (recharge_packages) 模型**
- [ ] **Step 3: 编写积分交易表 (point_transactions) 模型**
- [ ] **Step 4: 更新`__init__.py`导出**
- [ ] **Step 5: 生成并执行Alembic迁移**
- [ ] **Step 6: 运行单元测试验证**
- [ ] **Step 7: 提交代码**

**关键字段说明：**
- orders: order_no(唯一), third_party_order_no, pay_amount, base_points,
         bonus_points, total_points, payment_provider, status, paid_at,
         expired_at, client_ip, device_info, callback_raw(JSONB),
         reconciliation_status, reconciled_at
- point_transactions: 增加idempotency_key字段用于幂等控制

---

### Task 4: 系统扩展表模型（新增4张表）

**Files:**
- Create: `apps/backend/app/models/system.py`
- Modify: `apps/backend/app/models/__init__.py`
- Test: `apps/backend/tests/unit/models/test_system_models.py`

- [ ] **Step 1: 实名认证记录表 (real_name_verifications) 模型**
- [ ] **Step 2: 创意提交表 (idea_submissions) 模型**
- [ ] **Step 3: 构思工具投票表 (idea_votes) 模型**
- [ ] **Step 4: 管理后台操作审计日志表 (admin_audit_logs) 模型**
- [ ] **Step 5: 更新`__init__.py`导出**
- [ ] **Step 6: 生成并执行Alembic迁移**
- [ ] **Step 7: 运行单元测试验证**
- [ ] **Step 8: 提交代码**

---

## 第二部分：后端核心业务服务层

### Task 5: 工具管理服务

**Files:**
- Create: `apps/backend/app/services/tool_service.py`
- Create: `apps/backend/app/schemas/tool.py`
- Modify: `apps/backend/app/services/__init__.py`
- Test: `apps/backend/tests/unit/services/test_tool_service.py`

- [ ] **Step 1: 编写Pydantic Schemas（Create/Update/Response）**
- [ ] **Step 2: 实现工具CRUD基础方法（含分页、搜索、分类筛选）**
- [ ] **Step 3: 实现工具收藏/取消收藏方法（原子操作）**
- [ ] **Step 4: 实现用户收藏列表方法**
- [ ] **Step 5: 实现工具评价与评价列表方法**
- [ ] **Step 6: 实现分类管理与演示案例管理方法**
- [ ] **Step 7: 实现Redis缓存装饰器（热点数据缓存）**
- [ ] **Step 8: 运行单元测试**
- [ ] **Step 9: 提交代码**

---

### Task 6: 任务执行服务（含预冻结与结算）

**Files:**
- Create: `apps/backend/app/services/task_service.py`
- Create: `apps/backend/app/schemas/task.py`
- Modify: `apps/backend/app/services/__init__.py`
- Test: `apps/backend/tests/unit/services/test_task_service.py`

- [ ] **Step 1: 编写Pydantic Schemas**
- [ ] **Step 2: 实现任务创建与积分预冻结逻辑（原子事务）**
- [ ] **Step 3: 实现任务状态更新与进度追踪方法**
- [ ] **Step 4: 实现任务完成结算与多退少补逻辑**
- [ ] **Step 5: 实现任务取消与异常处理（自动退款）**
- [ ] **Step 6: 实现任务日志添加与查询方法**
- [ ] **Step 7: 实现执行快照保存与恢复（断点续跑）**
- [ ] **Step 8: 运行单元测试**
- [ ] **Step 9: 提交代码**

---

### Task 7: 成果管理服务

**Files:**
- Create: `apps/backend/app/services/work_service.py`
- Create: `apps/backend/app/schemas/work.py`
- Modify: `apps/backend/app/services/__init__.py`
- Test: `apps/backend/tests/unit/services/test_work_service.py`

- [ ] **Step 1: 编写Pydantic Schemas**
- [ ] **Step 2: 实现成果创建与文件关联方法**
- [ ] **Step 3: 实现成果列表（分页）与详情查询方法**
- [ ] **Step 4: 实现成果分享与公开设置方法**
- [ ] **Step 5: 实现迭代创作与版本管理方法（基于父版本创建新版本）**
- [ ] **Step 6: 实现成果文件下载权限检查**
- [ ] **Step 7: 运行单元测试**
- [ ] **Step 8: 提交代码**

---

### Task 8: 支付服务（模拟支付）

**Files:**
- Create: `apps/backend/app/services/payment_service.py`
- Create: `apps/backend/app/schemas/payment.py`
- Modify: `apps/backend/app/services/__init__.py`
- Test: `apps/backend/tests/unit/services/test_payment_service.py`

> 💡 **模拟支付模式**：MVP阶段暂不接入真实微信支付，用户调用支付接口即视为支付成功，自动发放积分。

- [ ] **Step 1: 编写Pydantic Schemas**
- [ ] **Step 2: 实现订单创建与模拟支付逻辑**
  - 前端调用创建订单接口 → 后端生成订单记录（status=pending）
  - 调用"发起支付"接口 → **直接标记为支付成功**，无需跳转第三方
  - 支付成功后自动发放积分、更新订单状态
- [ ] **Step 3: 实现模拟支付回调处理（内部模拟，无需验签）**
- [ ] **Step 4: 实现订单查询与状态同步方法**
- [ ] **Step 5: 实现充值档位管理方法**
- [ ] **Step 6: 实现消费记录查询方法**
- [ ] **Step 7: 预留真实支付SDK接入扩展点（便于后续切换）**
- [ ] **Step 8: 运行单元测试**
- [ ] **Step 9: 提交代码**

---

### Task 9: 构思工具与投票服务

**Files:**
- Create: `apps/backend/app/services/idea_service.py`
- Create: `apps/backend/app/schemas/idea.py`
- Modify: `apps/backend/app/services/__init__.py`
- Test: `apps/backend/tests/unit/services/test_idea_service.py`

- [ ] **Step 1: 编写Pydantic Schemas**
- [ ] **Step 2: 实现创意提交方法**
- [ ] **Step 3: 实现构思列表（分页 + 排序）方法**
- [ ] **Step 4: 实现投票方法（仅实名认证用户可投，防重复投票）**
- [ ] **Step 5: 实现构思详情方法**
- [ ] **Step 6: 运行单元测试**
- [ ] **Step 7: 提交代码**

---

## 第三部分：AI提供商与工具执行器

### Task 10: AI提供商抽象基类与实现

**Files:**
- Create: `apps/backend/app/providers/ai/__init__.py`
- Create: `apps/backend/app/providers/ai/base.py`
- Create: `apps/backend/app/providers/ai/doubao.py` （火山方舟-豆包）
- Create: `apps/backend/app/providers/ai/dify.py` （Dify工作流）
- Test: `apps/backend/tests/unit/providers/test_ai_providers.py`

- [ ] **Step 1: 实现AIResponse数据类与抽象基类BaseAIProvider**
  - generate_text(prompt, system_prompt, **kwargs)
  - generate_image(prompt, size, **kwargs)
  - generate_audio(text, voice, **kwargs)
  - generate_video(prompt, duration, **kwargs)
- [ ] **Step 2: 实现火山方舟（豆包）提供商（文本 + 语音）**
- [ ] **Step 3: 实现Dify工作流提供商（调用Dify API）**
- [ ] **Step 4: 实现提供商工厂类（根据工具配置动态选择）**
- [ ] **Step 5: 运行单元测试（使用Mock API）**
- [ ] **Step 6: 提交代码**

---

### Task 11: 工具执行器 - 有声绘本（标杆工具1）

**Files:**
- Create: `apps/backend/app/executors/__init__.py`
- Create: `apps/backend/app/executors/base.py`
- Create: `apps/backend/app/executors/storybook.py`
- Create: `apps/backend/app/utils/pdf_generator.py`
- Test: `apps/backend/tests/unit/executors/test_storybook_executor.py`

- [ ] **Step 1: 实现执行器抽象基类BaseToolExecutor**
  - `__init__(task_id, db)`
  - `estimate_cost(params) -> int`
  - `execute() -> Dict[str, Any]`
  - `update_progress(percent, message)`
  - `add_log(level, message, details)`
- [ ] **Step 2: 实现故事大纲生成步骤**
- [ ] **Step 3: 实现分页故事文本生成步骤**
- [ ] **Step 4: 实现插画提示词生成步骤**
- [ ] **Step 5: 实现批量图片生成（并行 + 限流）**
- [ ] **Step 6: 实现语音合成步骤**
- [ ] **Step 7: 实现PDF排版与打包生成**
- [ ] **Step 8: 实现执行快照保存（每步完成后保存状态）**
- [ ] **Step 9: 运行单元测试**
- [ ] **Step 10: 提交代码**

---

### Task 12: 工具执行器 - 电商详情页（标杆工具2）

**Files:**
- Create: `apps/backend/app/executors/ecommerce.py`
- Test: `apps/backend/tests/unit/executors/test_ecommerce_executor.py`

- [ ] **Step 1: 实现电商商品文案生成（标题 + 卖点 + 详情文案）**
- [ ] **Step 2: 实现商品主图生成（多风格可选）**
- [ ] **Step 3: 实现详情页分段图片生成（3-5张分段图）**
- [ ] **Step 4: 实现PSD源文件打包（使用psd-tools3）**
- [ ] **Step 5: 实现费用预估方法**
- [ ] **Step 6: 运行单元测试**
- [ ] **Step 7: 提交代码**

---

## 第四部分：Celery异步任务与SSE实时通信

### Task 13: Celery Worker配置与任务定义

**Files:**
- Create: `apps/backend/app/workers/__init__.py`
- Create: `apps/backend/app/workers/celery_app.py`
- Create: `apps/backend/app/workers/tasks.py`
- Test: `apps/backend/tests/integration/test_celery_tasks.py`

- [ ] **Step 1: 配置Celery应用与Redis连接**
- [ ] **Step 2: 配置多队列优先级（fast/medium/heavy）**
- [ ] **Step 3: 配置任务超时与重试机制**
- [ ] **Step 4: 实现通用工具执行任务函数（根据工具类型选择执行器）**
- [ ] **Step 5: 实现任务状态变化时Redis Pub/Sub推送**
- [ ] **Step 6: 实现失败任务自动重试（最多3次，指数退避）**
- [ ] **Step 7: 运行集成测试**
- [ ] **Step 8: 提交代码**

---

### Task 14: SSE实时通信端点（Redis Pub/Sub版）

**Files:**
- Create: `apps/backend/app/api/v1/endpoints/stream.py`
- Modify: `apps/backend/app/api/v1/__init__.py`
- Test: `apps/backend/tests/integration/test_sse_stream.py`

> 🔧 **按审查建议优化**：改用Redis Pub/Sub主动推送，替代轮询方案

- [ ] **Step 1: 实现Redis订阅监听器**
- [ ] **Step 2: 实现SSE事件生成器（订阅Redis频道）**
- [ ] **Step 3: 实现单个任务SSE流端点**
- [ ] **Step 4: 实现批量任务状态快照端点（重连时调用）**
- [ ] **Step 5: 实现断线重连后消息补发机制**
- [ ] **Step 6: 实现客户端连接管理与心跳检测**
- [ ] **Step 7: 运行集成测试**
- [ ] **Step 8: 提交代码**

---

## 第五部分：后端API端点完整实现

### Task 15: 工具相关API端点

**Files:**
- Create: `apps/backend/app/api/v1/endpoints/tools.py`
- Modify: `apps/backend/app/api/v1/api.py`
- Test: `apps/backend/tests/api/test_tools_api.py`

- [ ] **Step 1: 实现工具列表API（分页 + 分类筛选 + 搜索）**
- [ ] **Step 2: 实现工具详情API（含演示案例）**
- [ ] **Step 3: 实现工具收藏/取消收藏API**
- [ ] **Step 4: 实现用户收藏列表API**
- [ ] **Step 5: 实现工具评价API**
- [ ] **Step 6: 实现工具分类列表API**
- [ ] **Step 7: 实现演示案例列表API**
- [ ] **Step 8: 运行API测试**
- [ ] **Step 9: 提交代码**

---

### Task 16: 任务与成果API端点

**Files:**
- Create: `apps/backend/app/api/v1/endpoints/tasks.py`
- Create: `apps/backend/app/api/v1/endpoints/works.py`
- Modify: `apps/backend/app/api/v1/api.py`
- Test: `apps/backend/tests/api/test_tasks_api.py`

- [ ] **Step 1: 实现任务创建API（开始生成）**
- [ ] **Step 2: 实现任务状态查询API**
- [ ] **Step 3: 实现任务取消API**
- [ ] **Step 4: 实现任务日志查询API**
- [ ] **Step 5: 实现成果列表API（分页）**
- [ ] **Step 6: 实现成果详情与下载API**
- [ ] **Step 7: 实现成果分享与公开设置API**
- [ ] **Step 8: 实现迭代创作API（基于已有成果创建新版本）**
- [ ] **Step 9: 运行API测试**
- [ ] **Step 10: 提交代码**

---

### Task 17: 支付与充值API端点

**Files:**
- Create: `apps/backend/app/api/v1/endpoints/payment.py`
- Modify: `apps/backend/app/api/v1/api.py`
- Test: `apps/backend/tests/api/test_payment_api.py`

> 💡 **模拟支付模式**：无需真实支付网关，调用支付接口即成功。

- [ ] **Step 1: 实现充值档位查询API**
- [ ] **Step 2: 实现订单创建API**
- [ ] **Step 3: 实现模拟支付接口（调用即成功，自动发积分）**
- [ ] **Step 4: 实现订单状态查询API**
- [ ] **Step 5: 实现消费记录API**
- [ ] **Step 6: 在接口返回中注明"模拟支付测试环境"提示**
- [ ] **Step 7: 运行API测试**
- [ ] **Step 8: 提交代码**

---

### Task 18: 构思工具与投票API端点

**Files:**
- Create: `apps/backend/app/api/v1/endpoints/ideas.py`
- Modify: `apps/backend/app/api/v1/api.py`
- Test: `apps/backend/tests/api/test_ideas_api.py`

- [ ] **Step 1: 实现创意提交API**
- [ ] **Step 2: 实现构思列表API（分页 + 按票数排序）**
- [ ] **Step 3: 实现投票API（仅实名认证用户）**
- [ ] **Step 4: 实现构思详情API**
- [ ] **Step 5: 运行API测试**
- [ ] **Step 6: 提交代码**

---

## 第六部分：用户端前端功能完善（严格按设计稿）

> 🎨 **设计稿参考**：`docs/design/*.html` - 共12个设计稿
>
> 🛠️ **设计稿缺失处理规则**：如果遇到 `docs/design/*.html` 中没有对应设计稿的页面，**必须使用 `ui-ux-pro-max` 技能**完成页面的UI/UX设计与实现，确保与整体设计系统（深蓝主色调、渐变按钮、卡片悬停效果等）保持一致。

### Task 19: API Client与状态管理

**Files:**
- Create: `apps/frontend-user/src/lib/api/client.ts`
- Create: `apps/frontend-user/src/lib/api/modules/*.ts`
- Create: `apps/frontend-user/src/store/userStore.ts`
- Create: `apps/frontend-user/src/hooks/useSSE.ts`

- [ ] **Step 1: 基于openapi-typescript生成类型定义**
- [ ] **Step 2: 实现Axios实例封装（拦截器 + Token管理）**
- [ ] **Step 3: 实现各模块API Client（user, tool, task, work, payment, idea）**
- [ ] **Step 4: 实现Zustand用户状态管理（登录状态、用户信息、积分）**
- [ ] **Step 5: 实现useSSE Hook（带自动重连 + 断线重连状态恢复）**
- [ ] **Step 6: 提交代码**

---

### Task 20: 首页与工具市场页面

**Files:**
- Modify: `apps/frontend-user/src/app/page.tsx`
- Modify: `apps/frontend-user/src/app/tools/page.tsx`
- Modify: `apps/frontend-user/src/app/tools/[id]/page.tsx`
- Create: `apps/frontend-user/src/components/tool/ToolCard.tsx`
- Create: `apps/frontend-user/src/components/tool/ToolCategoryNav.tsx`
- **设计稿参考**：`docs/design/index.html`, `docs/design/tools.html`, `docs/design/tool-detail.html`

- [ ] **Step 1: 实现首页Hero区块（严格按设计稿样式）**
- [ ] **Step 2: 实现工具分类导航组件（样式 + 交互）**
- [ ] **Step 3: 实现工具卡片组件（封面、标题、简介、价格、使用次数）**
- [ ] **Step 4: 实现工具列表页面（筛选、搜索、排序功能）**
- [ ] **Step 5: 实现工具详情页面（演示案例Tab、费用说明Tab、评价Tab）**
- [ ] **Step 6: 实现收藏按钮与交互**
- [ ] **Step 7: 提交代码**

---

### Task 21: 用户认证与个人中心

**Files:**
- Modify: `apps/frontend-user/src/app/login/page.tsx`
- Modify: `apps/frontend-user/src/app/user-center/page.tsx`
- Modify: `apps/frontend-user/src/app/user-center/profile/page.tsx`
- Modify: `apps/frontend-user/src/app/user-center/verification/page.tsx`
- **设计稿参考**：`docs/design/login.html`, `docs/design/user-center.html`, `docs/design/verification.html`

- [ ] **Step 1: 优化微信登录页面（样式 + 按钮交互）**
- [ ] **Step 2: 实现个人中心首页（用户信息卡片、快捷入口、统计数据）**
- [ ] **Step 3: 实现个人资料编辑页面**
- [ ] **Step 4: 实现实名认证表单页面（身份证上传 + 人脸核验引导）**
- [ ] **Step 5: 提交代码**

---

### Task 22: 积分充值与消费记录

**Files:**
- Modify: `apps/frontend-user/src/app/user-center/points/page.tsx`
- Modify: `apps/frontend-user/src/app/payment/page.tsx`
- Modify: `apps/frontend-user/src/app/orders/page.tsx`
- Create: `apps/frontend-user/src/components/payment/RechargePackageCard.tsx`
- **设计稿参考**：`docs/design/pricing.html`, `docs/design/orders.html`

- [ ] **Step 1: 实现充值档位展示卡片（热门标记、价格、点数）**
- [ ] **Step 2: 实现充值页面（档位选择 + 模拟支付按钮）**
- [ ] **Step 3: 实现支付结果页面（成功/失败状态展示）**
- [ ] **Step 4: 页面显示"模拟支付测试环境"提示标识**
- [ ] **Step 5: 实现消费记录列表（分页 + 类型筛选）**
- [ ] **Step 6: 提交代码**

---

### Task 23: 工具执行、进度页面与成果管理

**Files:**
- Create: `apps/frontend-user/src/app/works/[taskId]/progress/page.tsx`
- Create: `apps/frontend-user/src/app/works/page.tsx`
- Create: `apps/frontend-user/src/app/works/[id]/page.tsx`
- Create: `apps/frontend-user/src/components/task/ProgressBar.tsx`
- Create: `apps/frontend-user/src/components/work/WorkCard.tsx`

> 🛠️ **注意**：进度页面、成果列表/详情页没有对应设计稿，**必须使用 ui-ux-pro-max 技能**完成设计与实现，保持与整体设计系统一致。

- [ ] **Step 1: 实现进度条组件（带动画 + 步骤状态）**
- [ ] **Step 2: 实现任务执行进度页面（实时状态更新 + 日志展示）**
- [ ] **Step 3: 实现完成后自动跳转逻辑**
- [ ] **Step 4: 实现我的成果列表页面（卡片展示 + 筛选）**
- [ ] **Step 5: 实现成果详情页面（图片预览 + 打包下载 + 分享）**
- [ ] **Step 6: 实现迭代创作功能入口**
- [ ] **Step 7: 提交代码**

---

### Task 24: 构思工具与投票页面

**Files:**
- Modify: `apps/frontend-user/src/app/ideas/page.tsx`
- Modify: `apps/frontend-user/src/app/ideas/submit/page.tsx`
- Create: `apps/frontend-user/src/components/idea/IdeaCard.tsx`
- **设计稿参考**：`docs/design/vote.html`（构思列表页）
- **设计缺失处理**：创意提交页面（submit）无对应设计稿，**必须使用 ui-ux-pro-max 技能**完成设计与实现。

- [ ] **Step 1: 实现构思卡片组件（标题、描述、票数、投票按钮）**
- [ ] **Step 2: 实现构思列表页面（按票数排序 + 分页）**
- [ ] **Step 3: 实现投票功能（仅认证用户可见按钮 + 投票后动画）**
- [ ] **Step 4: 实现创意提交表单页面**
- [ ] **Step 5: 提交代码**

---

## 第七部分：管理端前端功能完善

### Task 25: 仪表盘与布局优化

**Files:**
- Modify: `apps/frontend-admin/src/pages/Dashboard.tsx`
- Modify: `apps/frontend-admin/src/components/Layout.tsx`

- [ ] **Step 1: 优化侧边栏导航（增加菜单分组与图标）**
- [ ] **Step 2: 优化顶部Header（用户信息、退出登录、通知图标）**
- [ ] **Step 3: 实现仪表盘统计卡片（用户数、任务数、收入、工具调用）**
- [ ] **Step 4: 实现数据趋势图表（ECharts折线图）**
- [ ] **Step 5: 提交代码**

---

### Task 26: 工具管理模块

**Files:**
- Create: `apps/frontend-admin/src/pages/tools/index.tsx`
- Create: `apps/frontend-admin/src/pages/tools/[id]/edit.tsx`
- Create: `apps/frontend-admin/src/pages/tools/create.tsx`

- [ ] **Step 1: 实现工具列表表格（搜索、筛选、分页）**
- [ ] **Step 2: 实现工具编辑表单（含图片上传、价格配置）**
- [ ] **Step 3: 实现工具创建表单**
- [ ] **Step 4: 实现演示案例管理（增删改排序）**
- [ ] **Step 5: 实现上下架操作按钮**
- [ ] **Step 6: 提交代码**

---

### Task 27: 用户与订单管理模块

**Files:**
- Modify: `apps/frontend-admin/src/pages/UserManagement.tsx`
- Create: `apps/frontend-admin/src/pages/users/[id]/page.tsx`
- Create: `apps/frontend-admin/src/pages/orders/index.tsx`
- Create: `apps/frontend-admin/src/pages/orders/[id]/page.tsx`

- [ ] **Step 1: 优化用户列表表格（增加筛选与搜索）**
- [ ] **Step 2: 实现用户详情页面**
- [ ] **Step 3: 实现用户禁用/启用操作**
- [ ] **Step 4: 实现积分调整功能（弹窗表单）**
- [ ] **Step 5: 实现实名认证审核功能**
- [ ] **Step 6: 实现订单列表（筛选、搜索、分页）**
- [ ] **Step 7: 实现订单详情与人工退款功能**
- [ ] **Step 8: 提交代码**

---

## 第八部分：完整测试与集成验证

### Task 28: 后端单元测试完善

**测试文件目录：** `apps/backend/tests/`

- [ ] **Step 1: 完善所有模型单元测试（字段验证、关系验证）**
- [ ] **Step 2: 完善所有服务层单元测试（使用Mock）**
- [ ] **Step 3: 完善所有API端点集成测试**
- [ ] **Step 4: 运行所有测试并修复问题**
- [ ] **Step 5: 生成测试覆盖率报告（目标 > 80%）**
- [ ] **Step 6: 提交代码**

---

### Task 29: E2E端到端集成测试（有头模式）

**Files:**
- Create: `apps/backend/tests/e2e/conftest.py`
- Create: `apps/backend/tests/e2e/test_user_flow.py`
- Create: `apps/backend/tests/e2e/test_tool_execution_flow.py`
- Create: `apps/backend/tests/e2e/test_payment_flow.py`
- **截图保存目录：** `apps/backend/tests/e2e/screenshots/`

> 🖥️ **按要求使用有头模式**：Playwright配置为headless=False，可直观看到浏览器交互

- [ ] **Step 1: 配置Playwright测试环境（有头模式 + 慢速模式便于观察）**
- [ ] **Step 2: 配置测试数据库与Redis测试实例**
- [ ] **Step 3: 编写用户注册登录流程E2E测试**
  - 访问首页 → 点击登录 → 输入凭证 → 登录成功 → 验证用户信息显示
  - 每步自动截图保存到screenshots目录
- [ ] **Step 4: 编写工具浏览与执行E2E测试**
  - 进入工具列表 → 选择有声绘本 → 填写参数 → 开始生成 → 观察进度 → 完成后查看成果
  - 每步自动截图保存
- [ ] **Step 5: 编写支付充值E2E测试（模拟支付流程）**
- [ ] **Step 6: 编写成果管理E2E测试（查看、下载、分享、迭代）**
- [ ] **Step 7: 运行所有E2E测试（有头模式，可观察交互效果）**
- [ ] **Step 8: 提交代码与测试截图**

---

## ✅ MVP功能完成清单（P0级）

| 功能模块 | 完成状态 | 说明 |
|---------|---------|------|
| 完整首页设计 | - | 严格按设计稿实现 |
| 工具市场页面 | - | 分类、筛选、搜索 |
| 工具详情页 | - | 演示案例、费用说明、评价 |
| 微信一键登录 | ✅ | 阶段1已完成 |
| 个人实名认证 | - | 身份证核验、状态管理 |
| 积分充值系统 | - | 微信支付、按次扣费、消费明细 |
| AI有声绘本生成 | - | 表单模式、完整6步执行流程、断点续跑 |
| AI电商详情页生成 | - | 文案、图片、PSD打包 |
| 成果列表与详情 | - | 预览、打包下载、分享、迭代 |
| 构思工具列表与投票 | - | **保留在MVP** - 创意提交、投票 |
| 工具配置管理 | - | 管理端工具CRUD |
| 用户管理 | - | 管理端用户管理、积分调整、实名审核 |
| 订单管理 | - | 管理端订单查询、退款 |
| 基础数据看板 | - | 管理端统计仪表盘 |

---

## 📚 参考文档

1. `docs/design/*.html` - **前端设计稿（必须严格遵循）**
2. `docs/灵创AI工具箱产品需求文档PRD.md` - 完整产品需求
3. `docs/灵创AI工具箱-技术方案文档-v1.1.md` - 技术架构设计
4. `docs/阶段1-核心用户系统-完成总结.md` - 阶段1成果参考
5. `CLAUDE.md` - 项目开发规范与设计系统

---

## 🎯 开发计划时间线

| 阶段 | 预计时间 | 包含任务 |
|------|---------|---------|
| **阶段2：数据模型与基础架构** | 3天 | Task 0 - Task 4 |
| **阶段3：核心业务服务层** | 4天 | Task 5 - Task 9 |
| **阶段4：AI执行引擎** | 3天 | Task 10 - Task 12 |
| **阶段5：异步任务与API层** | 3天 | Task 13 - Task 18 |
| **阶段6：用户端前端完善** | 5天 | Task 19 - Task 24 |
| **阶段7：管理端前端完善** | 3天 | Task 25 - Task 27 |
| **阶段8：测试与集成验证** | 3天 | Task 28 - Task 29 |
| **总计** | **24天** | 29个任务 |

---

## 🚀 下一个行动

使用 `superpowers:subagent-driven-development` 按任务并行执行开发。建议启动顺序：
1. 先启动数据模型相关任务（Task 0-4）
2. 模型完成后启动服务层任务（Task 5-9）
3. 后端进行的同时可并行启动前端任务（Task 19-27）
4. 最后统一进行测试与集成
