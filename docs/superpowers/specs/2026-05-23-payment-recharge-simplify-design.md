# 充值支付流程简化设计方案

## 背景

当前充值支付系统存在过度设计问题：

- 独立的 `/payment` 页面和 `/pricing` 页面功能重叠，数据各自硬编码不一致
- `RechargePackage` 模型字段过多（原价、售价、赠送比例、是否热门、排序等），但实际只需金额→积分映射
- 种子数据、前端 Mock、Pricing 页三套数据互不相同
- 用户端缺少 `GET /payment/orders` 端点，订单页面依赖 Mock 数据

## 目标

将充值流程简化为 PRD 3.5.2 节的设计：**4个固定档位 + 1个自定义金额输入**，所有充值在 `/pricing` 页一步完成，去掉独立的 `/payment` 页面。

## 涉及文件

### 后端
| 文件 | 改动 |
|------|------|
| `apps/backend/app/seed_data.py` | 种子数据对齐 PRD 4个档位 |
| `apps/backend/app/api/v1/endpoints/payment.py` | 新增自定义充值接口 + 订单列表接口 |

### 前端用户端
| 文件 | 改动 |
|------|------|
| `apps/frontend-user/src/app/pricing/page.tsx` | 重构为完整充值页：档位选择+自定义金额+支付+结果展示 |
| `apps/frontend-user/src/app/payment/page.tsx` | 删除 |
| `apps/frontend-user/src/components/payment/RechargePackageCard.tsx` | 删除 |
| `apps/frontend-user/src/app/user-center/points/page.tsx` | 2处 `/payment` → `/pricing` |
| `apps/frontend-user/src/app/orders/page.tsx` | 1处 `/payment` → `/pricing` |
| `apps/frontend-user/src/app/tools/storybook-generator/components/StorybookForm.tsx` | 1处 `/payment` → `/pricing` |
| `apps/frontend-user/src/app/tools/ecommerce-detail/components/EcommerceForm.tsx` | 1处 `/payment` → `/pricing` |
| `apps/frontend-user/src/app/tools/marketing-copywriter/components/MarketingForm.tsx` | 1处 `/payment` → `/pricing` |
| `apps/frontend-user/src/components/tool-detail/DialogMode.tsx` | 1处 `/payment` → `/pricing` |
| `apps/frontend-user/src/app/user-center/page.tsx` | 2处 `/user-center/points` → `/pricing`（"充值"和"立即充值"按钮） |

## 详细设计

### 1. 种子数据对齐 PRD

```python
# seed_data.py → seed_packages()
入门档: 30.00元 → 300基础 + 20赠送
进阶档: 100.00元 → 1000基础 + 100赠送  [推荐]
专业档: 300.00元 → 3000基础 + 400赠送  [最划算]
企业档: 1000.00元 → 10000基础 + 2000赠送
```

### 2. 后端新增接口

#### 2.1 自定义充值

自定义充值将创建订单和模拟支付合并为一个端点，前端一次调用即可完成充值+积分到账。

```
POST /payment/custom-recharge
Auth: 需登录
Body: { "amount": 30 }  // 金额(元), 最小1, 最大100000
流程: 计算积分(amount × 10) → 创建订单 → 自动模拟支付(同一事务) → 积分到账 → 返回结果
响应: {
    success: true,
    order_no: "ORD...",
    pay_amount: 30,
    total_points: 300,
    balance: 1300 (充值后余额),
    message: "充值成功"
}
```

说明：为保证资金流水可追溯，自定义充值同样走 `orders` 表，只是将创建订单和模拟支付合并为一个端点，前端不需要二次调用。

#### 2.2 用户订单列表

```
GET /payment/orders?page=1&page_size=20
Auth: 需登录
返回: { items: Order[], total: number }
```

### 3. `/pricing` 页面重构

页面布局（从上到下）：

1. **顶部余额卡片**
   - 当前积分余额（从 store 获取）
   - "积分明细"链接

2. **4个档位卡片**（同一行）
   - 从 API `GET /payment/packages` 获取
   - 展示：积分总数、赠送标签、价格
   - 热门档位标记"推荐"/"最划算"
   - 选中态高亮

3. **自定义金额输入**
   - 输入框 + "自定义充值"按钮
   - 金额对应积分实时显示（1元=10积分）

4. **确认支付按钮**
   - 显示选中/输入的金额
   - 点击 → 调 API → 模拟支付
   - 成功后显示结果（当前页内嵌，不跳转）：
     - ✅ 成功：显示订单号、到账积分、刷新余额
     - ❌ 失败：显示错误信息
   - 成功后展示"继续充值"按钮回到选档位状态

5. **安全保障区域**（保留原有的）

6. **常见问题**（保留原有的）

### 4. 移除 `/payment` 页面

删除文件，所有入口重定向到 `/pricing`。

### 5. 流程说明

```
用户进入 /pricing
  → 加载套餐列表 (GET /payment/packages)
  → 选择档位或输入自定义金额
  → 点击"立即支付"
    → 选择档位: 创建订单 (POST /payment/orders) → 模拟支付 (POST /payment/orders/{order_no}/pay)
    → 自定义金额: 一步完成 (POST /payment/custom-recharge)
    → 刷新余额
    → 展示结果
  → "继续充值"回到选档位
```

## 不变的部分

- 数据库模型、迁移脚本不动
- `PaymentService`、`OrderService`、`PointService` 不动
- 管理端订单管理页面不动
- 导航栏 `/pricing` 链接不动

## 测试要点

- 4个档位正确显示
- 选择档位 → 支付成功 → 积分到账
- 自定义金额 → 支付成功 → 积分到账
- 余额刷新正确
- 所有 `/payment` 入口正确指向 `/pricing`
