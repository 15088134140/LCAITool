# 编码规范

本文件是所有端共同遵守的基础规范。处理具体应用时，还必须阅读对应端规范：

- `apps/backend`：`.ai/backend-standards.md`
- `apps/frontend-admin`：`.ai/admin-standards.md`
- `apps/frontend-user`：`.ai/frontend-user-standards.md`

## 编码前先思考

- 明确说明假设。
- 需求不清楚时先提问，不要静默选择。
- 存在多种解释时，说明主要选项和权衡。
- 如果更简单的方案足够解决问题，应主动采用更简单方案。

## 简单优先

- 编写能解决当前问题的最小代码。
- 不添加需求之外的功能。
- 不为单次使用场景引入抽象。
- 避免未被要求的配置项、扩展点和灵活性。
- 如果实现明显过长或过复杂，应先简化。

## 精准修改

- 只修改任务需要的文件和代码。
- 不顺手优化、格式化或重构无关代码。
- 匹配周围代码风格，即使存在个人偏好的不同。
- 发现无关死代码时只说明，不主动删除。
- 只移除当前改动引入的无用 import、变量、函数或文件。
- 每一处改动都应能直接追溯到任务目标。

## TypeScript 通用规范

- 默认遵循项目的 `strict` 严格类型约束，避免削弱已有类型安全。
- 禁止随意使用 `any`；确实无法提前知道类型时，优先使用 `unknown` 并通过类型守卫收窄。
- 共享类型优先放在 `packages/`，避免在多个应用中复制定义。
- 命名遵循以下约定：
  - 类名、类型、接口：`PascalCase`，如 `UserService`、`UserProfile`。
  - 函数和变量：`camelCase`，如 `getUserList`。
  - 常量：`UPPER_SNAKE_CASE`，如 `MAX_RETRY_COUNT`。
- 不为了绕过类型错误而添加类型断言；应优先修正数据结构或补充类型守卫。

## Python 通用规范

- 遵循 PEP 8 编码风格。
- 使用类型注解（type hints）标注函数参数和返回值类型。
- 命名遵循以下约定：
  - 类名：`PascalCase`，如 `UserService`。
  - 函数和变量：`snake_case`，如 `get_user_list`。
  - 常量：`UPPER_SNAKE_CASE`，如 `MAX_RETRY_COUNT`。
- 避免使用 `# type: ignore`，优先修正类型问题。

## 目标驱动执行

- 实现前定义成功标准。
- 多步骤任务应给出简短计划，并为每步说明验证方式。
- 修复缺陷时，优先补充能复现问题的测试。
- 改变行为时，优先补充覆盖新行为的测试。
- 重构时，应确保重构前后相关测试通过。
- 完成前运行相关验证；无法运行时说明原因。

## 通用验证命令

优先运行与改动范围最相关的命令：

```bash
# 根目录代码检查
pnpm lint

# 代码格式化
pnpm format

# 前端单元测试（具体端见对应规范）
pnpm test
```

后端 Python 验证命令见 `.ai/backend-standards.md`。

如果命令失败，报告失败命令、关键错误输出和下一步建议，不要声称验证通过。

## Git 提交规范

提交信息使用 Conventional Commits 格式：

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

常用 type：

| 类型       | 说明                         |
| ---------- | ---------------------------- |
| `feat`     | 新功能                       |
| `fix`      | Bug 修复                     |
| `docs`     | 文档更新                     |
| `style`    | 代码格式调整，不影响运行逻辑 |
| `refactor` | 重构，不改变外部行为         |
| `perf`     | 性能优化                     |
| `test`     | 测试相关                     |
| `chore`    | 构建、工具或依赖维护         |

示例：

```text
feat(ai): add provider parameter loading from database

- 新增从数据库配置加载 AI 提供商参数
- 支持多提供商配置管理
- 添加配置验证逻辑
```
