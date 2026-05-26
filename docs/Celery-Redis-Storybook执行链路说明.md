# Celery、Redis 与 Storybook 执行链路说明

本文以 AI 有声绘本生成专家 `storybook-generator` 为例，说明当前项目中 Celery、Redis、FastAPI、PostgreSQL、SSE 之间的协作方式。

## 1. 总体职责划分

当前项目中，Redis 同时承担三类职责：

1. **Celery Broker**：FastAPI 将异步任务投递到 Redis，Celery Worker 从 Redis 队列中取任务执行。
2. **Celery Result Backend**：Celery 执行结果暂存在 Redis 中，当前配置为 1 小时过期。
3. **实时进度 Pub/Sub 通道**：Worker 在执行过程中将任务进度发布到 Redis 频道，SSE 接口订阅该频道并推送给前端。

PostgreSQL 则是任务状态、任务日志、成果记录、文件记录和积分结算的最终数据来源。

```text
前端点击“开始生成”
    ↓
FastAPI POST /api/v1/tasks
    ↓
PostgreSQL 创建 Task，状态 pending，预冻结积分
    ↓
execute_tool_task.delay(...)
    ↓
Redis 作为 Celery Broker 接收任务消息
    ↓
Celery Worker 从 Redis 队列取出任务
    ↓
执行 StorybookExecutor
    ↓
每一步：
  - 更新 PostgreSQL task.progress / task_logs
  - publish 进度到 Redis Pub/Sub
    ↓
FastAPI SSE 端点订阅 Redis 频道
    ↓
前端 EventSource 实时收到 progress / completed / failed
```

## 2. Celery 与 Redis 的配置关系

Celery 应用在 `apps/backend/app/workers/celery_app.py` 中初始化：

```python
celery_app = Celery(
    'lca_itool_workers',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)
```

也就是说，Celery 的任务队列和结果后端都使用同一个 `REDIS_URL`。

队列设计分为三类：

| 队列 | 用途 | 示例 |
| --- | --- | --- |
| `fast` | 文本类、状态检查、清理任务 | 超时检查、过期结果清理 |
| `medium` | 通用工具执行、图片生成类任务 | `execute_tool_task` |
| `heavy` | PDF、打包等重任务 | PDF、ZIP 打包 |

`execute_tool_task` 显式绑定到 `medium` 队列，因此 storybook 生成任务默认进入 Redis 的 Celery medium 队列。

## 3. 创建任务：FastAPI 写库并投递 Celery

用户点击“开始生成”后，前端调用：

```text
POST /api/v1/tasks
```

后端处理流程：

1. 将任务归属强制设置为当前登录用户。
2. 调用 `TaskService.create_task` 创建任务。
3. 校验用户余额是否足够。
4. 预冻结积分。
5. 在 `tasks` 表中创建任务记录，初始状态为 `pending`。
6. 调用 `execute_tool_task.delay(...)` 投递 Celery 任务。

投递任务时传入三个核心参数：

```python
execute_tool_task.delay(
    task_id=str(task.id),
    tool_type=task.task_type,
    input_params=task.input_params or {}
)
```

其中：

- `task_id`：业务任务 ID，对应 PostgreSQL 中的 `tasks.id`。
- `tool_type`：工具类型，例如 `storybook-generator`。
- `input_params`：用户输入参数，例如主题、页数、画风、是否生成语音等。

此时，业务任务已经落库，Redis 中多了一条 Celery 待执行消息。

## 4. Worker 执行入口：execute_tool_task

Celery Worker 从 Redis 队列中取出任务后，执行 `execute_tool_task`。

主要流程如下：

1. 发布“任务开始执行”消息到 Redis Pub/Sub。
2. 将数据库中的任务状态更新为 `running`。
3. 保存 Celery 自身的任务 ID 到 `tasks.celery_task_id`，用于后续取消任务时 revoke。
4. 根据 `tool_type` 查找对应执行器。
5. 创建异步数据库会话。
6. 创建 `AsyncProgressCallback`，用于把执行器进度发布到 Redis。
7. 创建具体执行器并执行。

执行器映射关系大致如下：

```python
EXECUTOR_MAP = {
    'storybook-generator': StorybookExecutor,
    'ecommerce-detail': EcommerceExecutor,
    'product-description': MarketingExecutor,
}
```

因此，当 `task_type` 是 `storybook-generator` 时，会进入 `StorybookExecutor`。

## 5. StorybookExecutor 的执行阶段

真实 storybook 执行入口是 `StorybookExecutor.execute`。

整体分为 6 个主要阶段。

### 5.1 故事大纲与智能分页，0-20%

执行器先初始化 AI Provider，然后调用 DeepSeek 生成故事大纲。

输入通常包括：

