# 工具详情与工具使用 — 需求调整设计方案

| 版本 | 日期 | 状态 |
|------|------|------|
| V1.0 | 2026-05-22 | 设计稿（待审批） |

---

## 1. 背景与目标

当前工具详情页和工具使用页面存在以下问题：
- 通用 `/tools/[id]/` 详情页只做信息展示，**缺少使用表单**
- 只有 3 个硬编码路由的工具页面带有完整使用表单，其他工具无法使用
- `ToolCreationForm` 是一个 804 行的巨型组件，通过 switch-case 承载三种表单逻辑
- 对话模式 UI 占位但功能不完整

本次调整目标：
1. 建立明确的"定制页 vs 通用页"路由规则
2. 将定制页表单逻辑从 ToolCreationForm 中拆出
3. 通用详情页根据 `usage_modes` 配置渲染使用区
4. 通用对话模式（前端完整 + 后端预留）

---

## 2. 数据模型改动

### tools 表新增字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `usage_modes` | `VARCHAR[]` | `['form']` | 使用模式，可选值 `form`、`dialog` |

- `slug` 字段（已有）：URL 友好标识，**有值 → 需创建定制页面；无值 → 走通用详情页**

### API 响应变化

`GET /tools/:id` 和 `GET /tools` 响应体中新增 `usage_modes` 字段。

### 种子数据初始化

| 工具 | slug | usage_modes |
|---|---|---|
| AI 有声绘本生成器 | `storybook-generator` | `['form']` |
| 电商商品详情页 | `ecommerce-detail` | `['form']` |
| 营销文案生成器 | `marketing-copywriter` | `['form']` |
| 其他所有工具 | NULL | `['form']` |

---

## 3. 路由规则

### 3.1 链接生成逻辑

```
工具表.slug 有值 → 链接到 /tools/<slug>/（定制页面）
工具表.slug 无值 → 链接到 /tools/<uuid>/（通用详情页）
```

### 3.2 页面解析逻辑

```
/tools/<slug>/ → 静态路由优先匹配 → 有定制文件则渲染，否则 404
/tools/<uuid>/ → 降级到 [id]/page.tsx → 通用详情页
```

### 3.3 通用详情页 UUID 校验

`[id]/page.tsx` 对 `params.id` 做 UUID 格式校验：
- 是 UUID 格式 → 正常加载工具数据
- 不是 UUID 格式 → 返回 404 友好提示

---

## 4. 定制页面组织方式

### 4.1 目录结构

```
frontend-user/src/app/tools/
├── [id]/page.tsx                         # 通用详情页
├── page.tsx                               # 工具列表页
├── storybook-generator/                   # 定制页：有声绘本
│   ├── page.tsx
│   └── components/
│       └── StorybookForm.tsx              # 从 ToolCreationForm 拆出
├── ecommerce-detail/                      # 定制页：电商详情
│   ├── page.tsx
│   └── components/
│       └── EcommerceForm.tsx              # 从 ToolCreationForm 拆出
└── marketing-copywriter/                  # 定制页：营销文案
    ├── page.tsx
    └── components/
        └── MarketingForm.tsx              # 从 ToolCreationForm 拆出
```

### 4.2 定制页规范

- 每个定制页 `page.tsx` **全权控制自己的布局**
- 可引用 `components/tool-detail/` 下的公共组件（ToolHero、ToolPricing 等）
- 也可完全自建（适合特殊交互的工具）
- 提交生成统一调用 `taskApi.createTask`，走标准任务系统
- 定制页**不应该引用 ToolCreationForm**

### 4.3 组件职责划分

```
components/tool-detail/        ← 公共组件（通用页 + 定制页可共用）
├── ToolHero.tsx               工具头部
├── ToolTabs.tsx               标签页容器
├── ToolFeatures.tsx           功能介绍（静态）
├── ToolHowTo.tsx              使用流程（静态）
├── ToolPricing.tsx            定价说明
├── ToolReviews.tsx            用户评价
├── ToolDemos.tsx              演示案例
├── FavoriteButton.tsx         收藏按钮
└── ToolCreationForm.tsx       仅服务 [id] 通用页

tools/<slug>/components/       ← 私有组件（仅该定制页使用）
├── StorybookForm.tsx          有声绘本专属表单
├── EcommerceForm.tsx          电商详情页专属表单
└── MarketingForm.tsx          营销文案专属表单
```

