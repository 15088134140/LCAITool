# 创意视频生成器 P0 设计文档

**日期**：2026-06-17  
**状态**：已确认，待实现计划  
**范围**：P0 跑通 Seedance 1.5 pro 单条视频生成流程  

## 1. 背景与目标

本项目需要新增一个 form 类型工具「创意视频生成器」，参考火山方舟体验中心 Doubao Seedance 1.5 pro 的视频生成界面，实现截图中的核心能力：视频比例、分辨率、视频时长、生成数量、输出声音、样片预览、首尾帧参考图等。

本次 P0 的目标不是完成商业化精细计费和完整创作工作台，而是先跑通端到端视频生成链路：用户填写表单后，后端创建任务、调用 Seedance 创建视频生成任务、轮询结果、转存 mp4、创建 Work/WorkFile，并完成固定费用扣费闭环。

## 2. 外部文档与事实依据

已通过火山引擎联网搜索读取到以下官方信息：

- 创建视频生成任务 API：`POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks`。
- 查询视频生成任务 API：`GET https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{id}`。
- Seedance 1.5 pro model id：`doubao-seedance-1-5-pro-251215`。
- 官方推荐参数写法是在 request body 中直接传入：`model`、`content`、`resolution`、`ratio`、`duration`、`seed`、`camera_fixed`、`watermark` 等。
- Seedance 1.5 pro 支持文生视频、图生视频-首帧、图生视频-首尾帧，以及音视频联合生成。
- 查询任务结果中的 `content.video_url` 为 mp4 下载地址，视频 URL 有 24 小时有效期，需要及时转存。
- 查询任务结果可能返回 `content.last_frame_url`，需在创建任务时设置 `return_last_frame=true`。
- 官方体验页显示有声视频价格 0.016 元/千 tokens，无声视频价格 0.008 元/千 tokens；P0 暂不使用该价格做精细计费。

尚需在实现前通过官方文档或小调用确认的字段：

- 首帧/尾帧图片在 `content` 中的精确结构。
- `generate_audio` / 无声输出的精确 API 字段或请求方式。

这些不确定点必须隔离在 provider 层，不能散落到 executor 和表单逻辑中。

## 3. 项目现状

当前后端已有以下可复用结构：

- `Tool.param_schema`：动态 form 字段配置。
- `Tool.pricing_schema`：工具计价规则配置。
- `Tool.executor_key`：工具执行器注册键。
- `BaseToolExecutor`：提供 `estimate_cost()`、`execute()`、`update_progress()`、`save_snapshot()`、`prompts.md` 记录等能力。
- `DoubaoProvider.generate_video()`：已有 Seedance 异步提交与轮询的初版实现，但目前只支持文生视频和简单 `duration`，不支持 ratio/resolution/首尾帧/输出声音等 P0 必需参数。
- `UserUpload`：已有用户上传文件表，可用 `field_key` 关联动态表单文件字段。
- `Work` / `WorkFile`：可用于保存生成成果与成果文件。

## 4. P0 产品范围

P0 实现以下能力：

1. 新增「创意视频生成器」form 工具，归属“视频创作”分类。
2. 支持单条视频生成。
3. 支持首帧参考图、尾帧参考图两个上传位。
4. 支持提示词输入。
5. 支持视频比例选择：`smart`、`21:9`、`16:9`、`4:3`、`1:1`、`3:4`、`9:16`。
6. 支持分辨率选择：`480p`、`720p`、`1080p`。P0 允许 1080p，若官方 API 拒绝则任务失败并展示错误。
7. 支持视频时长：按秒数 4–12 秒，默认 6 秒；支持智能时长。
8. 支持输出声音开关，默认开启。
9. 保留样片速览入口。
10. 生成数量字段 P0 显示但锁定为 1，多条生成后置。
11. 固定费用计费闭环：预估费用 = 实际费用 = `base_fee`。

P0 不做：

- 多条视频生成。
- 精细计价。
- 提示词模板系统。
- 样片画廊全量管理。
- 视频二次编辑。
- 回调替代轮询。
- 新增数据库表。

## 5. 表单字段设计

### 5.1 字段清单

