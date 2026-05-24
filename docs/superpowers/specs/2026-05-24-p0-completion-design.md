# P0 功能补齐设计方案

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-05-24 | 初始版 — 运营功能 + 用户互动 + 系统设置 |
| V1.1 | 2026-05-24 | 补充管理端构思审核、退款管理、反馈管理页面 |

---

## 1. 概述

### 1.1 目标

完成 PRD V2.1 中标记为 P0 但尚未完成的功能，并在管理端新增系统设置模块，实现用户端和管理端全链路零 mock 数据。

### 1.2 范围

| 模块 | 当前状态 | 完成目标 |
|------|---------|---------|
| 每日签到 | 未实现 | 连续签到递增奖励，Redis+DB 双存储 |
| 邀请机制 | 表已设计，逻辑未实现 | 邀请码 + 注册奖励 + 充值跟踪 |
| 工具评价 | ToolRating 模型已存在 | 提交/展示/管理端全链路 |
| 通用反馈 | 前端静态页面存在 | 后端 API + 管理端反馈处理 |
| 系统设置 | 不存在 | 管理端 3 组配置管理 |
| 管理端构思审核 | PlaceholderPage 占位 | 创意列表/审核/状态管理页 |
| 管理端退款管理 | PlaceholderPage 占位 | 退款申请列表/处理页 |
| 管理端反馈管理 | 不存在 | 反馈列表/回复/采纳奖励页 |

---

## 2. 每日签到

### 2.1 规则

- 每天限签到一次（按 UTC+8 自然日）
- 连续签到第 N 天得 N 积分：1→2→3→4→5→6→7
- 第 8 天重置为第 1 天，7 天一个循环
- 断签（隔天未签）重置为第 1 天
- 连续满 7 天额外奖励 5 积分
- 签到奖励通过 `PointTransaction`（`type=REWARD`）记录

### 2.2 存储方案

**Redis（实时判断和展示）：**
- `checkin:{user_id}:{date}` → `true`（标识今日已签，TTL 7天）
- `checkin:streak:{user_id}` → 连续天数（持久化）
- `checkin:last_date:{user_id}` → 最后签到日期（持久化）

**PostgreSQL（持久化）：**
- `User` 表新增字段：`checkin_streak`、`last_checkin_date`、`total_checkin_days`

### 2.3 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/users/checkin` | 执行签到，返回 {streak, points_earned, total_points} |
| GET | `/api/v1/users/checkin/status` | 查询签到状态，返回 {today_checked, streak, can_checkin} |

### 2.4 前端

- 用户中心展示签到入口（侧边栏或横幅区域）
- 签到弹窗：连续天数、今日可领、明日预告

---

## 3. 邀请机制

### 3.1 数据模型

**User 表新增字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `invited_by` | UUID, FK→users.id | 邀请人用户ID |
| `invite_code` | String(20), unique | 8 位唯一邀请码 |

**邀请码规则：** 前缀 `LCA` + 5 位随机字母数字，用户注册/认证后自动生成。不可修改、不可重复。

### 3.2 奖励规则

| 事件 | 被邀请人 | 邀请人 | 限制 |
|------|---------|--------|------|
| 新用户注册 | +10 积分 | +10 积分 | 每日最多 50 积分 |
| 好友首次充值 | - | +20 积分 | |

通过 `PointTransaction`（`type=REWARD`）发放。

### 3.3 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/users/invite/info` | 我的邀请信息：invite_code, url, count, rewards |
| GET | `/api/v1/users/invite/list` | 邀请记录列表 |
| POST | `/api/v1/auth/register` | 注册参数增加 `invite_code`（选填） |

### 3.4 前端

- 个人中心新增"邀请好友"入口
- 展示邀请码、复制链接、已邀请人数、累计奖励
- 注册页面增加选填的"邀请码"输入框

---

## 4. 工具评价

### 4.1 数据模型

使用已有的 `ToolRating` 表，字段完备无需变更。

### 4.2 奖励规则

