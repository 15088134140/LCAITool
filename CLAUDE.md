# 灵创AI工具箱（LCAITool）- Claude 工作入口

## 项目一句话

**灵创AI工具箱** 是专注于垂直专业场景的精品 AI 工具集合平台，深耕细分场景，提供可交付、可迭代的专业 AI 工具成果。

## 基础沟通规则

- 使用中文回复用户问题。
- 不确定需求边界时先沟通，不做假设。
- 功能开发前先对照 PRD、设计文档或相关专题文档确认边界。

## 渐进式披露原则

本文件是 Claude 工作入口，不是完整项目手册。

- 只有每次会话必须生效的强制行为规则进入本文件。
- 产品背景、技术栈、业务流程、安全规范、路线图等详细资料放入专题文档。
- Claude 应根据任务类型按需读取下方专题文档，避免默认加载全部背景资料。
- 后续新增规范时，优先判断应进入哪个专题文档；只有强制行为规则才加入本文件。

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

## 高优先级开发原则

- 先设计后编码。
- 遵循现有代码风格。
- 优先实现核心路径，不做过度设计。
- 新增接口必须考虑权限控制。
- 涉及数据库变更必须通过 Alembic migration。
- 涉及用户数据、支付、资金和安全相关逻辑必须考虑审计、幂等和回滚。

## 子代理工作流规范（强制执行）

本项目所有子代理任务必须遵循以下规则。

### 禁止子代理自行执行 git commit

子代理只负责写代码，不执行 `git commit`。

- 子代理完成工作后，只需要在报告中列出所有修改/创建的文件路径清单。
- git commit 操作统一由父代理按任务批量执行。
- 原因：子代理隔离环境中的 git 操作可能静默失败，导致“报告说已提交，实际没提交”的不一致问题。

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
5. 向用户报告“已完成并提交”。

## Superpowers + gstack 搭配配置

### Superpowers（思考与流程层）

负责所有 plan、brainstorm、debug、TDD、verify、code review。

触发方式：自动触发。

### gstack（执行与外部世界层）

负责浏览器操作、QA、ship、deploy、canary、安全审计。

触发方式：斜杠命令手动触发。

### 浏览器规则

- 使用 `/browse` 作为唯一浏览器入口。
- 禁止使用 `mcp__claude-in-chrome__*` 操作浏览器。

### 分工裁决

- 计划撰写 → Superpowers: writing-plans。
- 计划多视角审查 → gstack: `/autoplan`。
- 编码 → Superpowers: test-driven-development。
- 调试 → Superpowers: systematic-debugging。
- 真实环境验证 → gstack: `/qa`。
- 代码审查 → Superpowers: requesting-code-review。
- 发布 → gstack: `/ship`。
- 安全审计 → gstack: `/cso`。

可用技能以当前会话提供的技能列表为准，不在本文件维护完整技能列表。

## 参考入口

- `docs/project/reference-index.md`：项目资料总索引。

**最后更新时间**：2026-06-04  
**文档版本**：V2.0
