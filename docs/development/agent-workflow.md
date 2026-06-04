# Agent 工作流规范

## 子代理工作流规范

本项目所有子代理任务必须遵循以下规则。

### 禁止子代理自行执行 git commit

子代理（implementer）只负责写代码，不执行 `git commit`。

- 子代理完成工作后，只需要在报告中列出所有修改/创建的文件路径清单。
- git commit 操作统一由父代理（父会话）按任务批量执行。
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

提交信息格式：

```text
feat: 实现 XXX (Task N)
```

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

可用技能以当前会话的 Available skills 为准，不在本文档中维护完整技能列表。
