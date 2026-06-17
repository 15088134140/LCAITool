# 用户端动态表单、文件上传与执行器绑定实施计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

---

## 0. 用户最新决策（2026-06-06）

在计划执行前，用户明确了以下简化方向，替代了原设计中复杂的 `derive` 和 `submitKey` 机制：

1. **去掉 derive 机制**：不再支持通用的派生字段转换。
2. **去掉 submitKey**：不再做字段名重映射；直接统一现有字段名的驼峰/下划线混用问题——项目尚未上线，无需兼容旧数据，大胆改。
3. **storybook-generator include_audio**：后端执行器直接判断 `voiceType` 是否为 `none`，不再需要前端计算并提交 `include_audio` 字段。
4. **storybook-generator page_count null 转换**：交给后端执行器处理，用户端直接提交用户填写的 `page_count` 即可。
5. **storybook-generator art_style 自定义**：改 `ToolParamField` 增加 `allowCustom` 选项，仅对 `select`/`radio` 类型生效。开启 `allowCustom` 后：
   - 自动在选项列表末尾追加一个"自定义"选项（label="自定义"，value="__custom__" 作为占位符）；
   - 用户选择"自定义"时，显示一个额外的文本输入框（必填）；
   - 用户输入的自定义值直接赋给该字段（`art_style` = 用户输入的自定义字符串），不再单独维护 `custom_style` 字段。
6. **前端测试放到后端目录**：不新增前端测试框架，Task 24 改为用后端现有 Playwright/E2E 测试方案。
7. **扩展 param_schema 字段设计简化**：去掉 `derive`、`submitKey`；保留 `section`、`radioCard`、`range`、`condition`、`hidden`、`allowCustom`。

---

**Goal:** 完成"管理后台配置表单字段和执行器，用户端按配置动态渲染表单，并支持文件上传字段后创建任务执行"的完整闭环。

**Architecture:** 复用现有 `Tool.usage_modes` 和 `Tool.param_schema` 作为表单配置基础；新增 `Tool.pricing_schema` 作为统一计价规则配置，前端预估和后端结算都优先按同一份 pricing schema 计算；用户端把动态表单渲染、校验、上传和 `input_params` 组装抽成共享 `DynamicToolForm` 组件，通用工具页面和独立定制工具页面均使用该组件；再把费用预估抽成 `useToolCostEstimate` + `PriceEstimatePanel`，把创建任务、余额不足处理、进度弹窗和完成跳转抽成共享 `useToolGeneration` / `ToolGenerationFlow`，避免各工具页面复制价格和生成流程；新增工具级 `executor_key` 作为显式执行器绑定，并在任务执行时优先使用它、为空时回退旧的 `task_type/tool.slug` 逻辑。文件上传走独立的用户上传接口，动态表单提交前先上传文件，再把文件元数据写入 `input_params`，避免把二进制直接塞进任务 JSON。

**Tech Stack:** FastAPI + SQLAlchemy + Alembic + Celery；React/Next.js 用户端；React/Vite 管理端；TypeScript；现有 axios API client。

---

## 1. 范围确认

本计划覆盖：

1. 管理后台创建/编辑工具时配置：
   - 使用模式：`form`、`dialog`。
   - 表单字段：文本、多行文本、数字、下拉、单选、多选、布尔、日期、文件上传等。
   - 计价规则：通过工具级标准单价字段配置金额，通过 `pricing_schema` 配置计价公式、字段数量、条件计费、默认值和展示明细。
   - 执行器：从后端可用执行器列表选择 `executor_key`。
2. 后端保存和返回：
   - `tools.param_schema`。
   - `tools.pricing_schema`。
   - `tools.executor_key`。
   - 管理端执行器列表接口。
3. 用户端动态渲染：
   - 根据 `tool.param_schema` 渲染表单。
   - 动态表单渲染必须抽成用户端共享组件，通用工具页面和独立定制工具页面都使用同一个组件。
   - 价格预估必须抽成共享 hook/组件，统一读取 `tool.pricing_schema`、工具级标准单价字段和当前表单值。
   - 生成流程必须抽成共享 hook/组件，统一 `createTask`、错误处理、`ProgressModal`、完成跳转。
   - 支持文件上传字段，包括单文件和多文件。
   - 提交前完成上传，并把上传结果写入 `input_params`。
4. 执行器绑定闭环：
   - 创建任务仍兼容现有 `task_type`。
   - Celery 执行时优先使用工具的 `executor_key`。
   - 无 `executor_key` 时回退现有 `task_type` / `slug`。
5. 标杆工具 param_schema 等价迁移：
   - 对现有已实现的标杆工具生成与专用表单完全等价的 `param_schema`。
   - 动态表单渲染后不得丢字段、丢默认值、丢选项、丢条件显示、丢提交参数 key。
   - 首期独立定制工具页面也要使用共享动态表单组件渲染表单区域；定制页面仅保留外层布局、说明、示例、结果引导等差异化内容。
   - 在未通过等价验收前，不下线旧专用表单实现，可保留为开发/回滚兜底；但上线目标是三类标杆定制页和通用页均走同一套动态表单组件。
6. 标杆工具执行器配置迁移：
   - 现有标杆工具不再依赖前端或 worker 中的固定执行器映射作为唯一来源。
   - 执行器绑定必须落到后端工具配置 `Tool.executor_key`。
   - 改造后 `storybook-generator`、`ecommerce-detail`、`product-description` 的执行行为、任务创建、费用估算、进度弹窗、结果跳转不能受影响。
   - 迁移期间保留旧 task_type/slug 解析作为回退，直到标杆工具执行 parity 验收通过。
7. 测试与验证：
   - 后端 API/执行器选择/上传接口测试。
   - 后端 PricingService 和前端价格预估一致性测试。
   - 前端 TypeScript 构建验证。
   - 手工端到端验证动态表单含文件上传。
   - 标杆工具旧专用表单实现与共享动态表单 parity 验证。

不建议本期做：

1. 独立表单设计器拖拽布局。
2. 文件分片上传/断点续传。
3. 云对象存储接入。
4. 对每个执行器输入参数做强类型业务校验；本期只做通用字段校验。

---

## 1.1 标杆工具 param_schema 等价要求

本需求不能只实现"能渲染一个通用表单"，还必须保证项目中已实现的标杆工具可以由 `param_schema` 表达出与当前专用表单等价的界面和提交参数。否则切换到动态表单后会出现字段缺失、默认值缺失、选项缺失、条件字段不可用、执行器拿不到原有参数等问题。

注意：**项目尚未上线，无需兼容旧数据，大胆统一字段命名**。现有驼峰/下划线混用问题直接统一为一致的命名（优先跟随表单当前 UI 字段名，同时同步更新后端执行器读取）。

当前只读梳理确认的标杆工具包括：

1. `storybook-generator`
   - 专用表单文件：`apps/frontend-user/src/app/tools/storybook-generator/components/StorybookForm.tsx`
   - 当前专用表单字段/行为（**统一后命名**）：
     - `inputMode`: 创作方式，`theme` / `storyContent` 二选一。
     - `theme`: 绘本主题，默认 `小蝌蚪找妈妈`，当 `inputMode=theme` 时必填。
     - `storyContent`: 故事文案，当 `inputMode=storyContent` 时必填。
     - `art_style`: 艺术风格，默认 `cartoon`，选项包含 `cartoon/oil/watercolor/flat` + `allowCustom=true`（用户选择"自定义"时直接输入自定义字符串作为 `art_style` 的值）。
     - `voiceType`: 配音音色，默认 `tongtong`，选项包含 `tongtong/xiaochen/chuichui/luodo/none`；**不再提交 include_audio**，后端执行器直接判断 `voiceType !== 'none'`。
     - `target_age`: 目标年龄段，默认 `3-6`，选项包含 `3-6/6-9/9-12`。
     - `smart_page_count`: 智能决策页数，默认 `false`。
     - `page_count`: 绘本页数，默认 `1`，range `1-30`，当 `smart_page_count=true` 时禁用；**前端直接提交用户输入值**，null 转换由后端执行器处理。
     - `hasBackgroundMusic`: 是否添加背景音乐。
     - `hasSoundEffects`: 是否添加音效。
   - 现有 seed 中的 `param_schema` 不等价：缺少 `inputMode/storyContent/hasBackgroundMusic/hasSoundEffects`，且存在 `style/prompt/language` 等与当前专用表单不一致的字段。

2. `ecommerce-detail`
   - 专用表单文件：`apps/frontend-user/src/app/tools/ecommerce-detail/components/EcommerceForm.tsx`
   - 当前专用表单字段/行为（**统一后命名**）：
     - `productName`: 商品名称，必填。
     - `productCategory`: 商品类目，选项包含 `electronics/fashion/beauty/food/home/other`。
     - `productFeatures`: 核心卖点，必填，多行文本。
     - `targetAudience`: 目标人群。
     - `imageStyle`: 视觉风格，默认 `professional`，选项包含 `professional/minimal/lifestyle/tech`。
     - `mainImageCount`: 主图数量，默认 `3`，range `1-5`；**直接用这个 key 提交**，不做下划线映射，同步更新后端执行器读取。
     - `detailImageCount`: 详情图数量，默认 `3`，range `2-10`；**直接用这个 key 提交**，不做下划线映射，同步更新后端执行器读取。
     - `includePsd`: 是否导出 PSD 源文件，默认 `true`。
     - 当前专用表单把 slug `ecommerce-detail` 映射为 task_type `ecommerce`。
   - 现有 seed 中的 `param_schema` 不等价：key 使用 `product_name/product_features/brand_style/image_count`，与专用表单不一致，且缺少多个字段和默认值。

3. `product-description`
   - 专用表单文件：`apps/frontend-user/src/app/tools/marketing-copywriter/components/MarketingForm.tsx`
   - 当前专用表单字段/行为（**统一后命名**）：
     - `productOrBrand`: 产品/品牌名称，界面标记必填。
     - `keySellingPoints`: 核心卖点，界面标记必填，多行文本。
     - `targetPlatform`: 目标平台，默认 `all`，当前 UI 选项包含 `xiaohongshu/wechat/douyin/weibo`；实现时 options 中补一个 `{ label: "全平台", value: "all" }` 选项，使默认值和可选项一致。
     - `toneStyle`: 文案风格，默认 `professional`，选项包含 `professional/friendly/humorous/luxury`。
     - `copyLength`: 文案长度，默认 `medium`，选项包含 `short/medium/long`。
     - `platformCount`: 生成平台数量，默认 `3`；当前 UI 未显示明显输入控件，迁移时标记为 hidden 字段，保留默认值提交。
     - 当前专用表单把 slug `product-description` 映射为 task_type `marketing`。
   - 现有 seed 中的 `param_schema` 不等价：key 使用 `product_name/keywords/platform/tone/output_count`，与专用表单不一致。

等价实现要求：