- 故事主题
- 用户已有故事文案
- 目标年龄段
- 是否启用智能页数

如果开启智能页数，AI 会在指定范围内建议页数。

执行完成后，执行器会保存快照，便于后续断点恢复。

### 5.2 插画提示词生成，20-35%

执行器继续调用 DeepSeek，根据故事大纲和页数生成每一页的英文插画提示词。

结果会保存到 `result_data['pages']` 中，每页通常包含：

- 场景描述
- 英文绘图 prompt
- 对应故事文本片段
- 重要程度

### 5.3 批量生成插画，35-60%

执行器调用豆包/火山 Provider 生成图片。

虽然方法名中有 serial，但内部有 semaphore 控制并发上限，当前按页推进进度。

每完成一页，会调用 `update_progress`，例如：

```text
正在生成插画 (1/5)...
正在生成插画 (2/5)...
```

进度范围从 35% 推进到 60%。

### 5.4 语音合成，60-80%

如果用户选择生成语音，执行器会调用智谱 GLM-TTS。

每页故事文本会生成一段音频，并保存到任务工作目录下。

同样，每完成一页会更新子进度，例如：

```text
正在生成语音 (1/5)...
正在生成语音 (2/5)...
```

进度范围从 60% 推进到 80%。

### 5.5 PDF 排版与 ZIP 打包，80-95%

执行器根据故事、图片和音频生成：

- `storybook.pdf`
- `package.zip`
- `metadata.json`

这些文件会保存到当前任务的工作目录中。

### 5.6 创建成果记录，95-100%

最后，执行器创建成果数据：

- `works`：成果主记录
- `work_files`：成果文件记录，包括 PDF、ZIP、图片、音频

完成后更新进度到 100%，并返回结果数据，例如：

```json
{
  "success": true,
  "work_id": "...",
  "title": "...",
  "page_count": 5,
  "files": {
    "pdf_path": "...",
    "zip_path": "..."
  }
}
```

## 6. update_progress 的内部机制

所有执行器都继承自 `BaseToolExecutor`。

当执行器调用：

```python
await self.update_progress(...)
```

会同时发生三件事。

### 6.1 更新数据库任务状态

更新 `tasks.progress` 和 `tasks.progress_message`。

例如：

```text
progress = 35
progress_message = 正在生成插画...
```

这保证即使前端断线，重新查询任务详情也能拿到最新状态。

### 6.2 写入任务日志

每次进度更新都会写入一条 `task_logs` 记录。

日志中会包含结构化信息，例如：

- `step_index`
- `total_steps`
- `step_status`
- `sub_progress`

这用于后续展示执行日志、排查失败原因或审计。

### 6.3 发布 Redis Pub/Sub 消息

执行器中的 `progress_callback` 会把进度发布到 Redis 频道：

```text
task:{task_id}:status
```

消息结构大致如下：

```json
{
  "type": "progress",
  "task_id": "...",
  "progress": 35,
  "message": "正在生成插画...",
  "data": {
    "step_index": 2,
    "total_steps": 6,
    "step_status": "running",
    "sub_progress": "1/5"
  },
  "timestamp": 1234567890
}
```

因此，Redis Pub/Sub 是实时进度通道，数据库是状态持久化通道。

## 7. SSE 如何将 Redis 消息推给前端

前端通过 EventSource 连接后端 SSE 接口：

```text
GET /api/v1/stream/tasks/{task_id}/stream
```

后端会：

1. 校验用户 token。
2. 检查任务是否属于当前用户。
3. 订阅 Redis 频道 `task:{task_id}:status`。
4. 将 Redis Pub/Sub 消息转换为 SSE 事件。
5. 推送给前端。

事件类型包括：

| 事件 | 含义 |
| --- | --- |
| `connected` | SSE 连接成功 |
| `status` | 任务状态变化 |
| `progress` | 任务进度更新 |
| `completed` | 任务完成 |
| `failed` | 任务失败 |
| `retry` | 任务重试 |
| `closed` | SSE 连接关闭 |
| `error` | SSE 内部错误 |

前端收到 `progress` 后更新进度条，收到 `completed` 后可以跳转成果页或展示下载入口。

## 8. 完成与积分结算

真实执行完成后，`execute_tool_task` 会：

1. 调用执行器的 `estimate_cost` 计算实际费用。
2. 调用 `TaskService.complete_task` 完成结算。
3. 更新任务状态为 `completed`。
4. 发布 `completed` 消息到 Redis Pub/Sub。

结算逻辑：

```text
冻结金额 = estimated_cost
实际费用 = actual_cost

如果冻结金额 > 实际费用：
    扣除实际费用，退还差额

如果冻结金额 == 实际费用：
    直接结算冻结积分

如果冻结金额 < 实际费用：
    额外扣除用户余额，再结算
```