### 4.4 ToolCreationForm 改造

当前：804 行，switch-case 承载三种表单逻辑 + 对话模式占位

改造后：
- **三种表单逻辑拆出**，各自放入定制页目录下的表单组件
- **ToolCreationForm 本身**：清空为通用页的容器
  - `usage_modes` 含 `form` → 显示"该工具正在开发中，敬请期待"
  - `usage_modes` 含 `dialog` → 渲染通用对话界面
  - 两者都有 → Tab 切换
  - 空数组 → 同 `["form"]`

---

## 5. 通用详情页 [id] 改造

### 5.1 页面布局

```
[id]/page.tsx:
├── ToolHero（工具头部信息区）
├── ToolTabs（Demo / Pricing / Reviews）
├── ── 使用区（标题："开始创作"）──
│    ├── usage_modes=["form"]      → "开发中，敬请期待"
│    ├── usage_modes=["dialog"]    → 通用对话界面
│    ├── usage_modes=["form","dialog"] → Tab 切换
│    └── usage_modes=[]            → 同 ["form"]
├── 底部余额/充值引导
```

### 5.2 通用对话界面（前端完整实现）

对话界面不依赖工具特定配置，交互流程：

```
1. AI 助手发送欢迎消息，引导用户描述需求
2. 用户输入需求
3. AI 助手多轮对话，收集关键参数
4. 实时汇总已确认的需求参数（侧边栏/底部面板）
5. 用户点击「确认需求，开始生成」
6. 调用 taskApi.createTask，跳转进度页
```

前端实现内容：
- 完整的对话 UI（气泡消息、输入框、发送按钮）
- 需求汇总面板（展示已收集的参数）
- 「确认需求，开始生成」按钮
- 调用标准 taskApi.createTask

### 5.3 API 预留

`POST /api/v1/chat/` 对话接口（后端占位）：

```
请求: { tool_id, messages: [...], session_id? }
响应: { reply: "mock 回复", collected_params: {}, session_id }

当前行为：返回固定 mock 响应
后续：接入 AI 对话逻辑
```

---

## 6. 管理端改动

### 工具编辑页新增「使用模式」复选框组

```
使用模式:
☑ 表单模式 (form)
☐ 对话模式 (dialog)
```

- 至少勾选一个
- 保存时写入 `tools.usage_modes` 字段
- 字段为空数组时，默认视为 `['form']`

---

## 7. 全流程验收发现的问题（有声绘本链路）

对有声绘本标杆工具进行完整链路审查后，发现以下问题需要在本次改造中一并解决：

### 7.1 前端→后端参数不匹配

| 前端发送字段 | 后端期望字段 | 问题 |
|---|---|---|
| `"storyTitle"` | `"theme"` | 字段名不一致，后端读不到主题 |
| `"storyContent"` | 无对应 | 后端不接收完整文案输入 |
| `"artStyle"` | `"art_style"` | 字段名不一致（camelCase vs snake_case） |
| `"pageCount"` | `"page_count"` | 字段名不一致 |
| `"voiceType"` | 无对应 | 后端不接收音色选择 |
| 无 | `"target_age"` | **前端缺少**目标年龄段字段 |
| 无 | `"include_audio"` | 前端未发送是否含音频标记，依赖 voiceType 推断 |

### 7.2 风格值不匹配

| 前端可选风格 | 后端 art_style 期望值 |
|---|---|
| `cartoon`（卡通水彩） | ✅ `cartoon` |
| `oil`（梦幻油画） | ✅ `oil` |
| `japanese`（日系动漫） | ❌ 后端不认识，降级到 `watercolor` |
| `flat`（扁平插画） | ❌ 后端不认识，降级到 `watercolor` |

### 7.3 后端费用硬编码

`StorybookExecutor` 内部硬编码费用常量不与 tools 表同步：
```python
BASE_FEE = 20        # DB 中可能为 8
IMAGE_FEE_PER_PAGE = 2  # DB 中可能为 1
AUDIO_FEE_PER_PAGE = 1  # DB 中可能为 0.5
```
`estimate_cost()` 方法使用硬编码值，不读取工具表配置。

