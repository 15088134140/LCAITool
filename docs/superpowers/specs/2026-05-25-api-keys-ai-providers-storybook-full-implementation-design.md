# API Key 管理 + AI 多模型能力 + Storybook 全链路 + 种子数据

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-05-25 | 初版设计 |

---

## 一、需求概述

1. **用户个人中心** 增加 API Key 管理
2. **增加各模型基础调用能力**（智谱/豆包/DeepSeek）
3. **Storybook 执行器全链路**（接入真实 AI）
4. **产生种子数据**（AI 提供商配置）

---

## 二、API Key 管理

### 2.1 数据模型

新建 `api_keys` 表：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID FK→users | 所属用户 |
| name | String(100) | 密钥名称 |
| key_prefix | String(10) | 前缀如 `lcai_aB3x`，用于列表脱敏显示 |
| key_hash | String(128) | SHA-256 哈希，API 认证时比对 |
| key_encrypted | Text | AES-256 加密存储，用户点击"小眼睛"时解密展示 |
| status | String(10) | `active` / `disabled` |
| last_used_at | Integer | 最后使用时间戳，默认 null |

### 2.2 密钥生成规则

格式：`lcai_` + 随机 40 位 hex 字符（共 45 字符）
- `key_prefix`：`lcai_` + 前 4 位 hex（如 `lcai_aB3x`）
- `key_hash`：明文密钥的 SHA-256
- `key_encrypted`：明文密钥的 AES-256 加密

### 2.3 后端 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/users/api-keys` | 获取当前用户的密钥列表（脱敏） |
| `POST` | `/api/v1/users/api-keys` | 新建 API Key，body: `{name}` |
| `GET` | `/api/v1/users/api-keys/{id}/reveal` | 查看明文（解密展示） |
| `PUT` | `/api/v1/users/api-keys/{id}/status` | 启用/禁用，body: `{status}` |
| `DELETE` | `/api/v1/users/api-keys/{id}` | 删除 |

新建响应示例：
```json
{
  "id": "uuid",
  "name": "测试环境",
  "key": "lcai_aB3x7f2e9c1d4a6b8e0f3c5d7a9b2e4f6c8a0d1e3f5",
  "key_prefix": "lcai_aB3x",
  "status": "active",
  "created_at": 1717000000,
  "warning": "请立即复制密钥，关闭后不再显示"
}
```

查看明文响应示例：
```json
{
  "id": "uuid",
  "key": "lcai_aB3x7f2e9c1d4a6b8e0f3c5d7a9b2e4f6c8a0d1e3f5"
}
```

### 2.4 前端（用户中心）

- 在用户中心侧边栏新增 "API 密钥" 菜单项
- 页面布局：表格 + 顶部"新增 API Key"按钮
- 表格列：名称 / API Key（`lcai_aB3x****` + 👁 点击查看） / 状态（switch 开关） / 最后使用时间 / 创建时间 / 操作（删除）
- 新增弹窗：输入名称 → 生成 → 展示明文（复制按钮 + 警告提示）
- 查看明文：点击 👁 → 调用 reveal 接口 → 显示明文 → 30 秒后自动隐藏

### 2.5 API Key 认证中间件

位置：`app/api/v1/middleware/api_key_auth.py`

逻辑：
1. 读取 Header `Authorization: Bearer <key>`
2. 提取前缀 `lcai_` + 前 4 位 → 查 `api_keys` 表
3. 比对 SHA-256 hash
4. 校验 status = active
5. 异步更新 last_used_at
6. 注入 `request.state.user_id` 和 `request.state.auth_type = "api_key"`

路由标记：对外暴露的 API 端点加 `dependencies=[Depends(verify_api_key)]`。

---

## 三、AI Provider 实现

### 3.1 整体结构

```
providers/ai/
├── __init__.py          # 注册：zhipu + deepseek
├── base.py              # 基类（不变）
├── doubao.py            # 扩展：生图 + 视频 + 声音复刻
├── zhipu.py             # 新建
├── deepseek.py          # 新建
└── dify.py              # 不变
```

`AIProviderFactory` 注册新的 provider：
```python
_providers = {
    "doubao": DoubaoProvider,
    "dify": DifyProvider,
    "zhipu": ZhipuProvider,
    "deepseek": DeepSeekProvider,
}
```

### 3.2 智谱 (ZhipuProvider)

**文件：** `providers/ai/zhipu.py`

**API 基础地址：** `https://open.bigmodel.cn/api/paas/v4`

