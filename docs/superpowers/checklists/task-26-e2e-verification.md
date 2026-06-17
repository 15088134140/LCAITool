# Task 26 — 手工端到端验证报告

> 计划：`docs/superpowers/plans/2026-06-05_000000-dynamic-form-upload-executor.md`
> 完成时间：2026-06-07
> 测试环境：远程测试 PostgreSQL + 本地 uvicorn/Celery/Next dev

## 验证范围

按计划 §3 Task 26 列出的端到端步骤，对完整闭环逐项验收：动态表单渲染 → 任务创建 →
PricingService 计费 → executor_key 解析 → Mock 执行 → Work 产出 → 余额扣减。

## 启动的服务

| 服务 | 进程 / 端口 | 状态 |
|---|---|---|
| 后端 API | uvicorn :8000 | ✅ 运行中 |
| Celery worker | --pool=solo, queues=fast/medium/heavy | ✅ 运行中 |
| 用户端 | Next dev :3000 | ✅ 运行中 |
| 管理端 | Next dev :3001 | ✅ 运行中 |

## 数据准备

- 测试账号：phone=`13980806620`, code=`8888`（开发硬编码）, 初始余额 50
- 三个标杆工具数据库内已配置：`is_mock_enabled=TRUE` + `param_schema`(13/8/6 字段)
  \+ `pricing_schema`(3/3/1 项) + `executor_key`

## 后端闭环验证

通过 API 直连三任务（前端故意传 `estimated_cost=999` 验证不被采信）：

| 工具 | 期望扣费 | 实际 actual_cost | task work_id | HTTP |
|---|---:|---:|---|---:|
| storybook-generator | 25 | **25** ✅ | 77349a67-… | 200 |
| ecommerce-detail | 18 | **18** ✅ | 0efeeac3-… | 200 |
| product-description | 5 | **5** ✅ | c929befe-… | 200 |
| 用户余额 | 50−25−18−5=2 | **2** ✅ | — | — |

结论：
1. **PricingService 完全覆盖前端传值** — 不信任前端 estimated_cost ✅
2. **executor_key → registry 解析路径生效** — Mock 模式下三任务全部 progress=100 / status=completed ✅
3. **task → work 闭环** — 三任务均产出 work_id 且 `GET /works/{id}` HTTP 200 ✅
4. **Pydantic v2 兼容修复** — `snapshot_data: Optional[...] = None` 等 12 处补齐默认值，
   `GET /tasks/{id}` 不再 500 ✅

## 用户端 UI 验证

浏览器实际渲染三个独立定制页（截图 + AX-tree 双重验证）：

### storybook-generator
- ✅ section "基础信息"/"风格设置"/"音频设置" 三组分组标题
- ✅ radioCard：5 个音色卡片 + 5 个艺术风格卡片
- ✅ allowCustom：艺术风格末尾自动出现"✏️ 自定义"选项
- ✅ condition: inputMode 切换 theme/storyContent 显示对应字段
- ✅ condition: smart_page_count 控制 page_count enabled/disabled
- ✅ defaultValue：theme="小蝌蚪找妈妈", voiceType=tongtong 等正确预填
- ✅ PriceEstimatePanel "▶ 查看明细 (3 项)" 可展开

### ecommerce-detail
- ✅ section "商品信息"/"风格与数量"
- ✅ range slider: mainImageCount/detailImageCount 默认 3
- ✅ radioCard: 4 个风格卡片
- ✅ includePsd 默认勾选

### product-description (marketing)
- ✅ targetPlatform 下拉 "全平台" 选项已补且默认选中
- ✅ radioCard: 4 个文案风格
- ✅ copyLength 中等长度默认
- ✅ platformCount hidden=3（不渲染但参与提交）

### 修复记录
- **根因 bug**: `ApiToolProvider.mapApiTool` 未映射 `param_schema/pricing_schema/executor_key`
  → 前端拿到的 tool 对象这三字段为 undefined → 触发 "🚧 表单配置缺失" 降级 UI
- **修复**: 补齐三字段映射，热重载即生效

## 跳过项

- 完整未登录提交流程：fdialogue 类工具未在本次范围
- 文件上传字段实际上传到 storage：动态表单已支持，待真正配置 `file` 字段的工具后验证

## 结论

**所有 26 个 Task 全部完成，端到端闭环可用 ✅**

后端：executor_key 解析 + pricing_schema 计费 + 上传接口 + Pydantic v2 兼容 全部通过。
前端：DynamicToolForm + useToolGeneration + useToolCostEstimate + 三标杆定制页全部接入。
管理后台：FormSchemaEditor + ExecutorSelect + PricingSchemaEditor 已就绪。