### 7.4 成果记录使用本地路径

`_create_work_record()` 将 `file_url` 设为本地临时路径（如 `/tmp/storybook_img_1_xxx.png`），后续前端无法通过这些 URL 展示或下载文件。

### 7.5 `retryTask` 前后端均未实现

进度页 `works/[id]/progress/page.tsx` 第 148 行调用 `taskApi.retryTask(taskId)`，但：
- 前端 `lib/api/modules/task.ts` 未导出 `retryTask` 方法
- 后端没有 `POST /tasks/{id}/retry` 接口

### 7.6 电商工具对接 Dify 平台（执行模式差异）

有声绘本执行器在本地逐步执行（LLM → 图片 → 音频 → 打包），每一步由 executor 自行调用 `update_progress()`。

电商商品详情页生成器不同：执行流程由 **Dify 平台工作流** 掌控，我们的服务端只是 Dify 的客户端。

> 电商工具将作为 **Dify 集成模板** — 代码结构、Dify 事件解析、输出映射全部规范化为可复用的参考实现，后续其他 Dify 工具可直接仿照。

**方案：Celery Worker 消费 Dify SSE 流**

现有 `EcommerceExecutor`（615 行）当前是本地执行器（直接调 doubao AI provider），需**全面重构**为 Dify 客户端：

```
EcommerceExecutor（重构后）
  → 调用 Dify Workflow Run API（response_mode=streaming）
  → 逐行读取 Dify SSE 事件流
  → 解析每个节点事件（node_started / node_finished / workflow_finished）
  → 映射为结构化 ProgressEvent，调 update_progress()
  → 工作流结束 → 提取 outputs → 创建成果记录

Dify SSE 事件 → update_progress(ProgressEvent) → TaskService.update_task_status()
                                                   → 自动写 TaskLog（进度时间线）
                                                   → Redis PubSub → SSE → 前端实时更新
```

执行器示例（与 Task 13 ProgressEvent 结构一致）：
```python
# Dify 节点 → 本地步骤映射配置
DIFY_STEP_MAP = {
    "generate_description": {"step": 0, "name": "商品文案", "weight": 20},
    "generate_main_image":  {"step": 1, "name": "商品主图", "weight": 25},
    "generate_detail_image":{"step": 2, "name": "详情分段图", "weight": 25},
    "generate_psd":         {"step": 3, "name": "PSD 源文件", "weight": 20},
    "package":              {"step": 4, "name": "打包交付", "weight": 10},
}

class EcommerceExecutor(BaseToolExecutor):
    async def execute(self, params):
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", DIFY_WORKFLOW_URL, json={
                "inputs": params,
                "response_mode": "streaming",
                "user": str(self.task_id)
            }) as resp:
                async for line in resp.aiter_lines():
                    event = parse_dify_sse_event(line)
                    if event["type"] == "node_started":
                        step = DIFY_STEP_MAP.get(event["node_name"])
                        await self.update_progress(
                            percent=calculate_progress(step, event),
                            message=f"开始{step['name']}...",
                            step_index=step["step"],
                            total_steps=len(DIFY_STEP_MAP),
                            step_status="running"
                        )
                    elif event["type"] == "node_finished":
                        step = DIFY_STEP_MAP.get(event["node_name"])
                        await self.update_progress(
                            percent=calculate_progress(step, event),
                            message=f"{step['name']}完成",
                            step_index=step["step"],
                            total_steps=len(DIFY_STEP_MAP),
                            step_status="completed"
                        )
                    elif event["type"] == "workflow_finished":
                        # 从 Dify outputs 解析文件，写入持久化存储
                        files = await self._save_dify_outputs(event["data"]["outputs"])
                        return await self._create_work_record(files)
```

### 7.7 通用 HTTP 进度更新接口

任何第三方平台（Dify / 自研服务 / 调试工具）可通过 HTTP 接口主动汇报任务进度。

