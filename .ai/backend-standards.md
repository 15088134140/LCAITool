# 后端规范（apps/backend）

本规范仅适用于 `apps/backend`。处理后端任务时，本文件应在 `.ai/coding-standards.md` 之后阅读，并与通用规范共同生效。

## 技术栈边界

- 后端是 Python + FastAPI + SQLAlchemy + Alembic + Celery 服务。
- 不将前端或其他端的实现约束套用到后端。
- 修改前先查看当前模块的既有结构和命名，按局部模式实现。

## 项目结构

```
apps/backend/
├── app/
│   ├── api/           # API 路由层
│   ├── core/          # 核心配置、中间件
│   ├── models/        # SQLAlchemy 数据模型
│   ├── schemas/       # Pydantic 数据结构
│   ├── services/      # 业务逻辑层
│   ├── providers/     # AI 提供商集成
│   ├── executors/     # 执行器逻辑
│   ├── workers/       # Celery 异步任务
│   └── utils/         # 工具函数
├── alembic/           # 数据库迁移
├── tests/             # 测试文件
└── scripts/           # 辅助脚本
```

## API 路由层（api/）

- 使用 FastAPI APIRouter 组织路由。
- 路由只处理 HTTP 层职责：路由定义、参数接收、认证上下文、响应封装。
- 不在路由函数中写核心业务逻辑，应委托给 service 层。
- 使用 Pydantic Schema 进行输入输出验证。

## Service 层（services/）

- Service 承载核心业务逻辑。
- 数据访问通过 SQLAlchemy Model 完成，使用依赖注入获取数据库会话。
- 复杂逻辑拆成有明确业务含义的私有方法，避免为了抽象而抽象。
- Service 方法接收 db session 作为参数，不自己创建 session。

## 数据模型与迁移

- 数据模型定义在 `models/` 目录，继承 SQLAlchemy Base。
- 字段命名使用 `snake_case`，与数据库列名保持一致。
- 数据库迁移使用 Alembic：
  - 修改模型后运行 `alembic revision --autogenerate -m "描述"`
  - 执行迁移前审查生成的迁移脚本
  - 不要手动编辑已应用的迁移文件

## Pydantic Schemas

- 入参和出参 Schema 定义在 `schemas/` 目录。
- Schema 命名约定：
  - 请求体：`XxxCreate`、`XxxUpdate`
  - 响应体：`XxxResponse` 或 `Xxx`
  - 基础字段：`XxxBase`
- 使用 `Field()` 定义验证规则和示例值。

## 错误处理

- 业务错误明确抛出 `HTTPException` 或自定义异常。
- 使用 FastAPI 异常处理器统一处理错误响应。
- 不在 `except` 中静默忽略异常；如需降级，必须说明降级行为和日志。

## 异步任务

- 耗时操作使用 Celery 异步任务，定义在 `workers/`。
- 任务函数使用 `@app.task` 装饰器。
- 任务参数应可序列化，避免传递复杂对象。
- 任务状态和结果通过 Celery 机制管理。

## 日志

- 使用 Python `logging` 模块或项目封装的日志工具。
- 关键业务操作、异常路径和外部依赖失败应记录必要日志。
- 日志不得包含密码、令牌或敏感个人信息。

## AI 提供商集成

- AI 提供商实现放在 `providers/` 目录。
- 遵循统一的接口约定，便于扩展新提供商。
- 配置从数据库或环境变量加载，不要硬编码密钥。

## 后端验证命令

```bash
cd apps/backend

# 安装 Python 依赖
pip install -r requirements.txt

# 运行后端开发服务
pnpm dev
# 或
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 运行 Python 测试
pytest

# 运行 Celery Worker
pnpm celery:worker
# 或
python3 -m celery -A app.workers.celery_app worker -Q fast,medium,heavy -l info --pool=solo

# 数据库迁移
alembic upgrade head
```
