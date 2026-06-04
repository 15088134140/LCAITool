# CLAUDE.md 渐进式披露重构设计

**日期**：2026-06-04  
**状态**：待评审  
**目标文件**：[CLAUDE.md](../../../CLAUDE.md)

## 1. 背景

当前 [CLAUDE.md](../../../CLAUDE.md) 同时承担了 Claude 工作指令、项目总览、技术栈说明、业务流程说明、安全规范、MVP 状态、工具协作规则和参考文档索引等职责。文件约 400+ 行，信息密度高，但存在两个问题：

1. **上下文负担偏大**：Claude 每次会话启动都会加载大量并非当前任务必需的信息。
2. **信息职责混杂**：强制执行规则、项目背景资料、可变状态信息和详细业务说明都放在同一层级，后续容易继续膨胀。

因此需要将 [CLAUDE.md](../../../CLAUDE.md) 从“完整项目手册”重构为“AI 工作入口 + 按需读取路由”，其余信息迁移到专题文档中。

## 2. 设计目标

本次重构采用“兼顾 Claude 上下文效率与人类可读性”的方案：

- [CLAUDE.md](../../../CLAUDE.md) 只保留每次会话必须生效的高优先级规则。
- 产品、技术、业务、安全、路线图等内容拆分为稳定的专题文档。
- 在 [CLAUDE.md](../../../CLAUDE.md) 中提供按任务类型读取文档的路由规则。
- 避免信息丢失；迁移后的内容仍应能被人类开发者和 Claude 按需找到。
- 降低后续维护成本，防止 [CLAUDE.md](../../../CLAUDE.md) 再次变成大而全的项目文档。

## 3. 非目标

本次设计不改变项目架构、业务规则、技术栈和开发流程本身。重构只调整文档信息架构，不修改应用代码。

本次设计也不要求一次性重写所有历史文档。已有 PRD、技术方案、设计稿和 superpowers plans/specs 继续保留，新拆出的文档作为当前 Claude 工作入口的配套资料。

## 4. 推荐结构

建议新增以下文档结构：

```text
docs/
├── project/
│   ├── overview.md
│   ├── roadmap.md
│   └── reference-index.md
│
├── development/
│   ├── tech-stack.md
│   ├── design-system.md
│   ├── coding-principles.md
│   └── agent-workflow.md
│
└── architecture/
    ├── business-flows.md
    ├── executor-patterns.md
    └── security-and-performance.md
```

各文件职责如下：

| 文件 | 职责 |
|---|---|
| `docs/project/overview.md` | 项目定位、核心差异化、产品目标。 |
| `docs/project/roadmap.md` | MVP/P0/P1/P2 功能状态和后续方向。 |
| `docs/project/reference-index.md` | PRD、技术方案、设计稿、plans/specs 等重要资料索引。 |
| `docs/development/tech-stack.md` | 前后端技术栈、部署方式、目录结构。 |
| `docs/development/design-system.md` | 色彩、字体、交互样式、UI 视觉规则。 |
| `docs/development/coding-principles.md` | 先设计后编码、最小可行、测试、数据库迁移、安全编码等通用原则。 |
| `docs/development/agent-workflow.md` | 子代理工作流、commit 规则、Superpowers 与 gstack 分工。 |
| `docs/architecture/business-flows.md` | 用户注册认证、工具使用、支付充值、迭代创作等业务链路。 |
| `docs/architecture/executor-patterns.md` | 标杆工具执行规范、执行器模式、本地/Dify/外部回调执行链路。 |
| `docs/architecture/security-and-performance.md` | 数据安全、接口安全、资金安全和性能指标。 |

## 5. CLAUDE.md 保留内容

重构后的 [CLAUDE.md](../../../CLAUDE.md) 应定位为“Claude 工作入口文件”，建议保留以下内容：

### 5.1 项目一句话定位

保留项目名称和一句话说明，帮助 Claude 建立基础上下文：

> 灵创AI工具箱是专注于垂直专业场景的精品 AI 工具集合平台。

详细产品背景迁移到 `docs/project/overview.md`。

### 5.2 语言和沟通规则

必须保留：

- 使用中文回复用户问题。
- 不确定需求边界时先沟通，不做假设。
- 功能开发前先对照 PRD 或相关设计文档确认边界。

### 5.3 高优先级开发原则

保留会直接影响工作方式的原则：

- 先设计后编码。
- 遵循现有代码风格。
- 优先实现核心路径，不做过度设计。
- 新增接口必须考虑权限控制。
- 涉及数据库变更必须通过 Alembic migration。
- 涉及用户数据、支付、资金和安全相关逻辑必须考虑审计、幂等和回滚。

更详细的开发规范迁移到 `docs/development/coding-principles.md`。

### 5.4 子代理强制规则

保留当前子代理规则，因为它们是强制行为约束：

- 子代理不得执行 `git commit`。
- 父代理派发子代理 prompt 时必须附加“不执行 git commit”规则。
- 父代理收到子代理实现报告后负责统一提交。

详细说明可迁移到 `docs/development/agent-workflow.md`，但 [CLAUDE.md](../../../CLAUDE.md) 中应保留最小强制摘要。

### 5.5 Superpowers + gstack 分工

保留工具职责边界：

- Superpowers 负责 plan、brainstorm、debug、TDD、verify、code review。
- gstack 负责浏览器操作、QA、ship、deploy、canary、安全审计。
- 使用 `/browse` 作为唯一浏览器入口。
- 禁止直接使用 `mcp__claude-in-chrome__*` 操作浏览器。