```
POST /api/v1/tasks/{task_id}/progress

请求体:
{
  "progress": 45,          // 0-100 整数
  "message": "正在生成商品主图...",
  "data": { "node": "image_generation" },  // 可选附加数据
  "completed": false,      // 可选，是否标记为完成并触发结算
  "actual_cost": null      // 可选，completed=true 时的实际费用。null=使用预估费用
}

completed=true 时的后端逻辑:
  → actual_cost = actual_cost ?? task.estimated_cost
  → TaskService.complete_task(task_id, actual_cost)
    → 差额 = 冻结金额 - actual_cost
    → 差额>0 ? 退还差额 : 差额<0 ? 补扣差额
    → status = completed, progress = 100
    → 写入交易流水
  → Redis pubsub → SSE → 前端跳转成果页

鉴权:
  - 内网: X-Internal-Token header（第三方平台用）
  - 外网: 用户 Bearer Token（调试用）
```

调试示例：
```bash
# 仅更新进度
curl -X POST https://api.lingchuang.ai/api/v1/tasks/{task_id}/progress \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"progress": 60, "message": "生成商品主图中..."}'

# 标记完成并触发结算（不传 actual_cost，默认=预估费用）
curl -X POST https://api.lingchuang.ai/api/v1/tasks/{task_id}/progress \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"progress": 100, "message": "生成完成", "completed": true}'

# 标记完成并指定实际费用（外部平台知道实际用量时）
curl -X POST https://api.lingchuang.ai/api/v1/tasks/{task_id}/progress \
  -H "X-Internal-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"progress": 100, "message": "生成完成", "completed": true, "actual_cost": 8}'
```

### 7.8 SSE 事件数据契约与完成判定

#### 结构化进度数据

每次进度更新携带结构化字段，不再只是一对 `(percent, message)`：

```python
class ProgressEvent:
    percent: int           # 0-100 总进度
    message: str           # 当前步骤描述
    step_index: int        # 当前步骤索引 (0-based)
    total_steps: int       # 总步骤数
    step_status: str       # running | completed | pending
    sub_progress: Optional[str]  # 如 "3/10" 表子进度
```

#### SSE 事件类型定义

SSE 推送三条不同事件线，不再混用：

```
# 进度更新（可多次）
event: progress
data: {"percent": 45, "message": "正在生成插图...", "step_index": 2, "total_steps": 4, "step_status": "running", "sub_progress": "3/10"}

# 完成结算（终端事件，仅一次）
event: completed
data: {"task_id": "uuid", "status": "completed", "work_id": "uuid", "message": "绘本生成完成"}

# 执行失败（终端事件，仅一次）
event: error
data: {"task_id": "uuid", "status": "failed", "message": "图片生成失败: 余额不足"}
```

终端事件（`completed` / `error`）发出后 SSE 连接关闭。

#### 前端监听逻辑

```typescript
// 实时路径：SSE 事件驱动
sse.addEventListener("progress", (e) => updateProgressModal(JSON.parse(e.data)));
sse.addEventListener("completed", (e) => {
  const { work_id } = JSON.parse(e.data);
  window.location.href = `/works/detail/${work_id}`;
});
sse.addEventListener("error", (e) => showError(JSON.parse(e.data).message));
```

#### 页面刷新 / 重连恢复

SSE 断开后，前端通过 REST API 恢复状态：

```
1. GET /tasks/{id}          → task.status + task.progress + task.work_id   → 判定是否完成
2. GET /tasks/{id}/logs?level=progress  → TaskLog[] 按时间排序           → 恢复进度时间线
```

前端判定逻辑：

```
if task.status === "completed" → 跳转成果页
if task.status === "failed"    → 显示错误页面
if task.status === "running"   → 用 TaskLog 重建进度弹窗，重新连接 SSE
if task.status === "pending"   → 等待执行
```

同一条 `update_progress()` 路径同时写 DB 和推 Redis pubsub，SSE 和 REST 看到的是同一份数据，不会不一致。

### 7.9 营销文案工具 — HTTP 回调驱动模式

营销文案生成器演示第三种模式：**Celery 转发 + 外部 HTTP 回调**。