**能力矩阵：**

| 方法 | 端点路径 | 模型 |
|------|---------|------|
| `generate_text()` | `/v4/chat/completions` | `GLM-4-Flash` |
| `generate_image()` | `/v4/cogview/v3` | `cogview-3` |
| `generate_audio()` | `/v4/audio/speech` | `glm-tts` |

**文本生成：** OpenAI 兼容格式，默认 model=`GLM-4-Flash`。

**图片生成：** CogView-3 API 返回图片 URL，需下载后存本地再返回。

**语音合成：** GLM-TTS，支持 `voice` 参数，返回音频二进制数据（mp3）。

### 3.3 豆包扩展 (DoubaoProvider)

**文件：** `providers/ai/doubao.py`（扩展）

已有能力：`generate_text()`、`generate_audio()`
新增能力：

| 方法 | 端点路径 | 模型 |
|------|---------|------|
| `generate_image()` | `/api/v3/images/generations` | `doubao-seedream-4.5` |
| `generate_video()` | `/api/v3/video/generations` | `doubao-seedance-2.0` |
| `clone_voice()` | `/api/v3/audio/cloning` | `tts-seedicl-2.0` |

**图片生成（Seedream 4.5）：**
- 火山方舟的图片生成 API 返回 base64 图片数据
- 解码后保存到本地或 OSS
- 支持 `size` 参数

**视频生成（Seedance 2.0）：**
- 异步任务模式：提交任务 → 返回 task_id → 轮询结果
- 支持多模态输入（图片+音频参考）
- 首次实现先支持文生视频

**声音复刻（SeedICL 2.0）：**
- 需要用户上传音频样本（3-10 秒）
- API 返回声音 ID，后续 TTS 用该 ID 作为 voice

### 3.4 DeepSeek (DeepSeekProvider)

**文件：** `providers/ai/deepseek.py`

**API 基础地址：** `https://api.deepseek.com/v1`

**能力：**

| 方法 | 模型（默认） | 说明 |
|------|-------------|------|
| `generate_text()` | `deepseek-v4-flash` | 快速文本生成 |
| `generate_text(thinking=True)` | `deepseek-v4-pro` | 推理模式 |

**思考模式：** 通过 `extra_body={"thinking": {"type": "enabled"}}` 参数控制。在 `generate_text()` 中通过 `thinking` 参数控制：
```python
async def generate_text(self, prompt, system_prompt=None, thinking=False, **kwargs):
    model = "deepseek-v4-pro" if thinking else "deepseek-v4-flash"
    extra = {"thinking": {"type": "enabled"}} if thinking else None
    # ...
```

### 3.5 Provider Factory 改进

`AIProviderFactory.get_provider()` 增加从 `ai_providers` 表动态读取配置的能力：

```python
@classmethod
async def get_provider_from_db(cls, db, slug: str) -> BaseAIProvider:
    """从数据库读取 AI 提供商配置并创建实例"""
    from app.models.system import AiProvider
    result = await db.execute(select(AiProvider).where(AiProvider.slug == slug))
    provider = result.scalar_one_or_none()
    if not provider:
        raise ValueError(f"AI provider '{slug}' not found in database")
    return cls.get_provider(provider.slug, **provider.config)
```

支持同时由环境变量和数据库配置。

### 3.6 统一返回格式约定

所有 Provider 的 `generate_image()` / `generate_audio()` / `generate_video()` 统一返回 **bytes 原始数据**：

| 接口 | 原始返回 | Provider 内部转换 |
|------|---------|-----------------|
| Seedream 4.5 | base64 字符串 | `base64.b64decode(data)` → bytes |
| CogView-3 | HTTP URL | `httpx.get(url).content` → bytes |
| GLM-TTS | 二进制响应 | `response.content` → bytes |
| Seedance 2.0 | 视频文件 URL | `httpx.get(url).content` → bytes |

调用方（执行器/对外 API 端点）统一处理：
```python
content = await provider.generate_image(prompt)
file_path = save_to_storage(content, "images/page_001.png")
file_url = get_file_url(file_path)
```

`generate_text()` 返回格式不变（`str`）。

---

## 四、对外 API（OpenAI 兼容格式）

### 4.1 端点设计