1. 为上述标杆工具建立 `param_schema` fixture/常量，字段 key、默认值、选项、必填规则、条件显示、禁用规则必须与当前专用表单一致；**不再有 submitKey/derive**。
2. 动态表单渲染器必须支持表达这些专用交互：
   - 分组/步骤标题，例如"基础信息""风格设置""受众设置"。
   - 卡片式 radio，包含 icon/desc。
   - range slider。
   - 条件显示（例如 `theme` 仅在 `inputMode=theme` 时显示）、条件禁用（例如 `page_count` 在 `smart_page_count=true` 时禁用）。
   - `allowCustom` 机制（仅对 select/radio 生效）：开启后自动追加"自定义"选项，选择后显示额外文本输入框，用户输入值直接赋给该字段。
   - hidden 字段（有 defaultValue，提交但不显示）。
3. 三个标杆工具的独立定制页面首期也必须切换为共享动态表单组件渲染表单主体；页面自身只负责工具专属外壳、说明文案、示例展示、费用/进度/结果引导等差异化内容。
4. 在三个标杆工具未通过 parity 验收前，现有专用表单实现应保留为开发/回滚兜底，不直接删除；但不能作为新的长期主路径继续维护两套表单逻辑。
5. 通用工具页面和独立定制工具页面必须复用同一个 `DynamicToolForm`，文件上传、字段校验、默认值、条件显示、提交转换和 `input_params` 组装不得分叉实现。
6. 如果某个定制工具需要特殊字段展示，优先通过扩展 `param_schema` 表达；只有动态 schema 确实无法覆盖的外层交互，才允许页面额外包一层自定义逻辑。
7. seed_data 或迁移脚本中的标杆工具 `param_schema` 必须升级为等价 schema；不能继续保留当前简化版 schema 作为最终方案。
8. 增加测试或快照，验证标杆工具 `param_schema` 至少包含当前专用表单所有提交参数和必要 UI 元信息。
9. **同步更新后端执行器**：匹配统一后的字段命名，去掉对 include_audio 的读取，根据 voiceType 判断，page_count null 转换由执行器自行处理。

---

## 1.2 标杆工具执行器后端配置要求

本次改造后，现有标杆工具的执行器绑定必须从后端工具配置读取，而不是依赖前端页面或 worker 内部固定写死的唯一映射。目标是"绑定方式可配置，但现有工具执行行为完全不变"。

标杆工具的 canonical 配置建议：

| 工具 slug | 后端 `executor_key` | 执行器类 | 说明 |
| --- | --- | --- | --- |
| `storybook-generator` | `storybook-generator` | `StorybookExecutor` | 绘本生成 |
| `ecommerce-detail` | `ecommerce-detail` | `EcommerceExecutor` | 电商详情页 |
| `product-description` | `product-description` | `MarketingExecutor` | 营销/商品文案 |

兼容要求：

1. `Tool.executor_key` 是最终执行器绑定来源。
   - `storybook-generator.executor_key = "storybook-generator"`
   - `ecommerce-detail.executor_key = "ecommerce-detail"`
   - `product-description.executor_key = "product-description"`

2. seed_data、迁移脚本或初始化脚本必须为现有标杆工具补齐 `executor_key`。
   - 新库初始化时直接写入。
   - 旧库升级时通过迁移或一次性 backfill 补齐。

3. 执行解析顺序必须是：
   - 优先按任务的 `tool_id` 查询 `Tool.executor_key`。
   - 如果 `executor_key` 存在，用它选择执行器。
   - 如果 `executor_key` 为空，才回退到旧的 `task_type` / slug 解析。

4. 迁移期间必须保留旧 task_type alias，避免现有任务或前端旧路径受影响。
   - 当前只读检查发现专用前端存在历史映射：
     - `ecommerce-detail -> ecommerce`
     - `product-description -> marketing`
   - worker 当前映射又包含：
     - `ecommerce-detail`
     - `product-description`
   - 实施时不能简单删除任一侧；registry 应支持 canonical key 和 legacy alias，例如：
     - `ecommerce` alias 到 `ecommerce-detail`
     - `marketing` alias 到 `product-description`
   - 但数据库 `Tool.executor_key` 应保存 canonical key，不保存 alias。

5. 标杆工具执行 parity 验收必须覆盖：
   - 使用旧专用表单提交任务仍能成功。
   - 使用动态表单提交同等参数仍能成功。
   - `tool_id + executor_key` 生效时，即使 `task_type` 是旧 alias，也能选择正确执行器。
   - 缺少 `executor_key` 的旧工具仍可按旧 `task_type` 回退。
   - 执行进度、费用估算、ProgressModal、完成后跳转作品详情不变。

6. 完成迁移后，前端不应再承担"工具 slug 到执行器 key"的职责。
   - 前端创建任务仍可传 `task_type` 用于兼容和展示。
   - 真正选择执行器由后端根据 `tool_id -> Tool.executor_key` 决定。
   - 后续新增工具只需在后台选择执行器，不需要改前端硬编码映射。

---

## 2. 推荐 param_schema 结构

现有字段结构是 `{ key, label, type, order }`。建议兼容旧结构并扩展为：

```json
[
  {
    "key": "prompt",
    "label": "生成要求",
    "type": "textarea",
    "required": true,
    "placeholder": "请输入你想生成的内容",
    "helpText": "尽量描述清楚风格、用途和限制",
    "defaultValue": "",
    "order": 1
  },
  {
    "key": "style",
    "label": "风格",
    "type": "select",
    "required": true,
    "options": [
      { "label": "写实", "value": "realistic" },
      { "label": "插画", "value": "illustration" }
    ],
    "order": 2
  },
  {
    "key": "reference_images",
    "label": "参考图片",
    "type": "file",
    "required": false,
    "accept": "image/*",
    "multiple": true,
    "maxSizeMB": 10,
    "maxFiles": 5,
    "order": 3
  }
]
```

字段类型建议首期支持：

- `text`
- `textarea`
- `number`
- `select`
- `radio`
- `checkbox`
- `boolean`
- `date`
- `file`

文件字段提交到任务里的形态建议：

单文件：

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

多文件：

```json
{
  "reference_images": [
    {
      "file_id": "uuid",
      "file_name": "demo-1.png",
      "file_size": 12345,
      "mime_type": "image/png",
      "url": "/api/v1/files/uploads/uuid"
    }
  ]
}
```

---

## 2.1 完整 param_schema 字段规范（不含 derive/submitKey）

基于用户最新决策，去掉 `derive`、`submitKey`；保留以下字段类型和扩展能力。

### 2.1.1 字段通用属性

所有字段（除 section）都包含以下属性：

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `key` | string | 是 | 字段唯一标识，直接作为提交参数 key，建议用 snake_case 或 camelCase（执行器怎么期望就怎么写） |
| `label` | string | 是 | 用户可见的字段标签 |
| `type` | string | 是 | 字段类型，见 §2.1.2 |
| `required` | boolean | 否 | 是否必填，默认 false |
| `placeholder` | string | 否 | 输入框占位符 |
| `helpText` | string | 否 | 字段帮助说明 |
| `defaultValue` | any | 否 | 默认值 |
| `order` | number | 否 | 排序，从小到大 |
| `condition` | object | 否 | 条件显示/禁用，见 §2.1.4 |

### 2.1.2 字段类型列表

| type | 渲染 | 提交类型 | 额外属性 |
|------|------|----------|----------|
| `text` | 单行文本 | string | |
| `textarea` | 多行文本 | string | |
| `number` | 数字输入框 | number | `min`, `max` |
| `select` | 下拉框 | string/number | `options` |
| `radio` | 普通单选 | string/number | `options`, `allowCustom` |
| `checkbox` | 多选框 | array | `options` |
| `boolean` | 开关/复选框 | boolean | |
| `date` | 日期选择 | string | |
| `file` | 文件上传 | object/array | `accept`, `multiple`, `maxSizeMB`, `maxFiles` |
| `range` | 滑块 | number | `min`, `max`, `step` |
| `radioCard` | 卡片式单选 | string/number | `options`, `allowCustom` |
| `section` | 分组标题 | 不提交 | |
| `hidden` | 隐藏 | any | `defaultValue`（必填） |

### 2.1.3 选项型 options 结构

`select` / `radio` / `checkbox` / `radioCard` 的 options：

```json
{
  "options": [
    {
      "label": "卡通水彩",
      "value": "cartoon",
      "icon": "🎨",
      "desc": "适合儿童绘本"
    }
  ]
}
```

- `icon` 和 `desc` 是可选的，仅在 `radioCard` 中生效

### 2.1.4 condition 条件显示/禁用

```json
{
  "condition": {
    "when": {
      "field": "smart_page_count",
      "operator": "eq",
      "value": false
    },
    "effect": "enable"
  }
}
```

| 属性 | 值 | 说明 |
|------|-----|------|
| `when.operator` | `eq` / `neq` / `in` / `nin` | 等于/不等于/包含/不包含 |
| `when.value` | any | 目标值 |
| `effect` | `show` / `hide` / `enable` / `disable` | 显示/隐藏/启用/禁用 |

- 隐藏的字段即使有 defaultValue 也不提交（除非是 hidden 类型）

### 2.1.5 allowCustom 自定义选项

仅对 `select` / `radio` / `radioCard` 生效：

```json
{
  "type": "radioCard",
  "allowCustom": true,
  "options": [
    { "label": "卡通", "value": "cartoon", "icon": "🎨" },
    { "label": "油画", "value": "oil", "icon": "🖼️" },
    { "label": "水彩", "value": "watercolor", "icon": "🌸" },
    { "label": "扁平", "value": "flat", "icon": "💎" }
  ]
}
```

- 自动在 options 末尾追加：`{ "label": "自定义", "value": "__custom__", "icon": "✏️" }`
- 用户选择"自定义"时，显示一个额外的文本输入框（必填）
- 用户输入的自定义值直接赋给该字段（不再有单独的 `custom_style` 字段）

---

## 2.2 完整标杆工具示例：storybook-generator param_schema