| 评价类型 | 奖励 |
|---------|------|
| 仅文字评价 | 2 积分 |
| 文字 + 图片评价 | 5 积分 |

限制：同一任务只能评价一次，任务完成后 7 天内可评价。

### 4.3 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/tools/{tool_id}/ratings` | 提交评价 |
| GET | `/api/v1/tools/{tool_id}/ratings` | 评价列表（分页、排序） |
| GET | `/api/v1/tools/{tool_id}/ratings/stats` | 评分统计（平均分+分布） |
| POST | `/api/v1/tools/ratings/{id}/useful` | 点"有用" |
| GET | `/api/v1/admin/ratings` | 管理端评价列表 |
| PUT | `/api/v1/admin/ratings/{id}/status` | 管理端隐藏/显示评价 |
| POST | `/api/v1/admin/ratings/{id}/reply` | 管理员回复评价 |

### 4.4 前端

**用户端：**
- 成果页完成后弹出评价弹窗
- 工具详情页评价区（分页、按最新/最有用排序）
- 工具头部展示平均评分 + 评价条数

**管理端：**
- 新增评价管理页面（按工具/用户/评分筛选、隐藏/显示、回复）

---

## 5. 通用反馈

### 5.1 数据模型

新建 `feedbacks` 表：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK→users | 提交用户 |
| type | String | feature / bug / consult / other |
| title | String | 反馈标题 |
| description | Text | 详细描述 |
| contact | String | 联系方式（选填） |
| status | String | pending / processing / resolved / adopted |
| admin_reply | Text | 管理员回复 |
| reward_points | Integer | 采纳奖励积分 |
| replied_at | Integer | 回复时间戳 |
| rewarded_at | Integer | 奖励发放时间戳 |

### 5.2 采纳奖励流程

管理员标记"已采纳" → 输入奖励积分（20-100 分） → 系统发放 → 记录 `PointTransaction`（`type=REWARD`）

### 5.3 API 设计

**用户端：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/feedback` | 提交反馈 |
| GET | `/api/v1/feedback/my` | 我的反馈列表 |
| GET | `/api/v1/feedback/{id}` | 反馈详情 |

**管理端：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/feedback` | 反馈列表（按状态筛选） |
| PUT | `/api/v1/admin/feedback/{id}/status` | 更新状态 |
| POST | `/api/v1/admin/feedback/{id}/reply` | 管理员回复 |
| POST | `/api/v1/admin/feedback/{id}/reward` | 发放采纳奖励 |

### 5.4 前端

- 现有 `/feedback` 页面对接 API，保持 UI 不变
- 个人中心新增"我的反馈"入口
- 管理端新增"反馈管理"页

---

## 6. 系统设置

### 6.1 数据模型

#### 6.1.1 SystemConfig 表（用于基础信息 + 业务参数）

| 字段 | 类型 | 说明 |
|------|------|------|
| key | String PK | 配置键 |
| value | Text | 配置值 |
| group | String | 分组：basic / business |
| label | String | 显示名称 |
| description | Text | 描述 |
| type | String | 值类型：string / number / boolean / richtext |
| updated_by | UUID FK→users | 更新人 |

### 6.1.2 ai_providers 表（用于技术配置中的多AI提供商）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | |
| slug | String, unique | 标识符：volcano / deepseek / dify / openai |
| name | String | 显示名称 |
| provider_type | String | 类型：openai / volcano / dify / custom |
| config | JSON | API Key、Base URL、模型等（加密存储） |
| is_active | Boolean | 是否启用 |
| sort_order | Integer | 排序 |
| created_by | UUID FK→users | 创建人 |

### 6.2 配置项明细

#### A组：基础信息

| Key | 说明 | 类型 |
|-----|------|------|
| site_name | 站点名称 | string |
| site_slogan | 站点 Slogan | string |
| site_logo | Logo URL | string |
| site_icp | ICP 备案号 | string |
| contact_email | 联系邮箱 | string |
| contact_phone | 联系电话 | string |
| seo_keywords | SEO 关键词 | string |
| seo_description | SEO 描述 | text |
| user_agreement | 用户协议 | richtext |
| privacy_policy | 隐私政策 | richtext |