| 端点 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/v1/images/generations` | POST | API Key | 图片生成 |
| `/api/v1/audio/speech` | POST | API Key | 语音合成 |
| `/api/v1/chat/completions` | POST | API Key | 文本对话 |
| `/api/v1/video/generations` | POST | API Key | 视频生成 |
| `/api/v1/files/{file_id}` | GET | API Key | 获取生成的文件 |

### 4.2 模型 → 提供商路由

统一路由表（`app/api/v1/external/router.py`）：

```python
IMAGE_MODEL_MAP = {
    "doubao-seedream-4.5": "doubao",
    "cogview-3": "zhipu",
}
AUDIO_MODEL_MAP = {
    "glm-tts": "zhipu",
    "doubao-tts-2.0": "doubao",
}
CHAT_MODEL_MAP = {
    "deepseek-v4-pro": "deepseek",
    "deepseek-v4-flash": "deepseek",
    "glm-4-flash": "zhipu",
}
VIDEO_MODEL_MAP = {
    "doubao-seedance-2.0": "doubao",
}
```

### 4.3 文件服务

响应中的图片/语音 URL 通过文件服务返回：

```python
GET /api/v1/files/{file_id}
→ 查 work_files 表获取文件路径
→ 如果配置了 OSS，302 重定向到 OSS URL
→ 否则本地读取返回
```

---

## 五、Storybook 执行器全链路

### 5.1 架构

执行器集成多 provider，按步骤选择最合适的 AI 服务：

```
StorybookExecutor
├── Step 1: 表单（前端）
├── Step 2: 故事梗概    → DeepSeek v4-pro（thinking 模式）
├── Step 3: 绘画提示词   → DeepSeek v4-flash
├── Step 4: 生图（串行） → 豆包 Seedream 4.5
├── Step 4: 语音（串行） → 智谱 GLM-TTS
├── Step 5: PDF + ZIP   → 本地 PDFGenerator
└── Step 6: 保存成果    → 本地 DB
```

### 5.2 前端表单变更

在 `apps/frontend-user/src/app/tools/storybook-generator/components/StorybookForm.tsx` 基础上：

**艺术风格：** 保留现有 4 个卡通选项（卡通水彩/梦幻油画/日系动漫/扁平插画），新增"自定义"选项卡片，选中后显示文本输入框。

**页数设置：** 滑块 5-30 保持不变，右侧新增"智能决策"复选框。勾选后滑块禁用，提交时 `page_count` 传 `null`，由 AI 在 Step 2 决定。

表单提交参数变更：
```typescript
interface StorybookFormState {
  theme?: string;
  art_style?: string;        // 可空（自定义时为空）
  custom_style?: string;     // 自定义风格描述
  voiceType?: string;
  page_count?: number | null; // null 表示智能决策
  smart_page_count?: boolean;
  hasBackgroundMusic?: boolean;
  hasSoundEffects?: boolean;
  target_age?: string;
}
```

### 5.3 执行步骤

**Step 2：故事梗概（进度 0→20%，1 次 DeepSeek 调用）**

调用 DeepSeek v4-pro + thinking 模式，prompt 按需求文档模板：

```
系统提示词：
根据主题 {{theme}} 写一个短故事。要求：
1. 用简体中文写作
2. 不要使用特殊字符、星号或markdown格式
3. 故事要有趣且富有想象力
4. 保持在200-300字之间
5. 分成3-4个自然段落
6. 使用简单明了的语言
7. 避免使用括号、方括号或任何可能影响文本转语音的符号
```

如果 `smart_page_count = true`，在故事生成后 AI 附带建议页数（5-30 范围内）。

---

**Step 3：绘画提示词（进度 20→35%，1 次 DeepSeek 调用）**

调用 DeepSeek v4-flash，按需求文档模板：

```
系统提示词：
你是一个专业的儿童绘本插画师和AI绘画提示词专家，精通中英文双语。
请为这段文字 {{story}} 生成 {{page_count}} 个不同场景的绘图提示词。

重要提示：
1. 绘画风格统一使用：{{art_style}}，全程严格保持风格、色彩、光影一致
2. 不要在提示词中使用角色名字，而是用具体的外观特征来描述角色
3. text_snippet 必须是与画面相符的中文文本片段

