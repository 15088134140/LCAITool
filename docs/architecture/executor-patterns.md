# 执行器模式与标杆工具规范

## 执行器模式

项目支持三种执行模式：

1. **本地逐步执行**：由本地执行器分阶段调用 LLM、图片、音频、打包等能力。
2. **Dify SSE 流式消费**：由执行器消费 Dify 工作流 SSE 事件并同步任务进度。
3. **外部 HTTP 回调驱动**：任务提交后由外部平台通过 HTTP 回调更新进度和结果。

## 标杆工具 1：AI 有声绘本生成专家

| 阶段              | 进度   | 操作                                        | 费用计算         |
| ----------------- | ------ | ------------------------------------------- | ---------------- |
| 1. 故事生成       | 0-15%  | LLM 根据主题生成完整故事大纲 + 分页故事文本 | 包含在基础费     |
| 2. 插画提示词生成 | 15-25% | 为每一页生成精准的绘画提示词                | 包含在基础费     |
| 3. 批量生成插图   | 25-60% | 并行调用图片生成 API，N 页同时生成          | image_fee × 页数 |
| 4. 语音合成       | 60-80% | 为每一页故事文本生成语音 narration          | audio_fee × 页数 |
| 5. 排版与打包     | 80-95% | 生成统一封面、PDF 排版、打包 ZIP            | 包含在基础费     |
| 6. 完成结算       | 100%   | 计算总费用，生成预览，保存成果              | -                |

## 标杆工具 2：AI 电商商品详情页生成器

- 基础费：12 积分。
- 图片费：1 积分/张。
- 输出：商品主图、详情页分段图片、营销文案、PSD 源文件。
- 执行模式：Dify 平台工作流（SSE 流式消费）。

## 标杆工具 3：AI 营销文案大师

- 基础费：8 积分。
- 输出：营销文案。
- 执行模式：Celery 转发 + 外部 HTTP 回调。

---

## 动态表单文件字段约定（2026-06-07 起）

动态表单 (`tools.param_schema` 中 `type: "file"`) 的文件字段会通过用户端上传接口
`POST /api/v1/files/uploads` 落到 `user_uploads` 表，并把元数据写入任务的 `input_params`。
**执行器必须按以下约定读取，不得信任前端传入的本地路径。**

### 单文件字段

`param_schema` 中 `multiple: false` 时，`input_params[key]` 为对象：

```json
{
  "reference_image": {
    "file_id": "uuid",
    "file_name": "demo.png",
    "file_size": 12345,
    "mime_type": "image/png",
    "url": "/api/v1/files/uploads/uuid"
  }
}
```

### 多文件字段

`multiple: true` 时为对象数组：

```json
{
  "reference_images": [
    { "file_id": "uuid-a", "file_name": "a.png", "url": "..." },
    { "file_id": "uuid-b", "file_name": "b.png", "url": "..." }
  ]
}
```

### 执行器读取规则

1. **认 file_id，不认 url/path**。`url` 只用于前端预览/下载，本地路径仅在后端服务范围内有效。
2. **必须通过 `file_id` 在 `user_uploads` 表查询**，再获取持久化的 `file_path` 和访问权限校验结果。
3. 推荐封装 helper（首期可在执行器中本地实现，后续抽公共模块）：
   ```python
   def resolve_uploaded_file(file_id: str, user_id: UUID) -> UserUpload:
       """根据 file_id 查找上传记录，并校验归属当前用户。
       失败抛 ExecutorInputError，避免静默使用错误文件。
       """
   ```
4. 缺失/越权/MIME 不符的文件 → 抛执行器输入错误，不要尝试下载 url 兜底。

### 安全要点

- 上传接口已要求登录并隔离 `user_id` 目录；执行器仍应再校验一遍 `user_upload.user_id == task.user_id`。
- 单文件默认上限 20MB，MIME 白名单：`image/*`、`application/pdf`、`text/plain`、`audio/*`、`video/*`、`application/zip`。
- 执行器要复制/转换文件时，应使用 `user_uploads.file_path` 而不是重新解析 `url`。

