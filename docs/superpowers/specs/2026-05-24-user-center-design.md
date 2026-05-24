# 个人中心功能完善 — 设计文档

## 概述

基于现有个人中心排版格式，补充缺失功能，达到可用标准。聚焦修复假数据问题、补充侧边栏导航、增加主内容区展示模块。

## 变更范围

### 1. 侧边栏导航 — 重组为3个分组

现有菜单（个人信息/账号安全/实名认证/积分明细）保留，新增菜单项并重组为分组布局：

**创作管理：**
- 我的作品 → `/works` (已有页面，新增链接)
- 订单记录 → `/orders` (已有页面，新增链接)

**互动中心：**
- 我的收藏 → `/user-center/favorites` (新页面)
- 帮助与反馈 → `/feedback` (已有页面，新增链接)

**账户设置：**
- 个人信息 → `/user-center/profile` (保留)
- 账号安全 → `/user-center/security` (保留)
- 实名认证 → `/user-center/verification` (保留)
- 积分明细 → `/user-center/points` (保留)

### 2. 欢迎横幅 — 修复假数据

- 使用天数：从 `Math.random()` 改为实际注册天数
- 今日使用次数：从 `Math.random()` 改为当日 task 完成数

需要新增 API：`GET /users/stats` 返回 `{days_used, today_count, total_works, total_consumed, reward_points}`

### 3. 统计卡片 — 使用真实数据

从 3 个卡片改为 3 个卡片，数据来源：

| 卡片 | 数据来源 | 备注 |
|------|---------|------|
| 作品总数 | `GET /works` 返回 total | +5 本周（本周创建数） |
| 累计消费 | `GET /users/transactions` type=consume 汇总 | |
| 奖励积分 | `GET /users/transactions` type=reward/adjust 汇总 | |

### 4. 主内容区 — 4个独立区块

#### 4.1 进行中的任务
- 数据来源：`GET /tasks?status=pending,running`
- 展示：工具图标 + 名称 + 进度条 + 状态标签
- 工具图标使用 task 关联 tool 的 `cover_image`，取第一张
- 超过3条显示「查看全部」链接到 `/works`

#### 4.2 最新作品
- 数据来源：`GET /works?page=1&page_size=3&sort=created_at`
- 展示：封面缩略图卡片（4:3比例），悬浮显示 查看/下载 按钮
  - **查看** → 跳转作品详情页 `/works/detail/[id]`
  - **下载** → 调用 `GET /works/{id}/download`，下载 ZIP 压缩包（已有接口）
- 标题、工具类型、页数、相对时间
- 封面图使用 work 关联的 tool 的 `cover_image` 字段，**多张图片以 `|` 分隔，取第一张**
- 若无封面图，使用工具类型对应的纯色渐变占位
- 「查看全部」链接到 `/works`

#### 4.3 最近使用工具
- 数据来源：`GET /tools/recent` (新增API)，返回最近使用的工具列表，附带 `cover_image`
- 展示：工具封面图(`cover_image` 取第一张) + 名称 + 使用次数 + 时间 + 「使用」按钮
- 最多3条
- 「浏览全部」链接到 `/tools`

#### 4.4 我的收藏
- 数据来源：`GET /tools/favorites/list?page=1&page_size=3`
- 展示：工具封面图(`cover_image` 取第一张) + 工具名称 + 收藏时间 + 「立即使用」按钮
- 最多3条
- 「查看全部」链接到 `/user-center/favorites`

## 新增页面

### 我的收藏页 `/user-center/favorites`
- 列出用户所有收藏的工具
- 支持取消收藏操作
- 分页列表
- 复用现有的 `toolApi.getFavorites()` 和 `toolApi.toggleFavorite()`

## 新增/修改 API

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/users/stats` | 用户统计（使用天数、今日次数等） | 新增 |
| GET | `/tools/recent` | 最近使用的工具列表 | 新增 |
| GET | `/tools/favorites/list` | 已存在，直接使用 | 已有 |

## 修复项

1. **欢迎横幅假数据**：`Math.random()` → `GET /users/stats` 真实数据
2. **统计卡片假数据**：`Math.random()` → works/transactions API 真实数据
3. **最近使用工具假数据**：硬编码 → `GET /tools/recent` API 真实数据
4. **进行中任务假数据**：硬编码 → `GET /tasks?status=pending,running` 真实数据
5. **实名认证奖励不一致**：前端显示"20积分" → 统一为后端实际的"50积分"

## 不纳入范围

- 每日签到（已确认暂不实现）
- 迭代创作流程完善（仅梳理入口，不在此次实现）
- Store 合并（`useUserStore` vs `useAuthStore` 暂不处理）
- 头像上传功能（暂不实现）

## 设计稿

详见 `docs/design/user-center-v2.html`