JSON 格式输出，只输出 JSON：
[
  {
    "description": "场景描述",
    "prompt": "Character:\n[角色具体特征描述]\n\nScene:\n[场景描述]\n\nLighting:\n[光影描述]\n\nComposition:\n[构图描述]\n\nStyle:\n{art_style}\n\nAdditional:\n[补充细节]",
    "text_snippet": "对应的文本片段",
    "importance": "场景重要性评分（1-5）"
  }
]
```

---

**Step 4：生图（进度 35→60%，串行循环）**

逐张生成，每完成一张更新进度：

```python
for i, page in enumerate(pages):
    image = await doubao.generate_image(page["prompt"], size="1024x1024")
    save_image(image, f"page_{i+1:03d}.png")
    page["image_url"] = ...

    progress = 35 + ((i + 1) / total) * 25
    await self.update_progress(progress, f"正在生成插画... ({i+1}/{total})")
```

**Step 4b：语音（进度 60→80%，串行循环）**

所有图片生成完成后，逐段合成语音：

```python
for i, page in enumerate(pages):
    audio = await zhipu.generate_audio(page["text_snippet"], voice=voice_type)
    save_audio(audio, f"page_{i+1:03d}.mp3")
    page["audio_url"] = ...

    progress = 60 + ((i + 1) / total) * 20
    await self.update_progress(progress, f"正在合成语音... ({i+1}/{total})")
```

文件命名规则：同一场景图片和语音共享 `page_{页码}` 前缀（如 `page_001.png` / `page_001.mp3`）。

---

**Step 5：PDF + 打包（进度 80→95%，本地处理）**

复用现有 PDFGenerator：
- 生成 PDF（封面 + 每页图文排版）
- 打包 ZIP（含 PDF / images/*.png / audio/*.mp3 / metadata.json）

---

**Step 6：保存成果（进度 95→100%）**

创建 Work 记录 + WorkFile 记录，与当前逻辑一致。

---

## 六、种子数据

在 `seed_data.py` 新增 `seed_ai_providers()`：

| slug | name | provider_type | config |
|------|------|-------------|--------|
| `volcano` | 火山方舟(豆包) | `volcano` | `{"api_key": "ark-126678e1-ed22-4716-8ce6-41b7e614327f-2606a", "base_url": "https://ark.cn-beijing.volces.com/api/v3"}` |
| `zhipu` | 智谱AI | `openai` | `{"api_key": "51ec9d1b59934faebafce2b40b54091e.oJe0NMOFhPbFcjJb", "base_url": "https://open.bigmodel.cn/api/paas/v4"}` |
| `deepseek` | DeepSeek | `openai` | `{"api_key": "sk-7fefd3a83a494eed8706b03f8e3cd516", "base_url": "https://api.deepseek.com/v1"}` |

在 `main()` 中调用 `seed_ai_providers(db)`。

---

## 七、涉及文件清单

### 新增文件
| 路径 | 说明 |
|------|------|
| `apps/backend/app/models/api_key.py` | API Key 数据模型 |
| `apps/backend/app/providers/ai/zhipu.py` | 智谱 Provider |
| `apps/backend/app/providers/ai/deepseek.py` | DeepSeek Provider |
| `apps/backend/app/api/v1/middleware/api_key_auth.py` | API Key 认证中间件 |
| `apps/backend/app/api/v1/endpoints/external.py` | 对外 OpenAI 兼容 API |
| `apps/backend/alembic/versions/xxx_add_api_keys.py` | API Key 表 migration |

### 修改文件
| 路径 | 说明 |
|------|------|
| `apps/backend/app/models/user.py` | 无修改 |
| `apps/backend/app/models/system.py` | 无修改 |
| `apps/backend/app/providers/ai/__init__.py` | 注册 zhipu/deepseek |
| `apps/backend/app/providers/ai/doubao.py` | 扩展生图/视频/声音复刻 |
| `apps/backend/app/executors/storybook.py` | 重写执行步骤，用真实 provider |
| `apps/backend/app/seed_data.py` | 新增 seed_ai_providers |
| `apps/backend/app/api/v1/endpoints/users.py` | 新增 API Key 端点 |
| `apps/frontend-user/src/app/tools/storybook-generator/components/StorybookForm.tsx` | 表单升级 |
| `apps/frontend-user/src/components/layout/Sidebar.tsx` | 新增"API密钥"菜单项 |
| 用户中心页面 | 新增 API Key 管理页 |

---

## 八、部署与兼容性

- API Key 表完全独立，不影响现有用户和订单数据
- Storybook 执行器替换为真实 AI，但仍保留 Mock 模式开关（admin 后台控制）
- 新增的 AI Provider 通过 seed_data 配置，不影响已有轮询
- 对外 API 端点通过 `dependencies=[Depends(verify_api_key)]` 独立认证，不影响已有 API