| 字段 | key | 类型 | P0 行为 |
| --- | --- | --- | --- |
| 首帧参考图 | `first_frame` | file/image | 选填。上传后进入图生视频-首帧或首尾帧模式 |
| 尾帧参考图 | `last_frame` | file/image | 选填。只有首帧存在时才参与首尾帧；若仅传尾帧，前后端均拒绝提交 |
| 创意描述 | `prompt` | textarea | 选填；但文生视频模式下必填 |
| 视频比例 | `ratio` | radio/card | 默认 `smart`；`smart` 时不向 Ark 传 `ratio` |
| 分辨率 | `resolution` | radio/segmented | 默认 `480p`；允许 `480p`、`720p`、`1080p` |
| 视频时长模式 | `duration_mode` | radio/segmented | `seconds` / `smart`；默认 `seconds` |
| 秒数 | `duration` | range | 4–12 秒，默认 6；`duration_mode=smart` 时不传 |
| 生成数量 | `quantity` | range | P0 锁定为 1，提示“多条生成即将上线” |
| 输出声音 | `generate_audio` | boolean | 默认 true |
| 样片速览 | `sample_preview` | action/button | 打开样片入口，不影响请求参数 |

### 5.2 输入模式推断

不新增“文生 / 首帧 / 首尾帧”切换器，按用户上传组合隐式判断：

1. `first_frame` 为空、`last_frame` 为空：文生视频，`prompt` 必填。
2. `first_frame` 有值、`last_frame` 为空：图生视频-首帧，`prompt` 选填。
3. `first_frame` 有值、`last_frame` 有值：图生视频-首尾帧，`prompt` 选填。
4. `first_frame` 为空、`last_frame` 有值：非法输入，前端阻止提交，后端也返回参数错误。

### 5.3 智能项映射

- `ratio=smart`：请求体不传 `ratio`。
- `duration_mode=smart`：请求体不传 `duration` / `frames`。

这样避免猜测官方未明确给出的 `auto` / `adaptive` 枚举值。

## 6. 推荐架构

采用“新增专用 executor + 扩展 DoubaoProvider”的方案。

### 6.1 新增 CreativeVideoExecutor

新增执行器 `CreativeVideoExecutor`，注册：

```text
executor_key = creative-video-generator
```

执行器职责：

1. 校验 P0 参数。
2. 从 `user_uploads` 读取 `first_frame` / `last_frame` 对应文件。
3. 推断生成模式：文生 / 首帧 / 首尾帧。
4. 调用 `DoubaoProvider.generate_video()` 提交 Ark Seedance 任务。
5. 轮询任务结果。
6. 下载视频到当前任务的 works 目录。
7. 创建 `Work` 和 `WorkFile`。
8. 按固定费用完成结算。

### 6.2 扩展 DoubaoProvider.generate_video

现有 `generate_video()` 需要扩展为支持 body 参数方式，并保留向后兼容。

目标调用形态：

```python
await doubao_provider.generate_video(
    prompt=prompt,
    model="doubao-seedance-1-5-pro-251215",
    images=[
        {"role": "first_frame", "data": ...},
        {"role": "last_frame", "data": ...},
    ],
    resolution="720p",
    ratio="16:9",
    duration=6,
    generate_audio=True,
    return_last_frame=True,
    watermark=False,
)
```

Provider 内部构造 Ark payload，示意如下：

```json
{
  "model": "doubao-seedance-1-5-pro-251215",
  "content": [
    { "type": "text", "text": "提示词" },
    { "type": "image_url", "image_url": { "url": "..." }, "role": "first_frame" },
    { "type": "image_url", "image_url": { "url": "..." }, "role": "last_frame" }
  ],
  "resolution": "720p",
  "ratio": "16:9",
  "duration": 6,
  "return_last_frame": true,
  "watermark": false
}
```

图片 content 的最终字段结构由 provider 内的 `_build_video_content()` 负责适配。实现前必须确认官方字段，executor 不直接拼 Ark payload。

### 6.3 输出声音映射

`generate_audio` 是用户侧参数。Provider 内部按官方 API 适配：

- 若官方存在显式音频字段，按字段传。
- 若官方通过模型或服务层区分有声/无声，Provider 内映射。
- 若实现前仍无法确认无声字段，则 P0 只允许 `generate_audio=true` 实际调用；`generate_audio=false` 返回明确错误：“当前暂不支持无声输出，请开启输出声音”。

## 7. 数据流

P0 单条视频生成流程：

```text
用户提交表单
  → TaskService 创建 Task / 冻结 base_fee
  → Celery worker 根据 executor_key 找到 CreativeVideoExecutor
  → CreativeVideoExecutor.execute(params)
    → 参数校验
    → 读取 UserUpload 首尾帧
    → 调 DoubaoProvider.generate_video()
      → POST /api/v3/contents/generations/tasks
      → GET /api/v3/contents/generations/tasks/{id} 轮询
    → 下载 video_url 到 works/<task_id>/videos/creative_video.mp4
    → 如返回 last_frame_url，下载到 works/<task_id>/images/last_frame.png
    → 创建 Work
    → 创建 WorkFile(video)
    → 可选创建 WorkFile(image last_frame)
    → complete_task(actual_cost=base_fee)
```