技能长列表不建议继续硬编码在 [CLAUDE.md](../../../CLAUDE.md)，因为当前会话环境会动态提供可用技能。若必须保留，应移动到 `docs/development/agent-workflow.md` 或仅保留“以当前会话 Available skills 为准”。

### 5.6 按需读取路由

[CLAUDE.md](../../../CLAUDE.md) 应新增“按需读取规则”，例如：

```md
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
```

## 6. 内容迁移映射

| 当前 [CLAUDE.md](../../../CLAUDE.md) 内容 | 目标位置 | 处理方式 |
|---|---|---|
| 项目概述一句话 | [CLAUDE.md](../../../CLAUDE.md) | 保留摘要。 |
| 核心差异化优势 | `docs/project/overview.md` | 完整迁移。 |
| 技术栈规范 | `docs/development/tech-stack.md` | 完整迁移。 |
| 设计系统规范 | `docs/development/design-system.md` | 完整迁移。 |
| 目录结构规范 | `docs/development/tech-stack.md` | 与技术栈合并。 |
| 核心业务流程规范 | `docs/architecture/business-flows.md` | 完整迁移。 |
| 标杆工具执行规范 | `docs/architecture/executor-patterns.md` | 完整迁移。 |
| 安全规范 | `docs/architecture/security-and-performance.md` | 完整迁移。 |
| 性能指标要求 | `docs/architecture/security-and-performance.md` | 与安全目标合并。 |
| MVP 功能范围 | `docs/project/roadmap.md` | 完整迁移。 |
| 开发原则 | [CLAUDE.md](../../../CLAUDE.md) + `docs/development/coding-principles.md` | [CLAUDE.md](../../../CLAUDE.md) 保留强制摘要，详细内容迁移。 |
| 子代理工作流规范 | [CLAUDE.md](../../../CLAUDE.md) + `docs/development/agent-workflow.md` | [CLAUDE.md](../../../CLAUDE.md) 保留强制摘要，详细内容迁移。 |
| Superpowers + gstack 搭配配置 | [CLAUDE.md](../../../CLAUDE.md) + `docs/development/agent-workflow.md` | [CLAUDE.md](../../../CLAUDE.md) 保留职责边界，细节迁移。 |
| 参考文档 | `docs/project/reference-index.md` | 完整迁移，CLAUDE.md 只保留入口链接。 |

## 7. 渐进式披露原则

重构后应遵守以下原则：

1. **入口短而强**：CLAUDE.md 只放必须每次生效的工作规则。
2. **任务驱动读取**：Claude 只在任务需要时读取对应专题文档。
3. **背景不抢占指令**：产品背景、业务流程、路线图等不应与强制执行规则混在同一层级。
4. **高变内容外置**：MVP 状态、技能列表、参考文档索引等易变内容不放入入口文件主体。
5. **避免重复事实源**：详细事实只在专题文档维护，CLAUDE.md 只链接，不复制完整内容。
6. **新增内容有归属**：后续新增规范时优先判断应进入哪个专题文档，只有强制行为规则才进入 CLAUDE.md。

## 8. 实施步骤

建议按以下顺序实施：

1. 创建 `docs/project/`、`docs/development/`、`docs/architecture/` 目录及对应专题文档。
2. 按迁移映射将当前 [CLAUDE.md](../../../CLAUDE.md) 的详细内容移动到专题文档。
3. 重写 [CLAUDE.md](../../../CLAUDE.md)，保留强制摘要和按需读取路由。
4. 检查所有相对链接是否可读。
5. 检查迁移前后的信息是否丢失。
6. 提交文档重构变更。

## 9. 验证方式

实施完成后，至少进行以下验证：

- `git diff -- CLAUDE.md docs/project docs/development docs/architecture`：确认迁移范围符合预期。
- 检查 [CLAUDE.md](../../../CLAUDE.md) 是否仍包含大段 PRD、路线图或业务流程细节；如有，应继续迁出。
- 检查每个专题文档是否职责单一，避免新的“大杂烩”。
- 检查按需读取规则是否覆盖当前 [CLAUDE.md](../../../CLAUDE.md) 中所有被迁出的主题。
- 如可用，运行 Markdown lint 或至少人工检查标题层级、链接和表格格式。

## 10. 风险与缓解

| 风险 | 缓解方式 |
|---|---|
| Claude 后续不知道该读哪份文档 | 在 [CLAUDE.md](../../../CLAUDE.md) 中提供明确的按任务类型读取路由。 |
| 信息被拆散后不易维护 | 每份专题文档只承担一个职责，并在 `docs/project/reference-index.md` 建立总索引。 |
| 迁移时遗漏内容 | 使用迁移映射逐项核对，并通过 `git diff` 审查。 |
| CLAUDE.md 后续再次膨胀 | 在入口文件中写明“只有强制行为规则进入本文件，背景资料进入专题文档”。 |

## 11. 成功标准

重构完成后应满足：

- [CLAUDE.md](../../../CLAUDE.md) 明显短于当前版本，建议控制在 120-180 行以内。
- 当前文件中的主要信息均在新文档结构中可找到。
- Claude 能根据任务类型知道应读取哪份文档。
- 人类开发者能通过 `docs/project/reference-index.md` 找到完整项目资料。
- 强制行为规则仍然留在 [CLAUDE.md](../../../CLAUDE.md)，不会因拆分而弱化。
