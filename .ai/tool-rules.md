# AI 工具规则

> 本文件是 Hermes、Claude Code、Superpowers 和子代理规则的唯一权威来源。
> `CLAUDE.md` 和 `HERMES.md` 只保留入口摘要，不复制本文件完整分工清单。

## 共享规则

1. 修改代码前先阅读 `.ai/context.md`。
2. 实现前先阅读 `tasks/` 下的相关任务。
3. 保持改动小，并且直接对应任务目标。
4. 涉及接口变更时，优先更新接口契约或 API 文档。
5. 标记完成前必须验证改动。
6. 项目文档与沟通默认使用中文。
7. 处理 `apps/backend` 任务时，额外阅读 `.ai/backend-standards.md`。
8. 处理 `apps/frontend-admin` 任务时，额外阅读 `.ai/admin-standards.md`。
9. 处理 `apps/frontend-user` 任务时，额外阅读 `.ai/frontend-user-standards.md`。

## Hermes

Hermes 是本项目默认 AI 主控与任务调度者，负责接收需求、维护任务文档、推进任务状态流转，并根据任务复杂度决定由 Hermes 自行处理或分派给 Claude Code。

**Hermes 可直接处理：**

- 任务文档创建和维护。
- README、流程文档、小型说明更新。
- 小范围局部修改。
- UI 或组件初稿。
- 重复性迁移工作。
- 按现有局部模式补充实现。
- 不涉及接口契约的小配置调整。

**Hermes 必须升级给 Claude Code 的情况：**

- 后端服务核心逻辑。
- API 契约、DTO 或接口文档变更。
- 跨应用或跨 `packages/` 修改。
- 架构设计或重构。
- 数据库结构或 SQL 迁移判断。
- 非平凡功能实现。
- 验证失败且原因不明确。
- 任何可能影响多个系统边界的改动。

没有任务文档时，Hermes 应先创建或要求创建任务文档，再推进实现；除非用户明确授权，不应直接开始大型架构变更。

## Claude Code

Claude Code 是本项目复杂编码与技术实现主力。

**Claude Code 更适合：**

- 架构设计。
- 任务拆解。
- 跨模块重构。
- 后端服务逻辑。
- API 契约设计。
- 旧代码行为分析。
- 代码审查。
- 验证和文档维护。

Claude Code 接收 Hermes 分派的任务时，应阅读相关任务文档和 `.ai/` 共享规则，只修改任务直接需要的代码，并在完成后报告修改文件、验证结果和遗留问题。

## Superpowers

Superpowers 是本项目非平凡任务的标准工作流，不绑定单一 AI 工具。

当任务涉及非平凡需求、重构、多步骤实现、接口设计、跨模块修改或旧代码迁移时，主控 AI 必须进入 Superpowers 流程：

- 设计文档：`docs/superpowers/specs/`
- 实施计划：`docs/superpowers/plans/`
- 审查和验证记录：`docs/superpowers/reviews/`

支持 skills/plugin 的 AI 工具应直接安装并调用 Superpowers 技能。
不支持 skills/plugin，或当前环境未安装 Superpowers 技能时，应按上述目录和文档约定手动执行同等流程，或将该阶段分派给 Claude Code。

Hermes 作为主控时，应负责判断任务是否需要 Superpowers，并推动设计、计划、实现、审查和验证记录的创建与流转。

Claude Code 作为技术主力时，应优先使用 Superpowers 技能完成复杂设计、计划、实现、验证和审查。

## 子代理工作流规范

本节仅适用于 **Claude Code 环境** 中通过 `Agent` 工具和 `subagent_type` 参数派遣子代理的场景。

Hermes 如使用自身原生子代理或调度机制，应遵循 Hermes 的实际能力与 `HERMES.md` 中的主控职责；不得机械套用本节的 Claude Code 专属 agent 名称、`general-purpose` fallback 或 `subagent_type` 参数。

在 Claude Code 环境中，本项目所有子代理任务必须遵循以下规则。

### 子代理类型选择（禁止默认 general-purpose）

派遣子代理时**禁止默认使用 `general-purpose`**。必须按任务性质选择最匹配的专门角色：

| 任务性质                                                  | 应派遣的子代理类型 |
| --------------------------------------------------------- | ------------------ |
| Vue / React 组件、前端页面、UI 实现                       | 前端开发者         |
| 视觉布局、CSS 体系、token 应用、布局框架                  | UX 架构师          |
| 像素级 UI、组件库、视觉一致性                             | UI 设计师          |
| 后端服务、API、服务端业务逻辑                             | 后端架构师         |
| 数据库 schema、SQL 优化、索引策略                         | 数据库优化师       |
| 代码审查（spec compliance / code quality / final review） | 代码审查员         |
| 多文件检索、跨目录大范围搜索                              | Explore            |
| 测试用例编写与 API 验证                                   | API 测试员         |
| 测试证据链与质量评估                                      | 证据收集者         |
| 任务文档创建与维护、范围拆解                              | 高级项目经理       |
| 架构设计、跨模块决策、领域驱动设计                        | 软件架构师         |
| Git 工作流（分支、变基、worktree）                        | Git 工作流大师     |
| 安全评估、威胁建模                                        | 安全工程师         |
| LLM 应用工程（Prompt、RAG、Tool Use）                     | LLM 应用工程师     |
| 技术文档、API 参考、README                                | 技术文档工程师     |
| Claude Code / Claude API / Agent SDK 使用问题             | claude-code-guide  |

**Fallback 规则：**

仅当任务确实跨多个角色边界，且没有任何专门 agent 匹配时，才允许 fallback 到 `general-purpose`；并需在派遣 prompt 开头一行说明：「使用 general-purpose 的理由：〈具体原因〉」。

**典型反例（这些是过去常犯的错误，必须避免）：**

- ❌ "改一个 Vue 组件" → 派 `general-purpose`：应派 **前端开发者**
- ❌ "追加一段 CSS / 调 token" → 派 `general-purpose`：应派 **UX 架构师** 或 **UI 设计师**
- ❌ "对照 plan / spec 审查改动" → 派 `general-purpose`：应派 **代码审查员**
- ❌ "跨目录找用法" → 派 `general-purpose`：应派 **Explore**
- ❌ "改动小，没必要派专家" → 这不是理由；改动小也按角色派

**自检触发：** 每次准备调用 Agent 工具时，先在脑内回答："这个任务的核心性质是什么？上表里哪一行最匹配？" 然后才填写 `subagent_type` 参数。

### 禁止子代理自行执行 git commit

子代理只负责写代码，不执行 `git commit`。

- 子代理完成工作后，只需要在报告中列出所有修改/创建的文件路径清单。
- git commit 操作统一由父代理按任务批量执行。
- 原因：子代理隔离环境中的 git 操作可能静默失败，导致"报告说已提交，实际没提交"的不一致问题。

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
5. 向用户报告"已完成并提交"。