完成后，任务状态会变成：

```text
status = completed
progress = 100
actual_cost = 实际费用
completed_at = 当前时间
```

## 9. 失败、取消和超时

### 9.1 失败

如果执行过程中抛出异常，Celery 任务会进入异常处理逻辑：

1. 调用 `TaskService.fail_task`。
2. 将任务状态改为 `failed`。
3. 全额解冻预冻结积分。
4. 写入失败日志。
5. 发布 `failed` 事件到 Redis Pub/Sub。

Celery 任务本身配置了自动重试：

- 最大重试次数：3 次
- 使用指数退避
- 最大退避时间：600 秒
- 带随机抖动

### 9.2 取消

用户取消任务时，后端会：

1. 查询业务任务。
2. 如果存在 `celery_task_id`，调用 Celery revoke 并 terminate。
3. 将任务状态改为 `cancelled`。
4. 解冻预冻结积分。
5. 写入取消日志。
6. 发布 `cancelled` 事件。

### 9.3 超时

项目中有 Celery Beat 定时任务，每分钟检查一次超时任务。

如果发现任务处于 `running` 且超过阈值，会：

1. 标记为 `timeout`。
2. 解冻预冻结积分。
3. 发布失败/超时消息给前端。

## 10. Mock 模式

如果工具配置中 `is_mock_enabled = true`，Worker 不会调用真实 AI Provider，而是走 `_mock_execute`。

Mock 模式仍然沿用同一套链路：

```text
FastAPI 创建任务
    ↓
Celery 投递任务
    ↓
Worker 执行 Mock 流程
    ↓
update_progress 写库 + 写日志 + Redis Pub/Sub
    ↓
SSE 推送前端
    ↓
创建 Work / WorkFile
    ↓
完成结算
```

区别只是 Mock 模式生成的是占位图片、占位音频和占位 PDF，不调用外部 AI API。

## 11. Redis 的两类通道不要混淆

### 11.1 Celery 队列通道

用于异步任务调度：

```text
FastAPI → execute_tool_task.delay → Redis Broker → Celery Worker
```

这部分由 Celery 内部管理，业务代码通常不直接操作。

### 11.2 业务实时进度通道

用于前端实时查看任务状态：

```text
Worker → Redis Pub/Sub → FastAPI SSE → 前端 EventSource
```

频道命名规则：

```text
task:{task_id}:status
```

这部分是项目业务代码显式 publish / subscribe 的。

## 12. Storybook 完整时间线

```text
T0 用户点击“开始生成”
    POST /api/v1/tasks

T1 FastAPI 创建 Task
    status = pending
    progress = 0
    冻结 estimated_cost 积分

T2 FastAPI 投递 Celery
    execute_tool_task.delay(task_id, 'storybook-generator', input_params)

T3 Redis 收到 Celery 消息
    medium 队列中出现任务

T4 Celery Worker 取出任务
    execute_tool_task 开始运行

T5 Worker 发布 status
    Redis Pub/Sub: task:{task_id}:status
    message = 任务开始执行

T6 Worker 更新数据库
    status = running
    progress = 0

T7 Worker 创建 StorybookExecutor

T8 StorybookExecutor 生成故事大纲
    DB: progress = 5
    DB: 写 task_log
    Redis Pub/Sub: progress 5

T9 生成插画提示词
    DB: progress = 20
    Redis Pub/Sub: progress 20

T10 逐页生成图片
    DB: progress = 35 → 60
    Redis Pub/Sub: sub_progress = 1/5, 2/5...

T11 逐页生成语音
    DB: progress = 60 → 80
    Redis Pub/Sub: sub_progress = 1/5, 2/5...

T12 生成 PDF 和 ZIP
    DB: progress = 80
    Redis Pub/Sub: progress 80

T13 创建 Work / WorkFile 成果记录
    DB: works / work_files

T14 任务完成
    DB: status = completed, progress = 100
    结算积分
    Redis Pub/Sub: completed

T15 SSE 收到 completed
    推给前端
    前端跳转成果页或展示下载入口
```

## 13. 总结

当前项目的异步执行架构可以概括为：

```text
FastAPI 负责接收请求和创建业务任务；
PostgreSQL 负责保存任务状态、日志、成果和积分数据；
Celery Worker 负责执行耗时工具任务；
Redis 既作为 Celery Broker / Result Backend，也作为实时进度 Pub/Sub；
SSE 负责把 Redis 中的进度消息实时推送给前端。
```

对于 storybook 来说，完整链路就是：创建任务、冻结积分、投递 Celery、Worker 执行多阶段 AI 生成、持续写库和推送 Redis 进度、最终创建成果并完成积分结算。