## 8. Work / WorkFile 设计

P0 只生成 1 条视频。

### 8.1 Work

- `title`：提示词前 20 字；无提示词时用“创意视频生成”。
- `description`：记录模式、比例、分辨率、时长、是否有声。
- `status`：`published`。
- `is_public`：false。
- `version`：1。
- `cover_image`：优先使用返回的 `last_frame_url` 下载图；没有尾帧图时可为空或使用首帧上传图，具体以成果页支持程度为准。

### 8.2 WorkFile

主视频文件：

- `file_type="video"`
- `file_name="creative_video.mp4"`
- `file_url="videos/creative_video.mp4"`
- `mime_type="video/mp4"`

可选尾帧图：

- `file_type="image"`
- `file_name="last_frame.png"`
- `file_url="images/last_frame.png"`
- `mime_type="image/png"`

## 9. 进度设计

P0 进度分 5 步：

1. 5%：校验参数与素材。
2. 15%：提交 Seedance 任务。
3. 15–85%：轮询生成结果，每轮刷新日志。
4. 90%：下载并保存视频。
5. 100%：创建成果并结算。

轮询时应写入 TaskLog，避免用户误以为任务卡死。

## 10. 计费设计

P0 使用固定费用，避免计价逻辑阻塞视频生成链路。

```text
预估积分 = base_fee
实际扣费 = base_fee
```

建议初始值：

```text
base_fee = 10
```

`pricing_schema` 使用现有 PricingService 已支持的 fixed 规则：

```json
{
  "version": 1,
  "currency": "credits",
  "rounding": "ceil",
  "items": [
    {
      "key": "base",
      "type": "fixed",
      "label": "创意视频生成基础费",
      "amount_ref": "base_fee"
    }
  ],
  "display": {
    "show_breakdown": true,
    "total_label": "预计消耗",
    "unit_label": "积分"
  }
}
```

`CreativeVideoExecutor.estimate_cost()` 保持一致：

```python
return self._tool_config.get("base_fee", 10)
```

P1 再升级为：

```text
base_fee + duration_seconds × resolution_rate × audio_multiplier × quantity
```

届时再考虑扩展 `PricingService` 的倍率能力。

## 11. seed_data 设计

新增工具配置：

```text
slug: creative-video-generator
name: 创意视频生成器
category: 视频创作
usage_modes: ["form"]
executor_key: creative-video-generator
base_fee: 10
image_fee: 0
audio_fee: 0
token_fee: 0
status: 1
is_featured: true
```

P0 `param_schema` 核心结构：

```json
[
  { "key": "_section_media", "type": "section", "label": "参考素材", "order": 1 },
  { "key": "first_frame", "label": "首帧参考图", "type": "file", "accept": "image/*", "required": false, "order": 2 },
  { "key": "last_frame", "label": "尾帧参考图", "type": "file", "accept": "image/*", "required": false, "order": 3 },
  { "key": "prompt", "label": "创意描述", "type": "textarea", "placeholder": "结合图片，输入创意描述（选填）", "order": 4 },
  { "key": "_section_video", "type": "section", "label": "视频参数", "order": 10 },
  {
    "key": "ratio",
    "label": "视频比例",
    "type": "radio",
    "defaultValue": "smart",
    "uiHint": "compact-card",
    "options": [
      { "label": "21:9", "value": "21:9" },
      { "label": "16:9", "value": "16:9" },
      { "label": "4:3", "value": "4:3" },
      { "label": "1:1", "value": "1:1" },
      { "label": "3:4", "value": "3:4" },
      { "label": "9:16", "value": "9:16" },
      { "label": "智能", "value": "smart" }
    ],
    "order": 11
  },
  {
    "key": "resolution",
    "label": "分辨率",
    "type": "radio",
    "defaultValue": "480p",
    "uiHint": "segmented",
    "options": [
      { "label": "480p", "value": "480p" },
      { "label": "720p", "value": "720p" },
      { "label": "1080p", "value": "1080p" }
    ],
    "order": 12
  },
  {
    "key": "duration_mode",
    "label": "视频时长",
    "type": "radio",
    "defaultValue": "seconds",
    "uiHint": "segmented",
    "options": [
      { "label": "按秒数", "value": "seconds" },
      { "label": "智能时长", "value": "smart" }
    ],
    "order": 13
  },
  { "key": "duration", "label": "秒数", "type": "range", "min": 4, "max": 12, "defaultValue": 6, "order": 14 },
  { "key": "quantity", "label": "选择生成数量", "type": "range", "min": 1, "max": 1, "defaultValue": 1, "helpText": "多条生成即将上线", "order": 15 },
  { "key": "generate_audio", "label": "输出声音", "type": "boolean", "defaultValue": true, "order": 16 },
  { "key": "sample_preview", "label": "样片速览", "type": "action", "action": "open_demo_preview", "order": 17 }
]
```

