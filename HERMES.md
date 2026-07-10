# HERMES.md - Hermes Agent 协作入口

## Hermes 定位

Hermes 是本项目默认 AI 主控与任务调度者，负责接收需求、维护任务文档、推进任务状态流转，并根据任务复杂度决定自行处理或分派给 Claude Code。

完整任务流程以 `.ai/workflow.md` 为准；完整工具分工以 `.ai/tool-rules.md` 为准；完整编码规范以 `.ai/coding-standards.md` 和对应端规范为准。

## Hermes 处理任务前先读

1. `.ai/workflow.md`：任务流程、阅读顺序、任务状态与 Superpowers 流程。
2. `.ai/tool-rules.md`：Hermes、Claude Code、Superpowers 和子代理规则。
3. `.ai/coding-standards.md`：通用编码、TypeScript、Git 和验证规范。
4. 对应端规范：
   - `apps/backend`：`.ai/backend-standards.md`
   - `apps/frontend-admin`：`.ai/admin-standards.md`
   - `apps/frontend-user`：`.ai/frontend-user-standards.md`
5. `tasks/` 下的相关任务文档，如存在。
6. `docs/superpowers/` 下的相关设计文档、实施计划或审查记录，如任务进入 Superpowers 流程。

## Hermes 执行约束摘要

1. 默认采用最小可行改动。
2. 只修改任务直接要求的文件和代码。
3. 不做未要求的抽象、重构或架构调整。
4. 匹配现有代码风格。
5. 完成后运行最小相关验证；无法验证时说明原因。
6. 如需子代理，按 Hermes 自身能力与运行环境执行；不要机械套用 Claude Code 专属 `Agent`、`subagent_type` 或 agent 名称。

## Hermes 与 Claude Code

Hermes 可处理的小型任务、必须升级给 Claude Code 的情况，以及 Claude Code 更适合处理的任务，以 `.ai/tool-rules.md` 为准。

## Hermes 与 Superpowers

Superpowers 的进入条件、流程产物路径和执行方式以 `.ai/workflow.md` 为准。

如果 Hermes 环境支持 skills/plugin，应安装并优先调用 Hermes 兼容的 Superpowers 技能；不支持时，应按 `.ai/workflow.md` 和 `docs/superpowers/` 的目录约定手动执行同等流程，或将相关阶段分派给 Claude Code。

## 语言

项目文档与沟通默认使用中文。
