# CLAUDE.md - Claude Code 开发入口

## 项目概述

**项目名称**: LCAITool
**版本**: v1.0
**架构**: 前后端分离 Monorepo
**技术栈**: Python FastAPI + SQLAlchemy + React + Next.js + TypeScript

---

## Claude Code 定位

Claude Code 是本项目复杂编码与技术实现主力，重点处理架构设计、任务拆解、后端服务核心逻辑、API 契约设计、跨模块重构、旧代码行为分析、复杂实现、验证和代码审查。

完整工具分工以 `.ai/tool-rules.md` 为准；本文件只保留 Claude Code 入口摘要。

## 处理任务前先读

完整任务流程和阅读顺序以 `.ai/workflow.md` 为准。Claude Code 处理任务时至少关注：

1. `.ai/workflow.md`：任务流程、阅读顺序、任务状态与 Superpowers 流程。
2. `.ai/tool-rules.md`：Hermes、Claude Code、Superpowers 和子代理规则。
3. `.ai/coding-standards.md`：通用编码、TypeScript、Git 和验证规范。
4. 对应端规范：
   - `apps/backend`：`.ai/backend-standards.md`
   - `apps/frontend-admin`：`.ai/admin-standards.md`
   - `apps/frontend-user`：`.ai/frontend-user-standards.md`
5. `tasks/` 下的相关任务文档，如存在。
6. `docs/superpowers/` 下的相关设计文档、实施计划或审查记录，如任务进入 Superpowers 流程。

## Claude Code 硬规则摘要

1. 修改前先说明假设；不确定时先提问。
2. 优先做小而可验证的改动。
3. 只修改任务直接需要的代码；不要顺手重构无关内容。
4. 不引入未被要求的抽象、配置项或“未来扩展”。
5. 涉及接口变更时，先更新 `packages/api-contracts/` 或 `docs/api/`。
6. 完成前运行相关验证；无法验证时说明原因。
7. 派遣子代理时，遵守 `.ai/tool-rules.md` 中 Claude Code 环境的“子代理工作流规范”；子代理不得执行 `git commit`。
8. 项目文档与沟通默认使用中文。

## Superpowers

Superpowers 的进入条件、流程产物路径和执行方式以 `.ai/workflow.md` 为准。

非平凡需求、重构或多步骤实现，应优先使用 Superpowers 流程；支持 skills/plugin 的环境应优先调用对应技能。