#### B组：业务参数

| Key | 说明 | 默认值 |
|-----|------|--------|
| checkin_base_points | 签到基础积分 | 1 |
| checkin_streak_bonus | 满7天额外奖励 | 5 |
| invite_register_reward | 邀请注册奖励（双方） | 10 |
| invite_recharge_reward | 邀请充值奖励 | 20 |
| invite_daily_limit | 每日邀请奖励上限 | 50 |
| register_bonus_points | 注册赠送积分 | 50 |
| verify_bonus_points | 实名认证奖励积分 | 50 |
| rating_text_reward | 评价奖励（文字） | 2 |
| rating_image_reward | 评价奖励（带图） | 5 |
| points_per_yuan | 1元兑积分比例 | 10 |

#### C组：AI 提供商

通过 `ai_providers` 表管理，每条记录代表一个供应商配置。

### 6.3 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/settings?group=basic\|business` | 获取设置（按分组） |
| PUT | `/api/v1/admin/settings` | 批量更新设置 |
| GET | `/api/v1/admin/ai-providers` | AI 提供商列表 |
| POST | `/api/v1/admin/ai-providers` | 新增提供商 |
| PUT | `/api/v1/admin/ai-providers/{id}` | 更新提供商 |
| DELETE | `/api/v1/admin/ai-providers/{id}` | 删除提供商 |
| GET | `/api/v1/site/info` | 公开接口：站点基础信息 |

> 所有配置变更写入 `AdminAuditLog`；AI 提供商 API Key 存储时 AES-256 加密。

### 6.4 管理端 UI

- 侧边栏新增"系统设置"菜单
- 3 个 Tab 分组：基础信息 / 业务参数 / AI 提供商
- 表单式编辑，保存即生效
- AI 提供商支持动态增删改

---

## 7. 管理端构思审核

### 7.1 概述

管理端"内容管理 → 构思审核"菜单对应的真实页面。目前为 PlaceholderPage 占位，需实现创意列表查看、审核、状态管理功能。

### 7.2 功能列表

| 功能 | 说明 |
|------|------|
| 创意列表 | 展示所有用户提交的创意，支持按状态/关键词筛选 |
| 创意详情 | 查看创意完整描述、提交人信息、投票数 |
| 审核操作 | 通过 / 拒绝 创意，填写审核备注 |
| 标记实现 | 已开发完成的创意标记为 "已实现" |
| 历史记录 | 展示审核人、审核时间、备注等审计信息 |

### 7.3 API 设计

管理端复用已有的创意相关 API（`/api/v1/ideas` 已有列表/详情接口），新增审核端点：

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/api/v1/admin/ideas/{id}/approve` | 审核通过 |
| PUT | `/api/v1/admin/ideas/{id}/reject` | 审核拒绝 |
| PUT | `/api/v1/admin/ideas/{id}/implement` | 标记已实现 |
| GET | `/api/v1/admin/ideas` | 管理端创意列表（含所有者信息） |

### 7.4 页面设计

- 表格列表：创意标题、提交人、分类、投票数、状态、提交时间
- 筛选栏：状态（全部/待审核/已通过/已拒绝/已实现）、关键词搜索
- 操作列：通过/拒绝/标记实现按钮
- 点击行展开详情面板

---

## 8. 管理端退款管理

### 8.1 概述

管理端"订单管理 → 退款管理"菜单对应的真实页面。目前为 PlaceholderPage 占位。

### 8.2 功能列表

| 功能 | 说明 |
|------|------|
| 退款申请列表 | 展示需要退款的订单（状态为 failed/refunded 的订单） |
| 退款处理 | 管理员确认退款，系统执行积分退还 |
| 退款记录 | 已完成退款的订单历史 |

### 8.3 退款流程

1. 管理员查看失败/异常订单列表
2. 点击"退款"按钮
3. 系统解冻预冻结积分（如有），将积分退还用户余额
4. 创建 PointTransaction（`type=REFUND`）记录
5. 更新订单状态为 refunded

### 8.4 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/refunds` | 退款列表（可退款 + 已退款订单） |
| POST | `/api/v1/admin/refunds/{order_id}/process` | 执行退款 |