```
前端点击生成 → POST /tasks → Celery 队列
                                ↓
                MarketingWorker 接收到任务
                    → 调用外部平台 API（传递参数）
                    → 关闭退出（任务已交给外部）
                                ↓
            外部平台处理中 → POST /tasks/{id}/progress → 更新进度
                                ↓
            外部平台完成 → POST /tasks/{id}/progress + completed:true → 结算
```

模拟真实的外部平台异步回调流程：
- Celery Worker 只负责**转交任务**，不执行具体逻辑
- 外部平台通过 `POST /tasks/{id}/progress` 驱动进度和完成
- 前端看到完整的进度弹窗 + SSE 实时推送

适用于：
- 模拟调用非 Dify 第三方平台（如自研服务、私有化部署）
- 给开发者调试 HTTP 进度 API + SSE 推送 + 进度时间线
- 给用户展示进度弹窗效果，无需真实 AI 执行

### 7.10 积分结算流程（三种场景）

所有工具统一走**预冻结 → 结算**流程，差异仅在于 `actual_cost` 的计算方式：

```
创建任务 → executor.estimate_cost() → 预冻结 estimated_cost 积分
                     ↓
               执行阶段（三种模式）
                     ↓
         complete_task(actual_cost) → 差额 = 冻结金额 - actual_cost
                                      差价多退少补
```

| 场景 | `estimate_cost()` 依据 | `actual_cost` 计算方式 |
|------|----------------------|----------------------|
| **故事书** | 从 `tool.pricing` 读取 base_fee + image_fee_per_page + audio_fee_per_page，按表单参数计算 | Executor 按实际产出的页数/图片数/音频数精确计算 |
| **电商(Dify)** | 从 `tool.pricing` 读取 base_fee + image_fee_per_image，按表单参数计算 | Dify 工作流完成后，按实际产出的图片数量计算 |
| **营销(HTTP)** | 从 `tool.pricing` 读取固定 base_fee | 外部平台在 `POST /tasks/{id}/progress` 中传入 `actual_cost`，不传则默认等于 `estimated_cost`（多不退少不补） |

### 7.11 执行器中不存在的 Service 方法调用修复

审查发现 `storybook.py` 和 `ecommerce.py` 中调用了 `TaskService` 上不存在的方法，本次修复：

| 错误的调用 | 正确的调用 | 涉及文件 |
|-----------|-----------|---------|
| `TaskService.create_work(db, work_in)` | `WorkService.create_work(db, work_in)` | `executors/storybook.py`, `executors/ecommerce.py` |
| `TaskService.create_work_file(db, file_in)` | `db.add(WorkFile(**file_in.model_dump())) + await db.commit()` | `executors/storybook.py`, `executors/ecommerce.py` |
| `TaskService.get_task(db, task_id)` | `TaskService.get_by_id(db, task_id)` | `executors/storybook.py`, `executors/ecommerce.py`, `executors/base.py` |

同时需要在 `storybook.py` 和 `ecommerce.py` 中添加 `from app.models.task import WorkFile` 导入。

---

## 8. 工作拆解

### 第一阶段：标杆工具链路修复（前后端）

