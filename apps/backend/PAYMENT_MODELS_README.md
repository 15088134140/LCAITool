# 支付与积分数据模型

## 概述

本次任务创建了完整的支付与积分管理数据模型，包括订单、充值档位和积分交易记录。

## 文件列表

### 新增文件

1. **app/models/payment.py** - 支付相关数据模型
   - `Order` - 订单表
   - `RechargePackage` - 充值档位配置表
   - `PointTransaction` - 积分交易记录表（完整版本）
   - 相关枚举类型：`PaymentProvider`, `OrderStatus`, `ReconciliationStatus`, `PointTransactionType`

2. **app/schemas/payment.py** - 支付相关Pydantic schemas
   - 与模型对应的请求/响应schema
   - 完整的类型定义

3. **tests/unit/models/test_payment_models.py** - 支付模型单元测试

4. **alembic/versions/004_payment_tables.py** - 数据库迁移脚本

### 修改文件

1. **app/models/user.py** - 移除PointTransaction定义
2. **app/models/__init__.py** - 更新导出
3. **app/schemas/__init__.py** - 更新导出
4. **app/schemas/user.py** - 移除PointTransaction相关schema
5. **app/services/point_service.py** - 更新以使用新的PointTransaction模型
6. **app/api/v1/endpoints/points.py** - 更新导入
7. **app/api/v1/endpoints/admin.py** - 更新导入

## 模型说明

### Order (订单表)
存储用户充值订单信息，包括支付状态、金额、积分等。

### RechargePackage (充值档位表)
定义可购买的充值套餐，包括原价、售价、赠送积分等。

### PointTransaction (积分交易表)
记录所有积分变更，包含：
- 变更前后余额
- 幂等键（防止重复交易）
- 关联订单/任务信息
- 操作人和备注

## 迁移说明

迁移脚本会：
1. 删除旧的point_transactions表
2. 创建新的recharge_packages表
3. 创建新的orders表
4. 创建新的完整point_transactions表

## 使用方式

```python
from app.models import Order, RechargePackage, PointTransaction
from app.schemas import OrderCreate, PointTransactionCreate
```