## 12. P1 / P2 扩展点

### 12.1 P1：生成数量 1–4

- 放开 `quantity.max=4`。
- Executor 并发提交 N 个 Seedance 任务。
- 一个 Task 创建一个 Work。
- Work 下挂 N 个 video WorkFile。
- 费用公式乘以 `quantity`。
- 部分失败策略：部分成功则 Work 成功，按成功条数结算；失败条目写 TaskLog。

### 12.2 P1：高级参数

后续可在“高级设置”里增加：

- `seed`
- `camera_fixed`
- `watermark`
- `return_last_frame`

### 12.3 P2：提示词模板 / 样片画廊 / 迭代

- `ToolDemo.demo_type="video"` 用作样片速览数据源。
- `ToolDemo.input_params` 存模板参数。
- 迭代创作复用现有 `parent_id` / Work 版本链路。

## 13. 错误处理

- 缺少 prompt 且未上传首帧/尾帧：前端阻止，后端返回参数错误。
- 只传尾帧：前端阻止，后端返回参数错误。
- 上传文件不存在或不属于当前用户：后端拒绝。
- Ark 返回不支持 1080p、无声或某参数：任务失败，记录原始错误摘要，退还冻结积分。
- 轮询超时：任务失败或 timeout，退还冻结积分。
- 视频 URL 24 小时过期风险：执行器成功后立即下载并转存到 `works` 目录。

## 14. 测试策略

### 14.1 后端单元测试

覆盖：

1. `CreativeVideoExecutor.estimate_cost()` 任意参数都返回 `base_fee`。
2. 参数校验：
   - 文生模式无 prompt 报错。
   - 仅传 `last_frame` 报错。
   - 合法文生通过。
   - 合法首帧通过。
   - 合法首尾帧通过。
3. 请求 payload 构造：
   - `ratio=smart` 不传 `ratio`。
   - `duration_mode=smart` 不传 `duration`。
   - `resolution=1080p` 原样传。
   - `quantity` P0 强制为 1。
4. WorkFile 创建：
   - 成功后存在 video 类型文件。
   - 文件 URL 使用相对路径 `videos/creative_video.mp4`。

### 14.2 Provider 测试

使用 mock `httpx.AsyncClient` 覆盖：

1. 创建任务成功返回 task id。
2. 轮询中状态最终变为 succeeded。
3. succeeded 后能读取 `content.video_url`。
4. failed 状态返回错误。
5. 轮询超时返回 timeout。
6. 下载 video_url 后返回视频内容。

### 14.3 手工验收

最小手工验证路径：

1. 启动后端、前端。
2. seed_data 同步出新工具。
3. 打开“创意视频生成器”。
4. 输入提示词：“小猫对着镜头打哈欠”。
5. 选择：比例 16:9、分辨率 480p、时长 4 秒、输出声音开、数量 1。
6. 提交任务。
7. 等待完成。
8. 下载或播放成果 mp4。

## 15. 风险与回滚

### 15.1 风险

1. 图片 content 字段结构未完全确认。处理：隔离在 provider `_build_video_content()`。
2. 输出声音开关字段未完全确认。处理：默认有声；无声无法确认时返回明确错误。
3. 1080p 可能被官方拒绝。处理：P0 透传，失败时展示 Ark 错误并退费。
4. 成果页 video 展示能力未知。处理：P0 至少保证 WorkFile 可下载；必要时补前端 video 渲染。
5. 外部生成耗时长。处理：轮询日志、可配置超时、失败退费。

### 15.2 回滚

如果上线后外部 API 不稳定：

1. 将工具 `status=2` 置为维护中或 `status=0` 下线。
2. 保留已生成成果。
3. 不影响其它工具，因为新增 executor 独立。
4. Provider 扩展必须保留旧 `generate_video()` 参数兼容路径，避免影响已有调用。

## 16. 实现前检查清单

实现计划阶段必须检查：

- 前端动态表单是否已支持 `type=file`。
- 前端动态表单是否已支持 `type=action`，或是否需要 P0 降级为静态按钮/链接。
- 成果页是否支持 `file_type="video"` 展示或下载。
- `TaskService` 创建任务时是否优先使用 `PricingService`，确认 fixed pricing_schema 与 executor estimate_cost 一致。
- Seedance 图片 content 字段结构和输出声音字段是否通过官方文档或小调用确认。