| # | 任务 | 涉及文件 | 说明 |
|---|------|---------|------|
| 1 | 对齐前端表单字段名与后端期望 | `ToolCreationForm.tsx`（拆出前）| `storyTitle`→`theme`, `artStyle`→`art_style`, `pageCount`→`page_count` 等 |
| 2 | 前端表单新增 target_age 字段 | `ToolCreationForm.tsx`（拆出前）| 目标年龄段选择器（3-6 / 6-9 / 9-12岁） |
| 3 | 对齐风格值 | `ToolCreationForm.tsx`（拆出前）| 前端风格选项值改为与后端一致 |
| 4 | 后端费用改为从 tools 表读取 | `executors/storybook.py` | `estimate_cost()` 与 `complete_task()` 使用 `tool.pricing` |
| 5 | 实现本地持久化存储目录 | `executors/base.py`, `config.py` | `./storage/works/{task_id}/` 目录，按 images/audio/pdf/zip 分类存放 |
| 6 | StorybookExecutor 改用持久化目录 | `executors/storybook.py` | `_create_dummy_image/audio`、`_generate_pdf_and_zip` 写入持久化目录 |
| 7 | 成果文件 URL 改为相对路径 | `executors/storybook.py`, `schemas/work.py` | file_url 存相对路径（如 `images/page_1.png`），前端通过文件服务接口访问 |
| 8 | EcommerceExecutor 重构为 Dify 客户端 | `executors/ecommerce.py` | 全面重写：调用 Dify streaming API 替代本地 AI provider，按 DIFY_STEP_MAP 映射进度事件，解析 outputs 写入持久化存储 |
| 4 | 后端费用改为从 tools 表读取（含电商） | `executors/storybook.py`, `executors/ecommerce.py` | `estimate_cost()` 使用 `tool.pricing` 替代硬编码；电商费用统一在此处理（原单独 Task 已合并） |
| 5 | 实现本地持久化存储目录 | `executors/base.py`, `config.py` | `./storage/works/{task_id}/` 目录，按 images/audio/pdf/zip 分类存放 |
| 6 | StorybookExecutor 改用持久化目录 | `executors/storybook.py` | `_create_dummy_image/audio`、`_generate_pdf_and_zip` 写入持久化目录 |
| 7 | 成果文件 URL 改为相对路径（含 import 修复） | `executors/storybook.py`, `schemas/work.py` | file_url 存相对路径；修复 `TaskService.create_work` → `WorkService.create_work` + 添加 `WorkFile` 模型导入（原 Task 13 合并至此）|
| 8 | EcommerceExecutor 重构为 Dify 客户端 | `executors/ecommerce.py` | 全面重写：调用 Dify streaming API，映射进度事件，持久化存储（原 Task 10 合并至此）|
| 11 | 实现 retryTask 前后端 | `taskApi`, `tasks.py` | 前端导出 retryTask，后端实现 `POST /tasks/{id}/retry` |
| 12 | 文件服务 API 端点 | `backend/app/api/v1/endpoints/files.py` | `GET /api/v1/files/{work_file_id}` 从本地存储读取文件流，支持图片预览和 ZIP 下载 |
| 14 | 前端下载功能实现 | `works/detail/[id]/page.tsx` | 替换 `alert()` 为真实下载逻辑，支持单文件下载 +「下载全部」打包 ZIP |
| 15 | 通用进度更新 API | `endpoints/tasks.py` | `POST /tasks/{task_id}/progress`，支持第三方 HTTP 回调更新进度 + 触发 SSE |
| 16 | 进度数据结构化 + 自动写日志 | `executors/base.py`, `task_service.py` | `ProgressEvent` 含 step_index/step_status/sub_progress；`update_progress` 自动写 `TaskLog` |
| 16b | BaseExecutor 添加 Mock 执行模式 | `executors/base.py` | `MOCK_AI_EXECUTION=true` 时触发 `_mock_execute()`，模拟 7 步进度、创建真实 Work/WorkFile，无需外部 AI API |
| 17 | SSE 事件模型升级 | SSE push module | 定义 `progress` / `completed` / `error` 三种事件类型，携带结构化数据 |
| 18 | 进度弹窗组件 ProgressModal | `components/tool-detail/ProgressModal.tsx` | 匹配设计稿 tool-detail.html 的弹窗：步骤指示器/子进度/图标切换/小贴士/取消按钮 |
| 19 | 营销文案 Celery Worker 转发 + HTTP 回调接入 | `executors/marketing.py`, `task_service.py` | Celery Worker 接收任务后转交外部平台，不对接 AI provider；外部平台通过 `POST /tasks/{id}/progress` 驱动进度和完成 |

第一阶段任务 5-7 的本地存储目录结构：

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

### 第二阶段：数据层 + 路由（后端 + 少量前端）

| # | 任务 | 涉及文件 |
|---|------|---------|
| 20 | tools 表新增 usage_modes 字段，创建 migration | `backend/alembic/` |
| 21 | 后端 Tool schema 更新，API 响应包含 usage_modes | `schemas/tool.py`, `tool_service.py` |
| 22 | 管理端工具编辑页新增复选框 | `frontend-admin/` |
| 23 | 种子数据更新 | `backend/` seed 脚本 |
| 24 | 前端工具链接生成逻辑改用 slug | 工具列表、ToolCard、搜索 |

