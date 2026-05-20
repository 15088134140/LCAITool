# Alembic 数据库迁移使用说明

## 概述

本项目使用 Alembic 管理数据库迁移。

## 当前状态

- [x] Alembic 已初始化
- [x] 首次迁移脚本已创建（001_initial.py）
- [x] 包含用户系统表：users, roles, user_roles, point_transactions
- [x] 异步数据库配置（asyncpg for PostgreSQL）
- [x] 模型配置支持自动生成迁移

## 文件结构

```
apps/backend/
├── alembic.ini              # Alembic 配置文件
├── alembic/
│   ├── env.py              # 迁移环境配置
│   ├── script.py.mako      # 迁移脚本模板
│   └── versions/
│       └── 001_initial.py  # 首次迁移脚本
└── app/
    ├── models/
    │   ├── __init__.py
    │   ├── base.py
    │   └── user.py
    └── core/
        └── database.py
```

## 常用命令

### 查看当前迁移状态
```bash
alembic current
```

### 创建新的迁移（自动检测模型变化）
```bash
alembic revision --autogenerate -m "描述信息"
```

### 升级到最新版本
```bash
alembic upgrade head
```

### 升级到指定版本
```bash
alembic upgrade <revision_id>
```

### 降级到上一个版本
```bash
alembic downgrade -1
```

### 降级到初始状态
```bash
alembic downgrade base
```

### 查看迁移历史
```bash
alembic history --verbose
```

## 首次迁移内容 (001_initial)

1. **users 表** - 用户表
   - 支持微信登录、手机号、邮箱登录
   - 实名认证信息存储
   - 积分余额和冻结积分
   - 乐观锁支持

2. **roles 表** - 角色表
   - 角色名称和描述
   - 权限字段（JSON格式）

3. **user_roles 表** - 用户角色关联表
   - 多对多关系

4. **point_transactions 表** - 积分交易记录表
   - 充值、消费、退款、调整等类型

5. **预置数据**
   - admin 角色（系统管理员）
   - admin 用户（密码：admin123，邮箱：admin@lcaitool.com）
   - test 用户（密码：test123，邮箱：test@lcaitool.com）

## 测试

本项目使用 SQLite 内存数据库进行单元测试，无需依赖 PostgreSQL。测试时会自动创建所有表。

运行测试：
```bash
pytest tests/test_user_service.py -v
```

## 注意事项

1. **数据库 URL 编码**：在 alembic.ini 中，`%` 字符需要转义为 `%%`
2. **异步支持**：env.py 已配置为支持异步数据库连接
3. **模型导入**：添加新模型后需要在 alembic/env.py 和 app/models/__init__.py 中导入
4. **迁移文件**：迁移文件应提交到版本控制