```json
[
  {
    "key": "_section_basic",
    "type": "section",
    "label": "基础信息",
    "order": 1
  },
  {
    "key": "inputMode",
    "label": "创作方式",
    "type": "radioCard",
    "required": true,
    "defaultValue": "theme",
    "options": [
      {
        "label": "主题创作",
        "value": "theme",
        "icon": "📝",
        "desc": "输入关键词，AI 自动创作故事"
      },
      {
        "label": "文案改编",
        "value": "storyContent",
        "icon": "📖",
        "desc": "粘贴已有文案，AI 提炼为绘本"
      }
    ],
    "order": 2
  },
  {
    "key": "theme",
    "label": "绘本主题",
    "type": "text",
    "required": true,
    "placeholder": "例如：小兔子的森林冒险",
    "defaultValue": "小蝌蚪找妈妈",
    "order": 3,
    "condition": {
      "when": { "field": "inputMode", "operator": "eq", "value": "theme" },
      "effect": "show"
    }
  },
  {
    "key": "storyContent",
    "label": "故事文案",
    "type": "textarea",
    "required": true,
    "placeholder": "粘贴您已有的故事文案，AI 将提炼为绘本故事大纲...",
    "order": 4,
    "condition": {
      "when": { "field": "inputMode", "operator": "eq", "value": "storyContent" },
      "effect": "show"
    }
  },
  {
    "key": "_section_style",
    "type": "section",
    "label": "风格设置",
    "order": 10
  },
  {
    "key": "art_style",
    "label": "艺术风格",
    "type": "radioCard",
    "required": true,
    "defaultValue": "cartoon",
    "options": [
      { "label": "卡通水彩", "value": "cartoon", "icon": "🎨" },
      { "label": "梦幻油画", "value": "oil", "icon": "🖼️" },
      { "label": "日系动漫", "value": "watercolor", "icon": "🌸" },
      { "label": "扁平插画", "value": "flat", "icon": "💎" }
    ],
    "allowCustom": true,
    "order": 11
  },
  {
    "key": "target_age",
    "label": "目标年龄段",
    "type": "select",
    "required": true,
    "defaultValue": "3-6",
    "options": [
      { "label": "3-6岁", "value": "3-6" },
      { "label": "6-9岁", "value": "6-9" },
      { "label": "9-12岁", "value": "9-12" }
    ],
    "order": 12
  },
  {
    "key": "smart_page_count",
    "label": "智能决策页数",
    "type": "boolean",
    "defaultValue": false,
    "order": 13
  },
  {
    "key": "page_count",
    "label": "绘本页数",
    "type": "number",
    "required": false,
    "min": 1,
    "max": 30,
    "defaultValue": 1,
    "order": 14,
    "condition": {
      "when": { "field": "smart_page_count", "operator": "eq", "value": false },
      "effect": "enable"
    }
  },
  {
    "key": "_section_audio",
    "type": "section",
    "label": "音频设置",
    "order": 20
  },
  {
    "key": "voiceType",
    "label": "配音音色",
    "type": "radioCard",
    "required": false,
    "defaultValue": "tongtong",
    "options": [
      { "label": "温柔女声", "value": "tongtong", "icon": "👩" },
      { "label": "磁性男声", "value": "xiaochen", "icon": "👨" },
      { "label": "可爱童声", "value": "chuichui", "icon": "👧" },
      { "label": "故事主播", "value": "luodo", "icon": "🧙" },
      { "label": "不需要", "value": "none", "icon": "🚫" }
    ],
    "order": 21
  },
  {
    "key": "hasBackgroundMusic",
    "label": "添加背景音乐",
    "type": "boolean",
    "defaultValue": false,
    "order": 22
  },
  {
    "key": "hasSoundEffects",
    "label": "添加音效",
    "type": "boolean",
    "defaultValue": false,
    "order": 23
  }
]
```

---

## 2.2 推荐 pricing_schema 结构

本方案把定价体系拆成两层：

1. 工具级标准单价变量：负责"多少钱"。
2. `pricing_schema`：负责"怎么算"。

也就是说，`pricing_schema` 默认不直接写死金额，而是通过 `amount_ref` / `unit_amount_ref` 引用工具表中的单价字段。

### 2.1.1 工具级标准单价变量

现有工具表中的这些字段不再只是"旧字段兼容"，而是作为首期标准价格变量继续保留：

| 字段 | 推荐语义 | 计价单位 |
| --- | --- | --- |
| `base_fee` | 单次任务基础服务费 | 每个任务收一次 |
| `image_fee` | 图片生成单价 | 每生成 1 张图片收一次 |
| `audio_fee` | 语音/音频生成单价 | 每生成 1 段语音/音频收一次 |
| `token_fee` | Token 单价 | 建议定义为每 1000 token 的积分价格 |

关键约束：

1. `image_fee` 固定代表"每张图片单价"，不能在某些工具里解释成整单图片费用。
2. `audio_fee` 固定代表"每段语音/音频单价"，不能在某些工具里解释成一次语音任务费用。
3. 如果后续需要"一次语音任务固定费""高清视频费""模板授权费"等新费用，不复用现有字段，应新增明确单价字段，例如 `audio_base_fee`、`video_fee`、`template_fee`，再加入 schema 可引用白名单。
4. 价格金额只维护在工具级单价字段中；`pricing_schema` 只引用这些字段并描述组合规则。

### 2.1.2 存储位置

建议在 `tools` 表新增 JSON 字段：

```python
pricing_schema = Column(JSON, nullable=True, comment="工具计价规则配置")
```

同时继续保留：

- `base_fee`
- `image_fee`
- `audio_fee`
- `token_fee`

读取优先级：

1. 如果 `tool.pricing_schema` 存在且 `version` 支持，使用 `pricing_schema + 工具级单价字段` 计算。
2. 如果 `pricing_schema` 为空，回退到现有执行器 `estimate_cost(params)` 或旧展示逻辑，保证未迁移工具不受影响。
3. 新工具默认应配置 `pricing_schema`；旧工具逐步补齐后再考虑隐藏旧的回退逻辑。

### 2.1.3 顶层结构

推荐结构：

```json
{
  "version": 1,
  "currency": "credits",
  "rounding": "ceil",
  "min_total": 0,
  "max_total": null,
  "items": [
    {
      "key": "base",
      "type": "fixed",
      "label": "基础服务费",
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

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `version` | number | schema 版本，首期固定为 `1` |
| `currency` | string | 计价单位，首期固定为 `credits` |
| `rounding` | string | 舍入规则：`ceil` / `floor` / `round`，积分建议 `ceil` |
| `min_total` | number | 最低价格，可为空 |
| `max_total` | number/null | 最高价格，可为空 |
| `items` | array | 计价项列表，按顺序计算并展示 |
| `display` | object | 前端展示配置，只影响展示，不影响计算 |

### 2.1.4 可引用价格字段白名单

首期只允许 `amount_ref` / `unit_amount_ref` 引用以下字段：

```json
[
  "base_fee",
  "image_fee",
  "audio_fee",
  "token_fee"
]
```

后续新增单价字段时，需要同时：

1. 在 `Tool` 模型和管理后台增加字段。
2. 在 `PricingService` 的引用白名单中加入该字段。
3. 在用户端价格预估工具中加入该字段类型定义。
4. 明确该字段的业务语义和计价单位。

不建议让后台运营自由填写任意 ref 字符串，否则容易出现拼写错误或引用不存在字段。

### 2.1.5 items 计价项类型

首期建议只支持 3 类，覆盖当前标杆工具即可，避免一开始做成复杂规则引擎。

#### A. fixed：固定费用

```json
{
  "key": "base",
  "type": "fixed",
  "label": "基础服务费",
  "amount_ref": "base_fee"
}
```

计算：

```text
total += tool[amount_ref]
```

适用：单次任务基础服务费。

首期普通后台模式不暴露直接金额字段 `amount`。如果未来确实需要临时固定金额，可作为高级能力另行讨论，但默认不使用，避免和工具级单价字段产生双重价格来源。

#### B. per_unit：按字段数量计费

```json
{
  "key": "page_images",
  "type": "per_unit",
  "label": "插画生成费",
  "field": "page_count",
  "unit_amount_ref": "image_fee",
  "default_quantity": 1,
  "min_quantity": 1,
  "max_quantity": 30
}
```

计算：

```text
quantity = input_params[field]
如果 quantity 为空或 null，使用 default_quantity
quantity 经过 min_quantity/max_quantity 限制
total += quantity * tool[unit_amount_ref]
```

适用：图片张数、绘本页数、音频段数、输出数量、平台数量等。

**null 处理约定**：当 `quantity` 为 `null` 时（例如 `smart_page_count=true` 导致 `page_count=null`），使用 `default_quantity` 并生成 warning 提示"数量为空，按默认值预估"。前后端保持一致。

`per_unit` 可选支持 `unit_size`，用于 token 计费：

```json
{
  "key": "tokens",
  "type": "per_unit",
  "label": "Token 消耗",
  "field": "estimated_tokens",
  "unit_amount_ref": "token_fee",
  "unit_size": 1000,
  "default_quantity": 0
}
```

计算：

```text
total += ceil(quantity / unit_size) * tool[token_fee]
```

#### C. conditional：条件启用某个计价项

条件本身不直接代表金额，推荐把 `when` 挂到 `fixed` 或 `per_unit` 上。

例如：只有选择配音时，按页数收取每段语音费用：

```json
{
  "key": "page_audio",
  "type": "per_unit",
  "label": "语音合成费",
  "field": "page_count",
  "unit_amount_ref": "audio_fee",
  "default_quantity": 1,
  "min_quantity": 1,
  "max_quantity": 30,
  "when": {
    "field": "include_audio",
    "operator": "eq",
    "value": true
  }
}
```

计算：

```text
如果 when 条件不成立：本 item amount = 0
如果 when 条件成立：按 item 原类型计算
```

首期支持的 operator：

- `eq`
- `ne`
- `gt`
- `gte`
- `lt`
- `lte`
- `in`
- `not_in`
- `truthy`
- `falsy`

### 2.1.6 暂不推荐 expression 首期上线

`expression` 可以表达 `main_image_count + detail_image_count`，但会带来前后端表达式求值一致性和安全校验问题。

首期推荐不用 `expression`，而是用多个 `per_unit` item 表达组合费用。例如电商详情页：

```json
[
  {
    "key": "main_images",
    "type": "per_unit",
    "label": "主图生成费",
    "field": "main_image_count",
    "unit_amount_ref": "image_fee",
    "default_quantity": 3
  },
  {
    "key": "detail_images",
    "type": "per_unit",
    "label": "详情图生成费",
    "field": "detail_image_count",
    "unit_amount_ref": "image_fee",
    "default_quantity": 3
  }
]
```

如果后续确实需要复杂公式，再作为第二阶段增加受限 `expression`，并优先考虑只在后端计算、前端调用预估接口。

### 2.1.7 计算返回结构

后端 `PricingService` 和前端 `useToolCostEstimate` 都应该产出同样形态：

```json
{
  "total": 18,
  "currency": "credits",
  "breakdown": [
    {
      "key": "base",
      "label": "基础服务费",
      "amount": 8,
      "quantity": 1,
      "unit_amount": 8,
      "amount_ref": "base_fee"
    },
    {
      "key": "main_images",
      "label": "主图生成费",
      "amount": 6,
      "quantity": 3,
      "unit_amount": 2,
      "unit_amount_ref": "image_fee"
    }
  ],
  "warnings": []
}
```

说明：

- `pricing_schema` 中不写死金额；计算结果里的 `amount` / `unit_amount` 是运行时解析单价变量后的结果，用于展示和记录。
- `total` 是最终积分消耗。
- `breakdown` 用于用户端展示价格明细。
- `warnings` 用于提示配置异常或字段缺失，例如 `page_count` 缺失时使用默认值。
- 前端展示的是"预计消耗"，最终扣费以创建任务时后端计算为准。

### 2.1.8 后端 PricingService 规则

建议新增：

```text
apps/backend/app/services/pricing_service.py
```

核心接口：

```python
class PricingService:
    @staticmethod
    def estimate_tool_cost(tool: Tool, input_params: dict[str, Any]) -> PricingResult:
        ...