### 第三阶段：定制页表单拆分（前端）

| # | 任务 | 涉及文件 |
|---|------|---------|
| 25 | 将 StorybookForm 从 ToolCreationForm 拆出 | `tools/storybook-generator/components/StorybookForm.tsx` |
| 26 | 将 EcommerceForm 从 ToolCreationForm 拆出 | `tools/ecommerce-detail/components/EcommerceForm.tsx` |
| 27 | 将 MarketingForm 从 ToolCreationForm 拆出 | `tools/marketing-copywriter/components/MarketingForm.tsx` |
| 28 | 三个定制页 page.tsx 改为引用自己的表单组件 | 三个 `page.tsx` |
| 29 | ToolCreationForm 清空，改为 usage_modes 驱动的容器 | `ToolCreationForm.tsx` |

### 第四阶段：通用详情页 + 对话模式（前端 + 后端预留）

| # | 任务 | 涉及文件 |
|---|------|---------|
| 30 | 通用详情页 [id] 接入 ToolCreationForm | `[id]/page.tsx` |
| 31 | 通用对话界面 UI 实现 | `components/tool-detail/DialogMode.tsx` |
| 32 | 后端 POST /api/v1/chat/ 预留接口 | `backend/app/api/v1/endpoints/chat.py` |
| 33 | 前端 chatApi 模块（调用后端 mock） | `lib/api/modules/chat.ts` |
| 33b | 前端类型同步 — types.ts 新增 usage_modes / work_id | `lib/api/types.ts` | 补充 `Tool.usage_modes`、`Task.work_id` 等缺失的前端类型 |

### 第五阶段：测试（单元测试 + API 集成测试 + E2E）

> Phase 5A（Task 34-36）可在 Phase 1-4 开发过程中并行执行；Phase 5B（Task 37-43）必须在 Phase 1-4 + Task 33b 全部完成后执行。

#### 5A：单元测试 + API 集成测试

| # | 任务 | 涉及文件 | 说明 |
|---|------|---------|------|
| 34 | 后端执行器费用计算单元测试 | `tests/unit/test_executor_pricing.py` | 验证 `estimate_cost()` 按 tools 表配置正确计算费用 |
| 35 | 后端进度更新 + 结算逻辑单元测试 | `tests/unit/test_progress_settlement.py` | 验证 `update_progress` / `complete_task` 的结算逻辑（多退少补） |
| 36 | 后端关键 API 集成测试 | `tests/api/test_task_files_api.py` | retry / progress / files 三个 API 端点的集成测试 |

#### 5B：E2E 测试（slug 路由 + 表单渲染 + 重试 + 管理端编辑 + Mock AI 执行 + 文件下载）

| # | 任务 | 涉及文件 | 说明 |
|---|------|---------|------|
| 37 | E2E — slug 路由导航 + 通用详情页表单渲染 | `tests/e2e/` | 验证 slug 路由与 UUID 降级、通用页表单渲染（含原 Task 38 表单提交验证）|
| 38 | E2E — 任务失败重试流程 | `tests/e2e/` | 验证 `retryTask` 前后端联动 |
| 39 | E2E — 管理端工具编辑 usage_modes | `tests/e2e/` | 管理端编辑 usage_modes 复选框 |
| 40 | E2E — 管理端配置变更在用户端生效 | `tests/e2e/` | 管理端编辑 → 用户端正确反映（联动验证）|
| 41 | E2E — Mock AI 完整执行链路（观察进度 0→100%） | `tests/e2e/` | `MOCK_AI_EXECUTION=true` 下完整执行链路，验证 7 步进度、结算、成果创建 |
| 42 | E2E — 成果文件下载验证 | `tests/e2e/` | 验证文件服务 API 返回正确内容类型和文件内容 |
| 43 | 全局 E2E 门禁 | - | 六项 E2E 测试全部顺序执行，任何失败阻断发布 |

---

## 9. 未纳入本次范围

- 对话模式的后端 AI 逻辑（后续接入）
- 通用表单的配置驱动渲染（后续完善）
- 迭代创作上下文预填（已有存根，后续完善）
- 音频播放器、分享等既有占位/存根（已有独立 issue）
