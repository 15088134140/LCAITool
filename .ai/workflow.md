# AI 开发工作流

> 本文件是任务流程、阅读顺序、任务状态与 Superpowers 流程的唯一权威来源。
> `CLAUDE.md` 和 `HERMES.md` 只保留入口摘要，不复制本文件完整规则。

## 标准流程

1. 主控 AI 接收需求，并判断是否已有 `tasks/` 下的相关任务文档。
2. 没有任务文档时，先从 `.ai/task-template.md` 创建任务文档，并放入 `tasks/backlog/` 或 `tasks/in-progress/`。
3. 开始任务前，阅读 `.ai/context.md`。
4. 阅读 `.ai/coding-standards.md`。
5. 阅读 `.ai/tool-rules.md`。
6. 处理 `apps/backend` 任务时，额外阅读 `.ai/backend-standards.md`。
7. 处理 `apps/frontend-admin` 任务时，额外阅读 `.ai/admin-standards.md`。
8. 处理 `apps/frontend-user` 任务时，额外阅读 `.ai/frontend-user-standards.md`。
9. 阅读 `tasks/` 下的相关任务文档。
10. 查看 `docs/` 下的相关文档。
11. 修改文件前说明假设。
12. 使用满足任务要求的最小改动。
13. 运行范围最小且相关的验证命令。
14. 当行为、接口或架构发生变化时，同步更新文档或任务说明。

## 主控职责

Hermes 是本项目默认 AI 主控，负责接收需求、维护任务文档、推进任务状态流转，并根据任务复杂度决定自行处理或分派给 Claude Code。

Claude Code 是复杂编码与技术实现主力，负责架构设计、接口契约、后端服务核心逻辑、跨模块重构、旧代码行为分析、验证和代码审查。

## Superpowers 进入条件

Superpowers 是本项目非平凡任务的标准工作流，不绑定单一 AI 工具。

当任务涉及以下任一情况时，主控 AI 必须进入 Superpowers 流程：

- 非平凡需求或多步骤实现。
- 架构设计或重构。
- 接口契约、API 文档或 DTO 变更。
- 跨应用或跨 `packages/` 修改。
- 数据库结构、SQL 或迁移策略判断。
- 验证失败且原因不明确。

Superpowers 流程产物：

- 设计文档：`docs/superpowers/specs/`
- 实施计划：`docs/superpowers/plans/`
- 审查和验证记录：`docs/superpowers/reviews/`

**文件命名规范**：`YYYY-MM-DD-<中文主题>-<类型>.md`，主题用简体中文简明描述（如"安卓端素材加载失败友好显示"）；`<类型>` 为 `设计`/`计划`/`审查`，分别对应 specs/plans/reviews。同一主题的 spec/plan/review 使用相同日期与主题，仅类型后缀不同。示例：`2026-07-08-安卓端素材加载失败友好显示-设计.md`。

支持 skills/plugin 的 AI 工具应优先安装并调用 Superpowers 技能。不支持或未安装 Superpowers 技能时，应按上述目录和流程手动执行同等流程，或分派 Claude Code 执行相关阶段。

## 任务状态

- `tasks/backlog`：已接受但尚未开始。
- `tasks/in-progress`：正在处理。
- `tasks/review`：已实现，等待审查。
- `tasks/done`：已验收完成。

**任务文档命名规范**：`tasks/<状态>/YYYY-MM-DD-<中文主题>.md`，主题用简体中文简明描述，与对应 Superpowers 文档（spec/plan/review）主题保持一致；`<状态>` 为 `backlog`/`in-progress`/`review`/`done`，随任务推进移动文件。示例：`tasks/in-progress/2026-07-08-安卓端素材加载失败友好显示.md`。