```

行为：

1. 如果 `tool.pricing_schema` 有效：
   - 按 schema 读取 `amount_ref` / `unit_amount_ref`。
   - 从 `Tool` 对象读取对应单价变量。
   - 计算 `total + breakdown + warnings`。
2. 如果 `pricing_schema` 为空或不支持：
   - 回退执行器现有 `estimate_cost(params)`。
   - 或使用当前旧逻辑。
3. 创建任务前必须以后端计算结果为准：
   - 前端传入的 `estimated_cost` 只能作为展示/调试参考，不能作为扣费依据。
4. 后端扣费、余额校验、任务记录中的 cost 字段都使用 `PricingService` 结果。
5. 如果 schema 引用不存在的价格字段，或价格字段为空/非法：
   - 管理端保存时尽量拦截。
   - 创建任务时返回明确错误，避免静默按 0 计费。

### 2.1.9 前端价格预估

用户端新增：

```text
apps/frontend-user/src/components/tool-detail/useToolCostEstimate.ts
apps/frontend-user/src/components/tool-detail/PriceEstimatePanel.tsx
```

`useToolCostEstimate` 职责：

- 接收 `tool.pricing_schema`、工具级单价字段、当前表单值。
- 根据 `amount_ref` / `unit_amount_ref` 解析价格变量。
- 计算预计总价和 breakdown。
- 当 `pricing_schema` 为空时，按兼容规则显示旧逻辑价格。
- 不负责扣费，只负责展示。
- 当 `input_params` 中对应 `field` 的值为 `null` 时，使用 `default_quantity` 并产出 warning。

`PriceEstimatePanel` 职责：

- 显示总积分。
- 可展开/收起明细。
- 显示 warning，例如"页数为空，按默认 1 页预估"。
- 被通用工具页、独立定制页、DialogMode 复用。

工具详情接口需要向用户端返回：

```ts
base_fee?: number;
image_fee?: number;
audio_fee?: number;
token_fee?: number;
pricing_schema?: PricingSchema | null;
```

如果后续不希望前端暴露单价字段，或者计价规则复杂化，可以增加后端预估接口：

```http
POST /api/v1/tools/{tool_id}/estimate-cost
```

请求：

```json
{
  "input_params": {
    "page_count": 5,
    "include_audio": true
  }
}
```

响应同 `PricingResult`。首期推荐先实现本地计算 + 单元测试对齐；后续如果计价规则复杂化，再改为调用后端实时预估接口。

### 2.1.10 管理后台配置方式

管理后台创建/编辑工具时增加 `PricingSchemaEditor`，建议首期做"结构化表单 + JSON 高级编辑"两种入口。

结构化表单支持：

- 添加固定费用 `fixed`。
- 添加按字段数量计费 `per_unit`。
- 给任意计价项增加 `when` 条件。
- 选择字段时从当前 `param_schema` 字段 key 中下拉选择，减少输错。
- 选择价格变量时从白名单中下拉选择：`base_fee`、`image_fee`、`audio_fee`、`token_fee`。
- 配置展示 label、default_quantity、min/max、unit_size。

高级 JSON 编辑支持：

- 直接编辑完整 `pricing_schema`。
- 保存前做 JSON parse 和基础 schema 校验。
- 校验失败不允许提交。

保存校验：

- `version` 必须为 `1`。
- `currency` 首期必须为 `credits`。
- 每个 item 的 `key` 必填且唯一。
- `fixed.amount_ref` 必须引用白名单价格字段。
- `per_unit.unit_amount_ref` 必须引用白名单价格字段。
- `per_unit.field` 必须存在于 `param_schema`，除非明确标记为派生字段白名单。
- `when.field` 必须存在于 `param_schema` 或派生字段白名单。
- 不允许普通模式保存 `amount` / `unit_amount` 这种直接金额字段。

### 2.1.11 工具级单价变量与 pricing_schema 的关系

最终口径：

```text
base_fee/image_fee/audio_fee/token_fee 是工具级标准单价变量。
pricing_schema 不负责保存具体金额，只负责引用价格变量并定义计价公式。
```

过渡期建议：

1. `base_fee/image_fee/audio_fee/token_fee` 继续保留在工具表和后台表单中。
2. `pricing_schema` 通过 `amount_ref` / `unit_amount_ref` 引用这些字段。
3. 旧工具如果没有 `pricing_schema`，保持旧行为不变。
4. 新工具必须配置 `pricing_schema`，但金额仍填在标准单价字段里。
5. 等所有工具迁移完成并验证后，再考虑隐藏旧回退逻辑；不建议本期删除标准单价字段。

### 2.1.12 标杆工具 pricing_schema 示例

#### storybook-generator

语义：基础费 + 每页插画费 + 如果配音则每页语音费。

```json
{
  "version": 1,
  "currency": "credits",
  "rounding": "ceil",
  "min_total": 0,
  "max_total": null,
  "items": [
    {
      "key": "base",
      "type": "fixed",
      "label": "绘本生成基础费",
      "amount_ref": "base_fee"
    },
    {
      "key": "page_images",
      "type": "per_unit",
      "label": "插画生成费",
      "field": "page_count",
      "unit_amount_ref": "image_fee",
      "default_quantity": 1,
      "min_quantity": 1,
      "max_quantity": 30
    },
    {
      "key": "page_audio",
      "type": "per_unit",
      "label": "语音合成费",
      "field": "page_count",
      "unit_amount_ref": "audio_fee",
      "default_quantity": 1,
      "min_quantity": 1,
      "max_quantity": 30,
      "when": {
        "field": "include_audio",
        "operator": "eq",
        "value": true
      }
    }
  ],
  "display": {
    "show_breakdown": true,
    "total_label": "预计消耗",
    "unit_label": "积分"
  }
}
```

注意：如果 `smart_page_count=true` 时 `page_count=null`，`per_unit` 用 `default_quantity=1` 计算并产出 warning。前端预估和后端扣费都使用同一规则。

#### ecommerce-detail

语义：基础费 + 主图张数 * 图片单价 + 详情图张数 * 图片单价。

```json
{
  "version": 1,
  "currency": "credits",
  "rounding": "ceil",
  "items": [
    {
      "key": "base",
      "type": "fixed",
      "label": "电商详情页基础费",
      "amount_ref": "base_fee"
    },
    {
      "key": "main_images",
      "type": "per_unit",
      "label": "主图生成费",
      "field": "main_image_count",
      "unit_amount_ref": "image_fee",
      "default_quantity": 3,
      "min_quantity": 1,
      "max_quantity": 5
    },
    {
      "key": "detail_images",
      "type": "per_unit",
      "label": "详情图生成费",
      "field": "detail_image_count",
      "unit_amount_ref": "image_fee",
      "default_quantity": 3,
      "min_quantity": 2,
      "max_quantity": 10
    }
  ],
  "display": {
    "show_breakdown": true,
    "total_label": "预计消耗",
    "unit_label": "积分"
  }
}
```

如果未来 PSD 源文件要收费，应新增明确价格变量，例如 `psd_fee` 或 `source_file_fee`，再在 schema 中用 `amount_ref` 引用；不要临时把 `base_fee` 或 `image_fee` 挪作 PSD 费用。

#### product-description

语义：当前保持固定基础费，不按平台数额外收费。

```json
{
  "version": 1,
  "currency": "credits",
  "rounding": "ceil",
  "items": [
    {
      "key": "base",
      "type": "fixed",
      "label": "营销文案基础费",
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

如果后续要按平台数量收费，建议新增 `platform_fee` 或复用明确语义的已有字段；不要让 `token_fee` 或 `audio_fee` 承担平台费含义。

### 2.1.13 验收标准

必须满足：

1. 后台创建/编辑工具可以保存并回显 `pricing_schema`。
2. 后台普通模式只能选择价格变量引用，不直接填写 item 金额。
3. 用户端通用工具页和独立定制工具页都使用同一套 `useToolCostEstimate` / `PriceEstimatePanel`。
4. 创建任务时后端使用 `PricingService` 重新计算，不信任前端传入价格。
5. 三个标杆工具迁移后价格与当前执行器 `estimate_cost` 结果保持一致，除非业务明确确认价格调整。
6. `pricing_schema` 为空的旧工具仍能使用旧计价逻辑。
7. 前端预估和后端计算至少用相同 fixtures 做一致性测试。

---

## 3. 任务拆分

### Task 1: 重新确认工作区状态

**Objective:** 动代码前确认当前分支和未提交改动，避免覆盖用户工作。

**Files:** 无业务文件修改。

**Steps:**

1. 运行：

```bash
cd /c/MyProject/LCAITool && git branch --show-current && git status --short
```

2. 如果存在未提交改动，先向用户说明，并确认哪些可以编辑。

**Verification:** 明确当前分支名和工作区状态。

---

### Task 2: 后端新增 `Tool.executor_key`

**Objective:** 为工具增加显式执行器绑定字段。

**Files:**

- Modify: `apps/backend/app/models/tool.py`
- Modify: `apps/backend/app/schemas/tool.py`
- Create: `apps/backend/alembic/versions/<revision>_add_executor_key_to_tools.py`
- Test: `apps/backend/tests/test_admin_tool_executor_key.py`

**Implementation notes:**

1. `Tool` 模型新增 nullable string 字段：

```python
executor_key = Column(String(100), nullable=True, index=True, comment="执行器Key，为空时回退slug/task_type")
```

2. `ToolCreate`、`ToolUpdate`、`ToolResponse` 增加：

```python
executor_key: Optional[str] = None
```

3. Alembic 迁移新增 `tools.executor_key`。

**Tests:**

- 创建工具时保存 `executor_key`。
- 更新工具时修改 `executor_key`。
- 获取工具详情返回 `executor_key`。

**Verification command:**

```bash
cd /c/MyProject/LCAITool/apps/backend && pytest tests/test_admin_tool_executor_key.py -q
```

---

### Task 3: 后端增加执行器注册/列表能力

**Objective:** 把硬编码 `EXECUTOR_MAP` 整理成可复用 registry，并提供管理后台选择执行器所需列表。

**Files:**

- Create: `apps/backend/app/executors/registry.py`
- Modify: `apps/backend/app/workers/tasks.py`
- Modify: `apps/backend/app/api/v1/endpoints/admin.py`
- Test: `apps/backend/tests/test_executor_registry.py`

**Registry shape:**

```python
EXECUTOR_REGISTRY = {
    "storybook-generator": {
        "key": "storybook-generator",
        "name": "绘本生成执行器",
        "description": "生成绘本、页面图片、音频、PDF",
        "class": StorybookExecutor,
        "aliases": [],
    },
    "ecommerce-detail": {
        "key": "ecommerce-detail",
        "name": "电商详情页执行器",
        "description": "生成电商详情页素材",
        "class": EcommerceExecutor,
        "aliases": ["ecommerce"],
    },
    "product-description": {
        "key": "product-description",
        "name": "营销文案执行器",
        "description": "生成商品/营销文案",
        "class": MarketingExecutor,
        "aliases": ["marketing"],
    },
}
```

Registry 需要提供：

```python
def resolve_executor_key(key_or_alias: str) -> str | None:
    """把 canonical key 或 legacy alias 解析为 canonical executor_key。"""


def get_executor_class(key_or_alias: str) -> type[BaseToolExecutor] | None:
    """支持 canonical key 和 legacy alias。"""
```

注意：

- 管理后台选择和数据库保存只使用 canonical `key`。
- `aliases` 仅用于兼容历史 `task_type`，不在后台作为推荐选项保存。

**Admin API:**

```http
GET /api/v1/admin/executors
```

Response:

```json
[
  { "key": "storybook-generator", "name": "绘本生成执行器", "description": "..." }
]
```

**Tests:**

- registry 能按 canonical key 返回执行器类。
- registry 能按 legacy alias 返回同一个执行器类：`ecommerce -> EcommerceExecutor`、`marketing -> MarketingExecutor`。
- `resolve_executor_key("ecommerce") == "ecommerce-detail"`。
- `resolve_executor_key("marketing") == "product-description"`。
- admin executors API 返回 canonical key/name/description，不暴露 class，不把 alias 当作独立执行器选项。

---

### Task 4: 执行任务时优先使用工具的 `executor_key`

**Objective:** 完成"后台指定执行器"到 Celery 执行的闭环，同时兼容旧逻辑。

**Files:**

- Modify: `apps/backend/app/workers/tasks.py`
- Test: `apps/backend/tests/test_task_executor_resolution.py`

**Implementation location:** 执行器解析逻辑在 `_execute_with_async_session` 函数内部实现。该函数已经通过 `task.tool_id` 查询 `Tool` 对象来获取 `tool_config`（定价信息），直接扩展该查询即可。

**Resolution rule:**

1. 在 `_execute_with_async_session` 中，现有代码已经通过 `task.tool_id` 查询 `Tool` 获取 `tool_config`。
2. 扩展该逻辑：在同一次查询中同时读取 `tool.executor_key`。
3. 如果 `tool.executor_key` 非空：
   - 用 `get_executor_class(executor_key)` 从 registry 获取执行器类。
   - 忽略前端传入的 `tool_type` 参数对执行器选择的影响。
   - 如果 registry 中找不到，记录错误并 fallback 到 `tool_type`。
4. 如果 `tool.executor_key` 为空：
   - 回退使用函数参数 `tool_type`（即 `task.task_type`）。
   - registry 必须支持 `get_executor_class(tool_type)` 处理 legacy alias。
5. 找不到执行器时保留现有失败逻辑，错误信息包含实际尝试的 key 和 task/tool 信息，方便排查配置错误。

**Expected behavior:**

- 标杆工具都配置 `executor_key` 后，执行器选择由后端工具配置决定。
- 旧专用表单即使仍传 `task_type=ecommerce` 或 `task_type=marketing`，只要 task 有正确 `tool_id`，也应按工具配置执行到 `ecommerce-detail` / `product-description` 对应执行器。
- 旧工具没有 `executor_key`，仍按 `task_type == tool.slug` 或 legacy alias 执行。
- 新工具可以 `slug != executor_key`，但仍能绑定指定执行器。
- 不允许因为新增 `executor_key` 导致现有标杆工具创建任务、进度更新、完成回调、作品生成中断。

---

### Task 5: 后端新增 `Tool.pricing_schema` 字段

**Objective:** 在 `tools` 表新增 `pricing_schema` JSON 列，为统一计价规则做准备。

**Files:**

- Modify: `apps/backend/app/models/tool.py`
- Modify: `apps/backend/app/schemas/tool.py`
- Create: `apps/backend/alembic/versions/<revision>_add_pricing_schema_to_tools.py`
- Test: `apps/backend/tests/test_tool_pricing_schema.py`

**Implementation notes:**

1. `Tool` 模型新增 nullable JSON 字段：

```python
pricing_schema = Column(JSON, nullable=True, comment="工具计价规则配置")
```

2. `ToolCreate`、`ToolUpdate`、`ToolResponse` 增加：

```python
pricing_schema: Optional[dict] = None
```

3. Alembic 迁移新增 `tools.pricing_schema`。

**Tests:**

- 创建工具时保存 `pricing_schema`。
- 更新工具时修改 `pricing_schema`。
- 获取工具详情返回 `pricing_schema`。
- `pricing_schema` 为 null 时不影响现有接口。

**Verification command:**

```bash
cd /c/MyProject/LCAITool/apps/backend && pytest tests/test_tool_pricing_schema.py -q
```

---

### Task 6: 后端实现 PricingService

**Objective:** 实现基于 `pricing_schema` 的计价引擎，供创建任务和结算使用。

**Files:**

- Create: `apps/backend/app/services/pricing_service.py`
- Test: `apps/backend/tests/test_pricing_service.py`

**Core interface:**

```python
from dataclasses import dataclass

@dataclass
class PricingBreakdownItem:
    key: str
    label: str
    amount: int
    quantity: int
    unit_amount: int
    amount_ref: Optional[str] = None
    unit_amount_ref: Optional[str] = None

@dataclass
class PricingResult:
    total: int
    currency: str = "credits"
    breakdown: list[PricingBreakdownItem] = []
    warnings: list[str] = []

class PricingService:
    WHITELIST_REFS = {"base_fee", "image_fee", "audio_fee", "token_fee"}

    @staticmethod
    def estimate_tool_cost(tool, input_params: dict) -> PricingResult:
        ...
```

**Behavior:**

1. 如果 `tool.pricing_schema` 有效且 `version == 1`：
   - 遍历 `items`，按类型（`fixed`/`per_unit`）计算。
   - `amount_ref` / `unit_amount_ref` 从 `tool` 对象读取对应单价字段。
   - `per_unit.quantity` 为 null 时使用 `default_quantity` 并添加 warning。
   - `when` 条件不满足时该 item amount 为 0。
   - 所有 ref 必须在白名单内，否则抛出 ValueError。
2. 如果 `pricing_schema` 为空：
   - 抛出 `PricingNotConfiguredError` 让调用方回退执行器 `estimate_cost`。
3. `total` 应用 `min_total`/`max_total` 限制和 `rounding` 规则。

**Tests:**

- fixed item 正确读取 `base_fee`。
- per_unit item 正确计算 `quantity * tool[unit_amount_ref]`。
- null quantity 使用 default_quantity 并产出 warning。
- conditional item when false 时 amount=0。
- conditional item when true 时正常计算。
- 无效 amount_ref 抛出异常。
- pricing_schema 为空时抛出 `PricingNotConfiguredError`。
- rounding=ceil 时小数向上取整。
- 三个标杆工具 pricing_schema 示例均可正确计算。

**Verification command:**

```bash
cd /c/MyProject/LCAITool/apps/backend && pytest tests/test_pricing_service.py -q
```

---

### Task 7: 在后端创建任务流程中集成 PricingService

**Objective:** 创建任务时用 `PricingService` 计算费用，替代硬编码或执行器 `estimate_cost` 作为首选举措。

**Files:**

- Modify: `apps/backend/app/api/v1/endpoints/tasks.py`
- Modify: `apps/backend/app/workers/tasks.py` (in `_execute_with_async_session`)
- Modify: `apps/backend/app/services/task_service.py`

**Behavior:**

1. 在 `create_task` endpoint 中，任务创建前调用 `PricingService.estimate_tool_cost(tool, input_params)`。
2. 如果 `PricingNotConfiguredError`，回退到执行器 `estimate_cost(params)` 或旧逻辑。
3. 后端计算结果写入 `task.estimated_cost`，前端传入的 `estimated_cost` 仅供参考/调试。
4. 在 `_execute_with_async_session` 结算阶段同样调用 `PricingService` 计算 `actual_cost`。

**Test:** 扩展 `test_pricing_service.py` 或新增集成测试验证创建任务时费用由 `PricingService` 计算。

---

### Task 8: 后端新增用户上传文件模型和接口

**Objective:** 支持动态表单文件字段上传，返回可写入 `input_params` 的文件元数据。

**Files:**

- Create: `apps/backend/app/models/user_upload.py`
- Modify: `apps/backend/app/models/__init__.py`
- Create: `apps/backend/alembic/versions/<revision>_add_user_uploads.py`
- Modify: `apps/backend/app/api/v1/endpoints/files.py`
- Test: `apps/backend/tests/test_user_file_uploads.py`

**Model proposal:**

Table: `user_uploads`

Columns:

- `id`: UUID primary key
- `user_id`: UUID foreign key users.id, indexed
- `tool_id`: UUID nullable, indexed
- `field_key`: string nullable
- `file_name`: string
- `file_path`: string
- `file_size`: integer
- `mime_type`: string
- `created_at` / `updated_at`: inherited if BaseModel provides them

**Upload API:**

```http
POST /api/v1/files/uploads
Content-Type: multipart/form-data
Authorization: Bearer ***

fields:
- file: binary
- tool_id: optional uuid
- field_key: optional string
```

Response:

```json
{
  "id": "uuid",
  "file_name": "demo.png",
  "file_size": 12345,
  "mime_type": "image/png",
  "url": "/api/v1/files/uploads/uuid"
}
```

**Download/preview API:**

```http
GET /api/v1/files/uploads/{upload_id}
```

Access control: 只能当前用户访问自己的上传文件。管理员是否可访问另行确认；首期不开放。

**Storage path:**

```text
settings.STORAGE_DIR/uploads/{user_id}/{upload_id}_{safe_file_name}
```

**Validation:**

- 默认最大文件大小建议 20MB。
- 后端允许的 MIME 可先支持：image/*、application/pdf、text/plain、audio/*、video/*、application/zip。
- 前端字段 `accept/maxSizeMB` 是用户体验约束；后端仍必须校验全局大小和 MIME。

---

### Task 9: 后端规范化 `param_schema`

**Objective:** 兼容历史 JSON 字符串和数组两种写法，统一 API 返回数组。

**Files:**

- Modify: `apps/backend/app/schemas/tool.py` 或 `apps/backend/app/services/tool_service.py`
- Test: `apps/backend/tests/test_api_tool_param_schema.py`

**Behavior:**

- DB 中是数组：原样返回。
- DB 中是 JSON 字符串：解析后返回数组。
- 空值：返回 `null` 或 `[]` 需统一；建议用户端按空数组处理，后端保持已有测试期望不破坏。

**Verification:** 现有 `test_api_tool_param_schema.py` 继续通过，并新增 JSON 字符串兼容测试。

---

### Task 10: 后台更新 seed_data — 标杆工具 param_schema + executor_key + 字段统一

**Objective:** 把三个标杆工具的 `param_schema` 升级为与当前专用表单等价的简化 schema（去掉 derive/submitKey/custom_style/include_audio，加入 allowCustom），同时补齐 `executor_key` 和 `pricing_schema`；并同步统一字段命名（驼峰/下划线统一）。

**Files:**

- Modify: `apps/backend/app/seed_data.py`

**Changes:**

为 `storybook-generator`、`ecommerce-detail`、`product-description` 三个 Tool seed 实例：

1. 替换 `param_schema` 为等价于当前专用表单的简化版本（参见 §1.1 梳理的字段，按统一后命名）。
2. 新增 `executor_key` 字段。
3. 新增 `pricing_schema` 字段（参见 §2.2.12 示例）。

**storybook-generator param_schema 等价版：**

需包含：`inputMode`（radio theme/storyContent）、`theme`（text，只在 inputMode=theme 时显示和必填）、`storyContent`（textarea，只在 inputMode=storyContent 时显示和必填）、`art_style`（radio cartoon/oil/watercolor/flat + allowCustom=true）、`voiceType`（select）、`target_age`（select）、`smart_page_count`（boolean）、`page_count`（number 1-30，smart_page_count=true 时 disabled）、`hasBackgroundMusic`（boolean）、`hasSoundEffects`（boolean）。

**ecommerce-detail param_schema 等价版：**

需包含：`productName`（text 必填）、`productCategory`（select electronics/fashion/beauty/food/home/other）、`productFeatures`（textarea 必填）、`targetAudience`（text）、`imageStyle`（radio professional/minimal/lifestyle/tech）、`mainImageCount`（number 1-5，直接用这个 key 提交，不做下划线映射）、`detailImageCount`（number 2-10，直接用这个 key 提交）、`includePsd`（boolean）。

**product-description param_schema 等价版：**

需包含：`productOrBrand`（text 必填）、`keySellingPoints`（textarea 必填）、`targetPlatform`（select，options 中补 { label: "全平台", value: "all" }）、`toneStyle`（radio professional/friendly/humorous/luxury）、`copyLength`（select short/medium/long）、`platformCount`（number hidden/default 3）。

**Verification:**

```bash
cd /c/MyProject/LCAITool/apps/backend && python -c "from app.seed_data import *; print('seed import OK')"
```

---

### Task 10.5: 同步更新后端执行器 — 字段命名统一、去掉 include_audio、page_count null 转换移到执行器内部

**Objective:** 同步更新三个标杆工具的后端执行器：匹配统一后的字段命名，去掉对 include_audio 的读取，改为直接判断 voiceType !== 'none'，把 page_count 的 null 转换逻辑（smart_page_count=true 时 page_count=null）移到执行器内部。

**Files:**

- Modify: `apps/backend/app/executors/storybook_generator.py`
- Modify: `apps/backend/app/executors/ecommerce_detail.py`
- Modify: `apps/backend/app/executors/marketing.py`

**Implementation notes:**

1. **storybook-generator 执行器:**
   - 去掉 `include_audio` 参数读取
   - 改为直接判断 `if input_params.get("voiceType") != "none"`
   - page_count null 转换：在执行器开头处理，若 smart_page_count 为 true，则把 page_count 设为 null
2. **ecommerce-detail 执行器:**
   - 把读取 `main_image_count` 和 `detail_image_count` 的地方改为 `mainImageCount` 和 `detailImageCount`
3. **product-description (marketing) 执行器:**
   - 字段 key 统一为当前专用表单的命名

---

### Task 11: 管理后台 API 类型扩展

**Objective:** 让管理后台能读写 `param_schema`、`pricing_schema` 和 `executor_key`。

**Files:**

- Modify: `apps/frontend-admin/src/api/tool.ts`
- Possibly Modify/Create: `apps/frontend-admin/src/api/executor.ts`

**Types:**

```ts
export type ToolParamFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'boolean'
  | 'date'
  | 'file'
  | 'section'
  | 'range'
  | 'hidden';

export interface ToolParamOption {
  label: string;
  value: string;
  icon?: string;
  desc?: string;
}

export interface ToolParamCondition {
  when: {
    field: string;
    operator: 'eq' | 'neq' | 'in' | 'nin';
    value: any;
  };
  effect: 'show' | 'hide' | 'enable' | 'disable';
}

export interface ToolParamField {
  key: string;
  label: string;
  type: ToolParamFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number | boolean | string[] | null;
  options?: ToolParamOption[];
  min?: number;
  max?: number;
  step?: number;
  order?: number;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  maxFiles?: number;
  allowCustom?: boolean; // only for select/radio
  condition?: ToolParamCondition;
  uiHint?: 'card'; // for radio
}
```

Add to tool payloads:

```ts
param_schema?: ToolParamField[] | null;
pricing_schema?: PricingSchema | null;
executor_key?: string | null;
```

Add `PricingSchema` type matching §2.2.3 structure.

---

### Task 12: 管理后台创建表单增加使用模式、字段配置、执行器选择、计价配置

**Objective:** 创建工具时即可配置完整表单、执行器和计价规则。

**Files:**

- Modify: `apps/frontend-admin/src/pages/tools/create.tsx`
- Create: `apps/frontend-admin/src/components/tools/FormSchemaEditor.tsx`
- Create: `apps/frontend-admin/src/components/tools/ExecutorSelect.tsx`
- Create: `apps/frontend-admin/src/components/tools/PricingSchemaEditor.tsx`

**FormSchemaEditor behavior:**

- 添加字段。
- 删除字段。
- 修改字段 key/label/type/required/placeholder/helpText/order。
- `select/radio/checkbox` 类型支持 options 编辑，包括 icon/desc。
- `select/radio` 类型支持 `allowCustom` 选项配置。
- `file` 类型支持 accept/multiple/maxSizeMB/maxFiles。
- `range` 类型支持 min/max/step。
- 支持条件显示/禁用配置（`condition`）。
- 支持 `section`、`hidden` 类型。
- 保存前校验：
  - key 必填。
  - key 只能 `[a-zA-Z_][a-zA-Z0-9_]*`。
  - key 不重复。
  - label 必填（section 类型可选或必填，hidden 类型可选）。
  - 选项型字段至少一个 option。
  - file 多文件时 maxFiles >= 1。
  - hidden 类型必须有 defaultValue。

**ExecutorSelect behavior:**

- 调用 `GET /api/v1/admin/executors`。
- 支持空值：使用旧逻辑/slug 回退。
- 显示 name，提交 key。

**PricingSchemaEditor behavior:**

- 提供两种编辑入口：结构化表单 + JSON 高级编辑。
- 结构化表单：添加 fixed/per_unit 计价项，配置 when 条件，从 `param_schema` 字段 key 下拉选择 field，从白名单下拉选择 `amount_ref`/`unit_amount_ref`。
- JSON 编辑：直接编辑完整 pricing_schema JSON，保存前校验格式。
- 保存校验：version=1、currency=credits、key 唯一、ref 在白名单、field 在 param_schema。

---

### Task 13: 管理后台编辑页增加字段配置、执行器选择和计价配置

**Objective:** 编辑已有工具时可维护动态表单、执行器和计价规则。

**Files:**

- Modify: `apps/frontend-admin/src/pages/tools/[id]/edit.tsx`
- Reuse: `apps/frontend-admin/src/components/tools/FormSchemaEditor.tsx`
- Reuse: `apps/frontend-admin/src/components/tools/ExecutorSelect.tsx`
- Reuse: `apps/frontend-admin/src/components/tools/PricingSchemaEditor.tsx`

**Notes:**

- 编辑页已有 `usage_modes` 复选框，保留并补齐创建页同等能力。
- 初始化时如果 `param_schema` 是 null，传 `[]` 给编辑器。
- 提交时把数组原样传给后端。
- `pricing_schema` 为 null 时传 `null` 给编辑器，用户配置后再提交具体对象。

---

### Task 14: 用户端类型增加 `param_schema`、`pricing_schema` 和动态字段定义

**Objective:** 让用户端工具详情类型能表达动态表单字段和定价规则。

**Files:**

- Modify: `apps/frontend-user/src/types/index.ts`
- Modify: `apps/frontend-user/src/lib/api/types.ts`

**Add:**

- `ToolParamFieldType`
- `ToolParamOption`
- `ToolParamField`
- `PricingSchema` / `PricingSchemaItem` / `PricingWhenCondition`
- `PricingResult` / `PricingBreakdownItem`
- `Tool.param_schema?: ToolParamField[] | null`
- `Tool.pricing_schema?: PricingSchema | null`
- `Tool.base_fee?`, `image_fee?`, `audio_fee?`, `token_fee?`

---

### Task 15: 用户端新增上传 API 模块

**Objective:** 动态表单文件字段可上传文件并拿到元数据。

**Files:**

- Create: `apps/frontend-user/src/lib/api/modules/upload.ts`
- Modify: `apps/frontend-user/src/lib/api/index.ts` if existing export barrel exists

**API:**

```ts
export interface UploadedFileMeta {
  id: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  url: string;
}

export const uploadApi = {
  uploadFile: async (file: File, options?: { toolId?: string; fieldKey?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.toolId) formData.append('tool_id', options.toolId);
    if (options?.fieldKey) formData.append('field_key', options.fieldKey);
    return api.post<UploadedFileMeta>('/files/uploads', formData);
  },
};
```

**Note:** 不手动设置 `Content-Type` header，让 axios/浏览器自动设置 boundary。

---

### Task 16: 用户端新增共享价格预估 `useToolCostEstimate` + `PriceEstimatePanel`

**Objective:** 把价格预估抽成共享 hook 和组件，供通用工具页面和独立定制工具页面共同使用。

**Files:**

- Create: `apps/frontend-user/src/components/tool-detail/useToolCostEstimate.ts`
- Create: `apps/frontend-user/src/components/tool-detail/PriceEstimatePanel.tsx`

**useToolCostEstimate:**

```ts
function useToolCostEstimate(
  tool: Tool,
  inputParams: Record<string, any>
): {
  total: number;
  breakdown: PricingBreakdownItem[];
  warnings: string[];
  isLoading: boolean;
}
```

- 接收 `tool.pricing_schema`、`tool.base_fee/image_fee/audio_fee/token_fee`、当前 `input_params`。
- 客户端执行与 `PricingService` 等价的计算逻辑。
- 当 `pricing_schema` 为空时，回退旧逻辑（按 `base_fee + 数量字段 * 单价` 基础估算）。
- null quantity 使用 `default_quantity` 并产出 warning。
- 使用 useMemo 在 inputParams 变化时重新计算。

**PriceEstimatePanel:**

- 显示总积分 `total_label`。
- 可展开/收起 `breakdown` 明细。
- 显示 `warnings` 列表。
- 显示积分不足提示。

---

### Task 17: 用户端新增共享 DynamicToolForm 组件（不含 derive/submitKey）

**Objective:** 把动态表单渲染、校验、文件上传和 `input_params` 组装抽成共享组件，供通用工具页面和独立定制工具页面共同使用。（不含 derive/submitKey，加入 allowCustom）

**Files:**

- Create: `apps/frontend-user/src/components/tool-detail/DynamicToolForm.tsx`
- Test: `apps/frontend-user/src/components/tool-detail/__tests__/DynamicToolForm.test.tsx`

**Component boundary:**

- `DynamicToolForm` 只负责表单主体：字段渲染、默认值、条件显示、条件禁用、校验、文件上传、`input_params` 组装。
- `DynamicToolForm` 不负责工具页面外壳、工具说明、示例展示、品牌化区块、结果页展示。
- `DynamicToolForm` 不直接调用 `taskApi.createTask`，不直接维护 `ProgressModal`——只调用外部传入的 `onSubmit(normalizedValues)`。

**Rendering behavior:**

- `text` -> `<input type="text">`
- `textarea` -> `<textarea>`
- `number` -> `<input type="number">`
- `select` -> `<select>`
- `radio` -> radio group; if `allowCustom=true`, append "自定义" option and show extra text input when selected
- `checkbox` -> checkbox group, value is string[]
- `boolean` -> single checkbox/switch
- `date` -> `<input type="date">`
- `file` -> `<input type="file">` with accept/multiple
- `range` -> range slider, submits as number
- `section` -> grouping header (no input)
- `hidden` -> no rendering, but submit defaultValue

**Extended schema fields (for parity with benchmark forms):**

- `section`: grouping header, e.g. `{ "key": "_section_basic", "type": "section", "label": "基础信息" }`
- `uiHint: "card"` for `type: "radio"`: card-style radio with optional icon/desc
- `range`: range slider, submits as number
- `condition`: conditional visibility/disablement, attached directly to the affected field
- `allowCustom` (only for `select`/`radio`): enable custom value input
- `hidden`: hidden field with defaultValue, submitted but not displayed

**Validation behavior:**

- required 字段提交前校验。
- number/range 支持 min/max。
- file 支持 accept、maxSizeMB、maxFiles 前端校验。
- 当 select/radio 选择自定义选项时，自定义输入框必填。
- 错误显示在字段下方。

**Submit behavior:**

1. 校验普通字段和文件字段。
2. 对每个 file 字段上传文件。
3. 上传结果写入 `input_params[field.key]`。
4. 包含 hidden 字段的 defaultValue。
5. 对于 select/radio 选择自定义的，把用户输入值直接赋给该字段 key。
6. 调用外部传入的 `onSubmit(normalizedValues)`。

---

### Task 18a: 通用工具页面接入 DynamicToolForm

**Objective:** `ToolCreationForm.tsx` 使用 `DynamicToolForm` 渲染表单。

**Files:**

- Modify: `apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx`

**Notes:**

- 如果 `param_schema` 有字段，渲染 `DynamicToolForm`。
- 如果没有字段，保留"该工具正在开发中"或友好提示。
- 此步骤仅改表单渲染层，不接生成流程（留给 Task 19a）。

---

### Task 18b: storybook-generator 页面接入 DynamicToolForm

**Objective:** 独立定制页的表单区域改为 `DynamicToolForm`，页面保留专属外壳。

**Files:**

- Modify: `apps/frontend-user/src/app/tools/storybook-generator/components/StorybookForm.tsx`

**Notes:**

- 旧手写字段表单保留为开发/回滚兜底（用 feature flag 或条件渲染切换），直到 parity 验收通过。
- 页面自身只负责：工具专属外壳、说明文案、示例展示。
- 表单主体改为 `<DynamicToolForm tool={tool} paramSchema={tool.param_schema} onSubmit={...} />`。

---

### Task 18c: ecommerce-detail 页面接入 DynamicToolForm

**Objective:** 同 Task 18b。

**Files:**

- Modify: `apps/frontend-user/src/app/tools/ecommerce-detail/components/EcommerceForm.tsx`

---

### Task 18d: product-description 页面接入 DynamicToolForm

**Objective:** 同 Task 18b。

**Files:**

- Modify: `apps/frontend-user/src/app/tools/marketing-copywriter/components/MarketingForm.tsx`

---

### Task 19a: 用户端新增共享生成流程 `useToolGeneration`

**Objective:** 把点击生成后的创建任务、余额不足处理、进度弹窗、取消、完成跳转抽成共享 hook。

**Files:**

- Create: `apps/frontend-user/src/components/tool-detail/useToolGeneration.ts`
- Optionally Create: `apps/frontend-user/src/components/tool-detail/ToolGenerationFlow.tsx`

**useToolGeneration interface:**

```ts
interface StartGenerationOptions {
  tool: Tool;
  inputParams: Record<string, any>;
  estimatedCost?: number;
  taskType?: string;
  source?: 'form' | 'dialog' | string;
}

function useToolGeneration() {
  return {
    isCreating,
    progressTaskId,
    showProgressModal,
    startGeneration,       // (options: StartGenerationOptions) => Promise<void>
    closeProgressModal,
    handleProgressComplete, // (workId: string) => void — default: router.push(/works/detail/${workId})
  };
}
```

**Task creation rule:**

```ts
await taskApi.createTask({
  tool_id: tool.id,
  task_type: taskType ?? tool.slug ?? tool.id,
  estimated_cost: estimatedCost,
  input_params: inputParams,
});
```

注意：迁移完成后前端不再负责"工具 slug 到执行器 key"的长期职责；`ecommerce-detail -> ecommerce`、`product-description -> marketing` 这类 legacy task_type 映射只能作为兼容传参保留，真正执行器选择由后端 `tool_id -> Tool.executor_key` 决定。

**Requirements:**

- 提交按钮 loading。
- 上传期间展示"正在上传文件"。
- 创建任务期间展示"正在创建任务"。
- 出错 toast/错误文案。
- 任务创建成功后统一打开 `ProgressModal` 展示生成进度。
- 任务执行完成后不自动跳转，在弹窗内展示"查看成果详情"按钮。
- 用户点击后统一跳转到 `/works/detail/${workId}`。
- 余额不足错误统一处理：toast 提示，并提供"去充值"跳转 `/pricing`。
- `ProgressModal` 的打开、关闭、完成回调统一由 `useToolGeneration` 管理。

**DynamicToolForm 与 useToolGeneration 的分离：**

`DynamicToolForm` 的 `onSubmit` 回调输出的是 normalized `input_params`（不含费用、task_type）。`useToolGeneration.startGeneration` 接收这些值并补充费用和 task_type 后调用 `taskApi.createTask`。二者通过页面组件连接：

```tsx
const { values, submit } = useDynamicForm(tool);
const { startGeneration, showProgressModal, ... } = useToolGeneration();

const handleSubmit = (inputParams) => {
  startGeneration({ tool, inputParams, estimatedCost: costEstimate.total });
};
```

---

### Task 19b: 通用工具页面 + DialogMode 接入 useToolGeneration

**Objective:** `ToolCreationForm` 和 `DialogMode` 使用共享 hook 处理生成流程。

**Files:**

- Modify: `apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx`
- Modify: `apps/frontend-user/src/components/tool-detail/DialogMode.tsx`

---

### Task 19c: storybook-generator 页面接入 useToolGeneration

**Objective:** 独立定制页的生成流程使用共享 hook。

**Files:**

- Modify: `apps/frontend-user/src/app/tools/storybook-generator/components/StorybookForm.tsx`

---

### Task 19d: ecommerce-detail 页面接入 useToolGeneration

**Objective:** 同 Task 19c。

**Files:**

- Modify: `apps/frontend-user/src/app/tools/ecommerce-detail/components/EcommerceForm.tsx`

---

### Task 19e: product-description 页面接入 useToolGeneration

**Objective:** 同 Task 19c。

**Files:**

- Modify: `apps/frontend-user/src/app/tools/marketing-copywriter/components/MarketingForm.tsx`

---

### Task 20: 后端任务输入保留上传文件元数据

**Objective:** 确保 `input_params` 可保存上传元数据并被执行器读取。

**Files:**

- Inspect/Modify: `apps/backend/app/api/v1/endpoints/tasks.py`
- Inspect/Modify: `apps/backend/app/schemas/task.py`
- Test: `apps/backend/tests/test_task_input_params_files.py`

**Expected:**

`TaskCreate.input_params` 已是 JSON dict 时，上传元数据应无需额外 DB 字段即可保存。测试重点是提交包含文件元数据的 JSON 后，任务记录和传给 Celery 的 `input_params` 不丢失。

---

### Task 21: 执行器读取文件字段的约定文档

**Objective:** 给后续执行器实现者明确如何从 `input_params` 使用上传文件。

**Files:**

- Create or Modify: `docs/architecture/executor-patterns.md`

**Document:**

- 文件字段在 `input_params` 的结构。
- 执行器如需本地路径，不应信任前端传来的 path；应通过 `file_id` 查询 `user_uploads` 并校验权限/任务归属。
- 推荐新增 helper：`resolve_uploaded_file(file_id, user_id)`，可作为后续增强。

---

### Task 22: 前端构建验证

**Objective:** 确认管理后台和用户端 TypeScript 通过。

**Commands:**

```bash
cd /c/MyProject/LCAITool && pnpm --filter @lcaitool/frontend-admin build
cd /c/MyProject/LCAITool && pnpm --filter @lcaitool/frontend-user build
```

**Expected:** build 成功。若 Next build 因环境变量或接口不可用失败，需要记录具体原因并至少运行 `tsc`/lint 可用替代验证。

---

### Task 23: 后端测试验证

**Objective:** 确认新增后端行为通过自动化测试。

**Commands:**

```bash
cd /c/MyProject/LCAITool/apps/backend && pytest tests/test_admin_tool_executor_key.py tests/test_executor_registry.py tests/test_task_executor_resolution.py tests/test_tool_pricing_schema.py tests/test_pricing_service.py tests/test_user_file_uploads.py tests/test_task_input_params_files.py tests/test_api_tool_param_schema.py -q
```

**Expected:** 所有新增和相关旧测试通过。

---

### Task 24: 标杆工具 parity 验证（后端 Playwright E2E）

**Objective:** 通过后端 Playwright E2E 自动化测试验证三个标杆工具的动态表单提交参数与旧专用表单一致，以及执行器选择、费用计算完整闭环。（用户明确：测试框架都在后端目录内，不加前端自动化）

**Files:**

- Create: `apps/backend/tests/e2e/test_tool_dynamic_form_parity.py`

**Approach:**

1. 准备三个标杆工具的等价 `param_schema` + `pricing_schema` + `executor_key` fixture（与 Task 10 中 seed_data 一致）。
2. 对每个标杆工具：
   a. 准备该工具专用表单的典型输入值集合。
   b. 用 Playwright 启动浏览器，访问该工具的通用工具页面和独立定制页面。
   c. 填充动态表单并提交，断言创建的任务 `input_params` 与旧专用表单逻辑一致。
   d. 断言任务 `estimated_cost` 由 `PricingService` 正确计算。
   e. 断言任务 `executor_key` 正确设置。
3. 测试范围：
   a. storybook-generator：inputMode 切换、art_style 自定义（allowCustom）、smart_page_count 禁用 page_count、voiceType 影响后端 include_audio 判断。
   b. ecommerce-detail：mainImageCount/detailImageCount 字段直接使用驼峰 key、includePsd。
   c. product-description：platformCount hidden、targetPlatform 全平台选项。

**Verification:**

```bash
cd /c/MyProject/LCAITool/apps/backend && pytest tests/e2e/test_tool_dynamic_form_parity.py -q
```

---

### Task 25: 前后端 pricing 一致性测试

**Objective:** 确保 `useToolCostEstimate` 前端计算与 `PricingService` 后端计算结果一致。

**Files:**

- Create: `apps/backend/tests/test_pricing_frontend_backend_consistency.py`

**Approach:**

1. 准备共享 fixtures：三个标杆工具的 `pricing_schema` + 几组典型 `input_params`。
2. 后端用 `PricingService.estimate_tool_cost` 计算每组。
3. 输出计算结果 JSON snapshot，前端测试读取同一份 fixture 并用 `useToolCostEstimate` 计算。
4. 断言 `total` 和每个 `breakdown[].amount` 一致。

---

### Task 26: 手工端到端验证

**Objective:** 证明真实业务闭环可用。

**Steps:**

1. 启动后端、Celery、管理后台、用户端。
2. 管理后台创建/编辑一个工具：
   - `usage_modes = ["form"]`
   - `executor_key = "storybook-generator"` 或其他现有执行器。
   - `param_schema` 至少包含：text、select、number、file multiple。
   - `pricing_schema` 配置完整计价规则。
3. 用户端打开工具详情页。
4. 确认动态表单按配置渲染。
5. 上传 1-2 张图片。
6. 确认价格预估随表单变化实时更新。
7. 提交表单。
8. 后端确认：
   - 文件存入 storage。
   - `user_uploads` 有记录。
   - task.input_params 包含普通字段和文件元数据。
   - Celery 使用 `executor_key` 选择执行器。
   - 费用由 `PricingService` 计算。
9. 用户端确认任务创建成功并 ProgressModal 正常、完成跳转 `/works/detail/${workId}` 正常。

---

## 4. 风险与处理

1. **旧数据兼容风险**
   - 风险：历史 `param_schema` 可能是 JSON 字符串。
   - 处理：后端和前端都做 normalize，后端优先统一返回数组。

2. **执行器 key 与 slug 解耦风险**
   - 风险：现有任务依赖 `task_type == slug`。
   - 处理：只增加优先级，不删除旧逻辑：`executor_key || task_type`。

3. **文件安全风险**
   - 风险：任意文件上传、路径穿越、大文件占满磁盘。
   - 处理：安全文件名、固定 storage 目录、大小限制、MIME allowlist、下载鉴权。

4. **前端 multipart header 风险**
   - 风险：手动设置 multipart header 可能丢 boundary。
   - 处理：upload API 不设置 Content-Type，让 axios/浏览器自动设置。

5. **执行器如何使用上传文件**
   - 风险：执行器只拿到 url/file_id，不知道本地路径。
   - 处理：首期把元数据传入；需要本地路径的执行器通过 helper 查询 `user_uploads`。

6. **通用页与定制页表单逻辑分叉风险**
   - 风险：通用工具页面使用动态表单，但独立定制工具页面继续维护手写表单，导致字段校验、文件上传、默认值、提交 payload 行为不一致。
   - 处理：首期必须把表单渲染抽成共享 `DynamicToolForm`，通用页和三个标杆定制页都使用同一组件；定制页只保留外层体验差异，不复制表单主体逻辑。

7. **生成流程分叉风险**
   - 风险：即使表单渲染统一了，各工具页面仍各自调用 `taskApi.createTask`、各自处理余额不足、各自维护 `ProgressModal` 状态，后续会出现任务创建参数、错误提示、完成跳转不一致。
   - 处理：把生成流程抽成共享 `useToolGeneration` / `ToolGenerationFlow`。`DynamicToolForm` 只输出 normalized `input_params`，创建任务、错误处理、进度弹窗、完成跳转统一由生成流程层负责。

8. **pricing_schema 前后端计算不一致风险**
   - 风险：前端本地计算定价和后端 `PricingService` 使用的逻辑不一致，导致用户看到的价格与最终扣费不匹配。
   - 处理：Task 25 的前后端一致性测试使用共享 fixtures，确保 `total` 和 `breakdown` 结果一致。

9. **null quantity 处理不一致风险**
   - 风险：`smart_page_count=true` 时 `page_count=null`，旧的 StorybookForm 使用 `|| 10` 的 JavaScript 默认值逻辑，新旧行为可能不一致。
   - 处理：`PricingService` 和 `useToolCostEstimate` 统一使用 `default_quantity` 处理 null，不使用 `|| 10` fallback。在 parity 测试中显式覆盖此场景。

---

## 5. 已确认决策

以下实现决策已确认，后续实施时按这些默认方案执行：

1. 上传文件必须登录。
   - 用户端动态表单文件上传接口需要 `Authorization: Bearer ***`
   - 后端上传和下载/预览接口都需要校验当前用户身份。

2. 单文件默认最大 20MB。
   - 后端设置全局上传大小上限为 20MB。
   - 管理后台字段配置里的 `maxSizeMB` 可以设置更小的限制。
   - 字段级 `maxSizeMB` 不能超过后端全局上限。

3. 首期支持的文件类型：
   - `image/*`
   - `application/pdf`
   - `text/plain`
   - `audio/*`
   - `video/*`
   - `application/zip`
   - 前端 `accept` 只作为用户体验提示，后端必须做 MIME allowlist 校验。

4. 动态表单提交成功后的完成态交互必须沿用并统一当前专用表单逻辑。
   - 任务创建成功后统一打开 `ProgressModal` 展示生成进度。
   - 任务执行完成后不自动跳转，而是在 `ProgressModal` 内展示"查看成果详情"按钮。
   - 用户点击"查看成果详情"后统一跳转到 `/works/detail/${workId}`。
   - 通用工具页面、DialogMode、三个标杆定制页都必须复用这套完成态交互；不再使用"任务详情或作品/任务页"这种模糊跳转目标。
   - 如某工具确有特殊跳转，必须通过 `useToolGeneration` / `ToolGenerationFlow` 参数显式覆盖，并在实现说明中写清楚原因。

5. 文件字段传给执行器时使用文件元数据，不传本地路径。
   - 单文件字段写入：`{ file_id, file_name, file_size, mime_type, url }`。
   - 多文件字段写入上述对象数组。
   - 执行器如果需要本地路径，应通过 `file_id` 在后端查询 `user_uploads` 并做权限/归属校验。
   - 前端不得传本地磁盘 path，执行器也不应信任前端传入的 path。

6. `param_schema` 空值兼容策略。
   - 为兼容现有后端测试和旧数据，后端可以继续对空值返回 `null`。
   - 用户端和管理后台统一 normalize 为 `[]` 后使用。
   - 如果后续要统一 API 返回 `[]`，需单独调整现有测试和兼容策略。

7. 独立定制工具页面首期也使用共享动态表单组件。
   - 通用工具页面和独立定制工具页面都使用同一个 `DynamicToolForm` 完成表单主体渲染。
   - 独立定制页面只保留外层布局、工具说明、示例展示、费用/进度/结果引导等差异化内容。
   - 三个标杆工具页面不得继续各自维护一套主要字段表单逻辑。
   - 旧手写表单实现可作为开发/回滚兜底保留到 parity 验收通过后，再决定是否删除。

8. 生成流程首期也抽成共享 hook/组件。
   - 推荐拆分为 `DynamicToolForm` + `useToolGeneration`。
   - `DynamicToolForm` 负责表单层，不直接调用 `taskApi.createTask`，不直接维护 `ProgressModal`。
   - `useToolGeneration` 负责创建任务、loading、余额不足提示、进度弹窗、取消、完成跳转。
   - 通用工具页面、三个标杆定制页、DialogMode 都应复用同一生成流程。
   - 默认完成后跳转 `/works/detail/${workId}`；特殊跳转必须显式配置，不能散落在页面里复制实现。

9. null quantity 统一用 `default_quantity` 处理。
   - `PricingService` 和 `useToolCostEstimate` 中当 `per_unit.quantity` 为 null 时使用 `default_quantity`。
   - 同步产出 warning 告知用户"数量为空，按默认值预估"。

---

## 6. 推荐实施顺序

1. 后端 executor_key 模型 + 迁移 + schema（Task 2）。
2. 后端 executor registry + admin API（Task 3）。
3. 后端 executor_key 解析集成（Task 4）。
4. 后端 pricing_schema 模型 + 迁移 + schema（Task 5）。
5. 后端 PricingService 实现（Task 6）。
6. 后端创建任务集成 PricingService（Task 7）。
7. 后端上传接口（Task 8）。
8. 后端 param_schema 规范化（Task 9）。
9. 后端 seed_data 更新 — 标杆工具 param_schema + executor_key + pricing_schema（Task 10）。
10. 管理后台 API 类型扩展（Task 11）。
11. 管理后台创建页 UI — FormSchemaEditor + ExecutorSelect + PricingSchemaEditor（Task 12）。
12. 管理后台编辑页 UI（Task 13）。
13. 用户端类型扩展（Task 14）。
14. 用户端上传 API 模块（Task 15）。
15. 用户端 useToolCostEstimate + PriceEstimatePanel（Task 16）。
16. 用户端 DynamicToolForm 组件（Task 17）。
17. 通用工具页面 + 三个标杆定制页接入 DynamicToolForm（Task 18a-18d）。
18. 用户端 useToolGeneration hook（Task 19a）。
19. 所有页面接入 useToolGeneration（Task 19b-19e）。
20. 后端 input_params 文件元数据验证（Task 20）。
21. 执行器文件字段约定文档（Task 21）。
22. 前端构建验证（Task 22）。
23. 后端测试验证（Task 23）。
24. 标杆工具 parity 验证（Task 24）。
25. 前后端 pricing 一致性测试（Task 25）。
26. 手工端到端验证（Task 26）。