### 8.5 页面设计

- 双 Tab：待处理 / 已处理
- 表格：订单号、用户、金额、支付方式、状态、创建时间
- 操作列：退款按钮（待处理 Tab）、查看详情（已处理 Tab）
- 退款确认弹窗：显示退款金额、用户当前余额

---

## 9. 管理端反馈管理

### 9.1 概述

管理端"内容管理"下新增"反馈管理"菜单。管理员可以查看用户提交的反馈，进行回复、处理、采纳奖励等操作。

### 9.2 功能列表

| 功能 | 说明 |
|------|------|
| 反馈列表 | 按状态/类型筛选，关键词搜索 |
| 反馈详情 | 查看完整反馈内容、用户信息 |
| 处理状态更新 | pending → processing → resolved / adopted |
| 管理员回复 | 对反馈进行回复 |
| 采纳奖励 | 标记已采纳并输入奖励积分（20-100），系统自动发放 |

### 9.3 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/feedback` | 反馈列表（按状态/类型筛选） |
| PUT | `/api/v1/admin/feedback/{id}/status` | 更新状态 |
| POST | `/api/v1/admin/feedback/{id}/reply` | 管理员回复 |
| POST | `/api/v1/admin/feedback/{id}/reward` | 发放采纳奖励 |

### 9.4 页面设计

- 表格列表：反馈标题、类型、提交用户、状态、提交时间
- 筛选栏：状态（全部/待处理/处理中/已解决/已采纳）、类型、关键词
- 详情弹窗：完整反馈内容 + 回复输入框
- 操作列：处理、回复、采纳奖励按钮

---

## 10. 管理端侧边栏更新

当前侧边栏"内容管理"分组已有构思审核、评价管理，需新增反馈管理。

```
内容管理（已有）
├── 构思审核 → 真实页面（替换 PlaceholderPage）
├── 评价管理 → 真实页面（替换 PlaceholderPage）
└── 反馈管理 → 新增页面
```

---

## 11. 数据库迁移

### 11.1 User 表变更（需迁移）

```sql
ALTER TABLE users ADD COLUMN invited_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN invite_code VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN checkin_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_checkin_date VARCHAR(10);
ALTER TABLE users ADD COLUMN total_checkin_days INTEGER DEFAULT 0;
CREATE INDEX idx_users_invited_by ON users(invited_by);
CREATE INDEX idx_users_invite_code ON users(invite_code);
```

### 11.2 新建表

- `feedbacks` 表
- `system_configs` 表
- `ai_providers` 表

---

## 12. 边界情况与错误处理

| 场景 | 处理方式 |
|------|---------|
| 重复签到 | 返回 400，提示"今日已签到" |
| 邀请自己 | 返回 400，禁止自邀 |
| 无效邀请码 | 注册时忽略，不影响注册流程 |
| 同一任务重复评价 | 返回 400，已评价 |
| 超过评价时限 | 返回 400，任务超 7 天不可评价 |
| 配置 Key 不存在 | 返回前端空值，不报错 |
| AI Provider 不可用 | 不影响其他 Provider，执行器自行处理 |
| 积分发放失败 | 事务包裹，失败回滚并记录错误日志 |

---

## 13. 实现顺序建议

考虑到依赖关系，推荐的实现顺序：

1. **系统设置**（SystemConfig + ai_providers 表）— 提供参数配置基础，后续奖励参数可配置
2. **每日签到** — 独立的 Redis + DB 方案
3. **邀请机制** — 涉及注册流程修改
4. **工具评价** — 模型已存在，主要是 API + 前端
5. **通用反馈** — 新表 + 管理端

实际实施时可按模块并行，减少等待时间。
