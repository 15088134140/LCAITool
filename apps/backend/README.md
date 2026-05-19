# 灵创AI工具箱 - 后端API

## 技术栈

- **框架**: FastAPI 0.110.0
- **数据库**: PostgreSQL 16 + SQLAlchemy 2.0 (异步)
- **缓存**: Redis
- **认证**: JWT
- **密码加密**: bcrypt
- **身份证加密**: AES-256
- **数据库迁移**: Alembic
- **测试**: pytest

## 项目结构

```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py      # 认证接口
│   │   │   │   ├── users.py     # 用户接口
│   │   │   │   ├── admin.py     # 管理员接口
│   │   │   │   └── health.py    # 健康检查
│   │   │   └── api.py           # 路由聚合
│   │   └── deps.py              # 依赖注入
│   ├── core/
│   │   ├── config.py            # 配置
│   │   ├── database.py          # 数据库连接
│   │   ├── security.py          # 安全工具（JWT、密码、AES）
│   │   └── exceptions.py        # 自定义异常
│   ├── models/
│   │   ├── base.py              # 基础模型
│   │   └── user.py              # 用户、角色、积分流水模型
│   ├── schemas/
│   │   ├── common.py            # 通用响应模式
│   │   ├── token.py             # Token模式
│   │   └── user.py              # 用户相关模式
│   ├── services/
│   │   ├── auth_service.py      # 认证服务
│   │   ├── user_service.py      # 用户服务
│   │   ├── role_service.py      # 角色服务
│   │   └── point_service.py     # 积分服务
│   └── main.py                  # 应用入口
├── alembic/
│   └── versions/                # 迁移文件
├── tests/                       # 单元测试
├── .env                         # 环境变量
├── alembic.ini                  # Alembic配置
├── pytest.ini                   # pytest配置
└── requirements.txt             # 依赖包
```

## 快速开始

### 1. 安装依赖

```bash
cd apps/backend
pip install -r requirements.txt
```

### 2. 配置环境变量

复制并修改 `.env` 文件：

```env
# Server
HOST=0.0.0.0
PORT=8000
DEBUG=True

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/lcaitool

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# API
API_V1_STR=/api/v1
PROJECT_NAME=灵创AI工具箱
```

### 3. 初始化数据库

```bash
# 创建数据库（PostgreSQL）
createdb lcaitool

# 运行迁移
alembic upgrade head
```

### 4. 启动服务

```bash
# 开发模式（自动重载）
python -m app.main

# 或使用 uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

服务启动后，访问以下地址：
- API文档: http://localhost:8000/docs
- ReDoc文档: http://localhost:8000/redoc

## API接口概览

### 认证模块 `/api/v1/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/register` | 用户注册 |
| POST | `/login` | 账号密码登录 |
| POST | `/wechat` | 微信OAuth登录 |
| POST | `/refresh` | 刷新Token |
| POST | `/logout` | 登出 |

### 用户模块 `/api/v1/users`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/me` | 获取当前用户信息 |
| PUT | `/me` | 更新当前用户信息 |
| POST | `/verify-id` | 实名认证提交 |
| GET | `/balance` | 查询积分余额 |
| GET | `/transactions` | 积分流水（分页） |

### 管理模块 `/api/v1/admin`

#### 用户管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/users` | 用户列表（分页、搜索、筛选） |
| GET | `/users/{id}` | 用户详情 |
| PUT | `/users/{id}` | 编辑用户信息 |
| PUT | `/users/{id}/status` | 启用/禁用账号 |
| POST | `/users/{id}/adjust-balance` | 调整积分 |
| PUT | `/users/{id}/roles` | 分配用户角色 |

#### 角色管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/roles` | 角色列表 |
| POST | `/roles` | 创建角色 |
| PUT | `/roles/{id}` | 编辑角色 |
| DELETE | `/roles/{id}` | 删除角色 |

## 统一响应格式

所有接口统一返回格式：

```json
{
    "code": 200,
    "message": "操作成功",
    "data": {
        // 具体数据
    }
}
```

### 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权/认证失败 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 测试

### 运行单元测试

```bash
# 运行所有测试
pytest

# 运行指定测试文件
pytest tests/test_user_service.py

# 生成覆盖率报告
pytest --cov=app --cov-report=html
```

### 测试覆盖率目标

- 核心业务逻辑: > 80%
- 整体覆盖率: > 70%

## 核心功能说明

### 1. JWT认证机制

- Access Token有效期: 30分钟
- Refresh Token有效期: 7天
- Token包含用户ID和类型标识

### 2. 身份证加密存储

- 使用AES-256-CBC加密算法
- 密钥从SECRET_KEY派生
- 显示时脱敏处理（仅显示前4位和后4位）

### 3. 积分流水记录

- 所有积分变动都记录流水
- 支持多种交易类型：充值、消费、退款、奖励、调整等
- 记录关联的业务ID

### 4. 权限控制

- 基于角色的访问控制（RBAC）
- 管理员路由需要admin角色
- 支持自定义权限装饰器

## 数据库迁移

```bash
# 创建新的迁移文件
alembic revision --autogenerate -m "描述"

# 运行迁移
alembic upgrade head

# 回滚
alembic downgrade -1

# 查看迁移历史
alembic history
```

## 常见问题

### 1. 数据库连接失败

检查PostgreSQL是否启动，用户名密码是否正确，数据库是否已创建。

### 2. 导入模块失败

确保当前目录在 `apps/backend`，或者将该目录添加到Python路径。

### 3. 测试失败

- 单元测试和E2E测试统一使用阿里云PostgreSQL数据库
- 确保网络可以连接到阿里云RDS数据库
- 测试前请先运行 `python scripts/init_e2e_users.py` 初始化测试用户

## 开发规范

1. 遵循PEP 8代码风格
2. 所有函数都添加类型注解
3. 新增接口必须有对应的单元测试
4. 数据库变更必须通过Alembic迁移
5. 涉及用户数据的操作必须记录日志

## License

Copyright © 2026 灵创AI工具箱
