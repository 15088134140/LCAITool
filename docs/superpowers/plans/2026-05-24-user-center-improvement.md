# 个人中心功能完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善个人中心功能，修复假数据问题，补充侧边栏导航和主内容区展示，新增收藏管理页面

**Architecture:** 后端新增2个API端点（用户统计 / 最近使用的工具），前端重构个人中心主页，替换所有 `Math.random()` 假数据为真实API调用，侧边栏按分组展示导航链接，主内容区展示4个独立区块

**Tech Stack:** FastAPI, Next.js 14 (App Router), Zustand, SQLAlchemy

---

### Task 1: Backend — 新增 GET /users/stats 端点

**Files:**
- Modify: `apps/backend/app/api/v1/endpoints/users.py`
- Create: `apps/backend/app/schemas/stats.py`
- Modify: `apps/backend/app/services/user_service.py`

**逻辑说明：**
- `days_used`: 计算用户从注册日到今日的天数（`created_at` → now 的差值）
- `today_count`: 当天用户创建的 task 数量（`created_at` 为今天的记录数）
- `total_works`: 用户作品总数（`Work` 表中该用户的记录数）
- `total_consumed`: 累计消费积分（`PointTransaction` 中 type=consume 的绝对值之和）
- `reward_points`: 奖励积分（`PointTransaction` 中 type=reward 或 adjust 且 amount>0 之和）

- [ ] **Step 1: 创建 stats schema**

```python
# apps/backend/app/schemas/stats.py
from pydantic import BaseModel


class UserStatsResponse(BaseModel):
    days_used: int
    today_count: int
    total_works: int
    total_consumed: int
    reward_points: int
```

- [ ] **Step 2: 实现 stats service 方法**

在 `apps/backend/app/services/user_service.py` 中新增：

```python
from datetime import datetime, timezone
from sqlalchemy import func, extract
from app.models.task import Task, Work
from app.models.payment import PointTransaction


@staticmethod
async def get_user_stats(db: AsyncSession, user_id: UUID) -> dict:
    # 1. 注册天数
    user_result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    created = user.created_at
    if isinstance(created, datetime):
        days_used = (datetime.now(timezone.utc) - created).days + 1
    else:
        days_used = 1

    # 2. 今日任务数
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_count_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user_id,
            Task.created_at >= today_start
        )
    )
    today_count = today_count_result.scalar() or 0

    # 3. 作品总数
    works_result = await db.execute(
        select(func.count(Work.id)).where(Work.user_id == user_id)
    )
    total_works = works_result.scalar() or 0

    # 4. 累计消费积分
    consumed_result = await db.execute(
        select(func.abs(func.coalesce(func.sum(PointTransaction.amount), 0))).where(
            PointTransaction.user_id == user_id,
            PointTransaction.type == "consume"
        )
    )
    total_consumed = consumed_result.scalar() or 0

    # 5. 奖励积分
    reward_result = await db.execute(
        select(func.coalesce(func.sum(PointTransaction.amount), 0)).where(
            PointTransaction.user_id == user_id,
            PointTransaction.type.in_(["reward", "adjust"]),
            PointTransaction.amount > 0
        )
    )
    reward_points = reward_result.scalar() or 0

    return {
        "days_used": days_used,
        "today_count": today_count,
        "total_works": total_works,
        "total_consumed": total_consumed,
        "reward_points": reward_points,
    }
```

- [ ] **Step 3: 注册 GET /users/stats 路由**

在 `apps/backend/app/api/v1/endpoints/users.py` 中新增：

```python
from app.schemas.stats import UserStatsResponse
from app.services.user_service import UserService


@router.get("/stats", response_model=UserStatsResponse, summary="获取用户统计数据")
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """返回用户统计数据：注册天数、今日次数、作品总数、累计消费、奖励积分"""
    return await UserService.get_user_stats(db, current_user.id)
```

- [ ] **Step 4: 验证编译通过**

Run: `cd apps/backend && python -c "from app.api.v1.endpoints import users; print('OK')"`
Expected: OK (无 ImportError)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/schemas/stats.py apps/backend/app/api/v1/endpoints/users.py apps/backend/app/services/user_service.py
git commit -m "feat: add GET /users/stats endpoint for user center stats"
```

---

### Task 2: Backend — 新增 GET /tools/recent 端点

**Files:**
- Modify: `apps/backend/app/api/v1/endpoints/tools.py`
- Modify: `apps/backend/app/services/tool_service.py`
- Modify (if needed): `apps/backend/app/schemas/tool.py`

**逻辑说明：**
- 查询当前用户最近的 Task 记录（按 `created_at` 倒序），取前3条
- 关联对应的 Tool，返回 tool 的 id、name、cover_image、use_count
- 使用 DISTINCT ON 确保同一工具只出现一次（或查出后去重）

- [ ] **Step 1: 添加 ToolRecent schema（如不存在）**

检查 `apps/backend/app/schemas/tool.py`，如无则添加：

```python
class ToolRecentResponse(BaseModel):
    id: UUID
    name: str
    cover_image: Optional[str] = None
    use_count: int = 0
    last_used_at: Optional[int] = None
```

- [ ] **Step 2: 实现 recent tools service**

在 `apps/backend/app/services/tool_service.py` 中新增：

```python
from sqlalchemy import desc
from app.models.task import Task


@staticmethod
async def get_recent_tools(db: AsyncSession, user_id: UUID, limit: int = 3) -> list[dict]:
    # 查询最近使用的工具（去重）
    result = await db.execute(
        select(Task.tool_id, func.max(Task.created_at).label("last_used"))
        .where(
            Task.user_id == user_id,
            Task.tool_id.isnot(None),
            Task.status == "completed",
        )
        .group_by(Task.tool_id)
        .order_by(desc("last_used"))
        .limit(limit)
    )
    rows = result.all()

    tools = []
    for row in rows:
        tool_result = await db.execute(select(Tool).where(Tool.id == row.tool_id))
        tool = tool_result.scalar_one_or_none()
        if tool:
            cover_image = tool.cover_image.split("|")[0] if tool.cover_image else None
            tools.append({
                "id": tool.id,
                "name": tool.name,
                "cover_image": cover_image,
                "use_count": tool.use_count,
                "last_used_at": int(row.last_used.timestamp()) if row.last_used else None,
            })
    return tools
```

- [ ] **Step 3: 注册 GET /tools/recent 路由**

在 `apps/backend/app/api/v1/endpoints/tools.py` 中新增：

```python
from typing import List
from app.schemas.tool import ToolRecentResponse


@router.get("/recent", response_model=List[ToolRecentResponse], summary="获取最近使用的工具")
async def get_recent_tools(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """返回当前用户最近使用的工具列表（去重，最多3条）"""
    return await ToolService.get_recent_tools(db, current_user.id)
```

- [ ] **Step 4: 验证编译通过**

Run: `cd apps/backend && python -c "from app.api.v1.endpoints import tools; print('OK')"`
Expected: OK

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/schemas/tool.py apps/backend/app/api/v1/endpoints/tools.py apps/backend/app/services/tool_service.py
git commit -m "feat: add GET /tools/recent endpoint for recent tools"
```

---

### Task 3: Frontend — 新增 API 客户端方法和类型

**Files:**
- Modify: `apps/frontend-user/src/lib/api/types.ts`
- Modify: `apps/frontend-user/src/lib/api/modules/user.ts`
- Modify: `apps/frontend-user/src/lib/api/modules/tool.ts`

- [ ] **Step 1: 添加 UserStats 和 ToolRecentItem 类型**

在 `apps/frontend-user/src/lib/api/types.ts` 中新增：

```typescript
// 用户统计
export interface UserStats {
  days_used: number;
  today_count: number;
  total_works: number;
  total_consumed: number;
  reward_points: number;
}

// 最近使用的工具
export interface ToolRecentItem {
  id: string;
  name: string;
  cover_image: string | null;
  use_count: number;
  last_used_at: number | null;
}
```

- [ ] **Step 2: 添加 API 方法到 user.ts**

在 `apps/frontend-user/src/lib/api/modules/user.ts` 中新增：

```typescript
import type { UserStats } from '../types';

// 在 userApi 对象内新增：
export const userApi = {
  // ... 现有方法 ...

  getStats: (): Promise<UserStats> =>
    apiClient.get('/users/stats'),

  // ... 其他方法 ...
};
```

- [ ] **Step 3: 添加 API 方法到 tool.ts**

在 `apps/frontend-user/src/lib/api/modules/tool.ts` 中新增：

```typescript
import type { ToolRecentItem } from '../types';

// 在 toolApi 对象内新增：
export const toolApi = {
  // ... 现有方法 ...

  getRecentTools: (): Promise<ToolRecentItem[]> =>
    apiClient.get('/tools/recent'),

  // ... 其他方法 ...
};
```

- [ ] **Step 4: 验证编译通过**

Run: `cd apps/frontend-user && npx tsc --noEmit 2>&1 | head -20`
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add apps/frontend-user/src/lib/api/types.ts apps/frontend-user/src/lib/api/modules/user.ts apps/frontend-user/src/lib/api/modules/tool.ts
git commit -m "feat: add API client methods and types for user center"
```

---

### Task 4: Frontend — 重构侧边栏导航（分组布局）

**Files:**
- Modify: `apps/frontend-user/src/app/user-center/page.tsx` (sidebar 部分)

**设计说明：**
- 保留现有用户信息卡（头像、昵称、手机号、认证状态、积分余额）
- 导航菜单改为3个分组，每个分组带分组标题
- 分组1「创作管理」：我的作品(`/works`)、订单记录(`/orders`)
- 分组2「互动中心」：我的收藏(`/user-center/favorites`)、帮助与反馈(`/feedback`)
- 分组3「账户设置」：个人信息、账号安全、实名认证、积分明细（保留现有）
- 每个菜单项保留：彩色图标 + 标题 + 描述 + 右箭头

- [ ] **Step 1: 修改 sidebar 导航区域**

替换 `page.tsx` 中 "Navigation Menu" 区域的 `<nav>` 部分，改为分组布局：

```tsx
{/* Navigation Menu - 分组设计 */}
<div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">

  {/* 分组1: 创作管理 */}
  <div className="px-6 pt-5 pb-1">
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">创作管理</p>
  </div>
  <nav className="divide-y divide-gray-50">
    <Link href="/works" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
        </svg>
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">我的作品</p>
        <p className="text-xs text-gray-500">管理创作的成果</p>
      </div>
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
      </svg>
    </Link>

    <Link href="/orders" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
      <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
        </svg>
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">订单记录</p>
        <p className="text-xs text-gray-500">充值、消费明细</p>
      </div>
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
      </svg>
    </Link>
  </nav>

  {/* 分组2: 互动中心 */}
  <div className="px-6 pt-5 pb-1">
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">互动中心</p>
  </div>
  <nav className="divide-y divide-gray-50">
    <Link href="/user-center/favorites" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
      <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center group-hover:bg-pink-200 transition-colors">
        <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">我的收藏</p>
        <p className="text-xs text-gray-500">收藏的工具</p>
      </div>
      <span className="text-xs text-gray-400">{favoriteCount}个</span>
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
      </svg>
    </Link>

    <Link href="/feedback" className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">帮助与反馈</p>
        <p className="text-xs text-gray-500">常见问题、联系客服</p>
      </div>
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
      </svg>
    </Link>
  </nav>

  {/* 分组3: 账户设置 */}
  <div className="px-6 pt-5 pb-1">
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">账户设置</p>
  </div>
  <nav className="divide-y divide-gray-50">
    {/* 保留现有的4项：个人信息、账号安全、实名认证、积分明细 */}
    {/* ... 原有代码保持不变 ... */}
  </nav>
</div>
```

注意：`favoriteCount` 需要从 API 获取，可以直接复用 `toolApi.getFavorites()` 获取总数。

- [ ] **Step 2: 添加 favoriteCount 状态获取**

在 `page.tsx` 的 `useEffect` 中添加：

```typescript
const [favoriteCount, setFavoriteCount] = useState(0);

useEffect(() => {
  toolApi.getFavorites(1, 1).then(res => {
    setFavoriteCount(res.total || 0);
  }).catch(() => {});
}, []);
```

- [ ] **Step 3: 验证页面渲染正常**

Run: `cd apps/frontend-user && npm run build 2>&1 | tail -5`
Expected: 构建成功，无错误

- [ ] **Step 4: Commit**

```bash
git add apps/frontend-user/src/app/user-center/page.tsx
git commit -m "feat: restructure sidebar navigation with grouped layout"
```

---

### Task 5: Frontend — 重写主内容区（真实数据替换假数据）

**Files:**
- Modify: `apps/frontend-user/src/app/user-center/page.tsx` (main content 部分)

**需要替换的假数据：**

| 位置 | 当前代码 | 替换为 |
|------|---------|--------|
| 欢迎横幅 使用天数 | `Math.floor(Math.random() * 100) + 1` | `stats.days_used` |
| 欢迎横幅 今日使用 | `Math.floor(Math.random() * 5) + 1` | `stats.today_count` |
| 统计卡片 已完成任务 | `Math.floor(Math.random() * 50) + 5` | `stats.total_works` (改为"作品总数") |
| 统计卡片 收藏工具 | `Math.floor(Math.random() * 10) + 3` | 通过 `toolApi.getFavorites()` 获取 |
| 进行中的任务 | 硬编码 2 条 | `taskApi.getTasks({ status: 'pending,running' })` |
| 最近使用工具 | 硬编码 3 个 | `toolApi.getRecentTools()` |

- [ ] **Step 1: 添加数据获取逻辑**

在 `page.tsx` 中新增 state 和 useEffect：

```typescript
import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api/modules/user';
import { toolApi } from '@/lib/api/modules/tool';
import { taskApi } from '@/lib/api/modules/task';
import type { UserStats, ToolRecentItem, Task, Work } from '@/lib/api/types';

// State
const [stats, setStats] = useState<UserStats | null>(null);
const [recentTools, setRecentTools] = useState<ToolRecentItem[]>([]);
const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
const [latestWorks, setLatestWorks] = useState<Work[]>([]);
const [pageLoading, setPageLoading] = useState(true);

// 数据获取
useEffect(() => {
  if (!isAuthenticated) return;
  Promise.all([
    userApi.getStats(),
    toolApi.getRecentTools(),
    taskApi.getTasks({ status: 'pending,running' }),
    workApi.getWorks({ page: 1, page_size: 3, sort: 'created_at' }),
  ]).then(([statsData, toolsData, tasksData, worksData]) => {
    setStats(statsData);
    setRecentTools(toolsData);
    setPendingTasks(tasksData.items || []);
    setLatestWorks(worksData.items || []);
  }).catch(err => {
    console.error('Failed to load user center data:', err);
  }).finally(() => {
    setPageLoading(false);
  });
}, [isAuthenticated]);
```

- [ ] **Step 2: 替换欢迎横幅假数据**

将：
```tsx
<p className="text-blue-100">今天是使用灵创AI的第 {Math.floor(Math.random() * 100) + 1} 天</p>
{/* 和 */}
<p className="text-xl font-bold">{Math.floor(Math.random() * 5) + 1} 次</p>
```
改为：
```tsx
<p className="text-blue-100">今天是使用灵创AI的第 <strong>{stats?.days_used ?? '-'}</strong> 天</p>
{/* 和 */}
<p className="text-xl font-bold">{stats?.today_count ?? 0} 次</p>
```

- [ ] **Step 3: 替换统计卡片**

将原来的3个卡片（积分余额/已完成任务/收藏工具）改为3个新卡片：

```tsx
{/* Quick Stats */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* 作品总数 */}
  <div className="bg-white rounded-xl p-5 border border-gray-200">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
        </svg>
      </div>
      <div>
        <p className="text-xs text-gray-500">作品总数</p>
        <p className="text-2xl font-bold text-[#1E3A5F]">{stats?.total_works ?? '-'}</p>
      </div>
    </div>
  </div>

  {/* 累计消费 */}
  <div className="bg-white rounded-xl p-5 border border-gray-200">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div>
        <p className="text-xs text-gray-500">累计消费</p>
        <p className="text-2xl font-bold text-[#1E3A5F]">{stats?.total_consumed ?? '-'}</p>
      </div>
    </div>
    <p className="text-xs text-gray-400 mt-1">积分</p>
  </div>

  {/* 奖励积分 */}
  <div className="bg-white rounded-xl p-5 border border-gray-200">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
      </div>
      <div>
        <p className="text-xs text-gray-500">奖励积分</p>
        <p className="text-2xl font-bold text-[#7C3AED]">{stats?.reward_points ?? '-'}</p>
      </div>
    </div>
    <p className="text-xs text-gray-400 mt-1">累计获得</p>
  </div>
</div>
```

- [ ] **Step 4: 替换「进行中的任务」区块**

将硬编码的任务替换为从 API 获取的 `pendingTasks` 数据循环渲染。每个任务项展示：tool 的 cover_image（取第一张）、工具名称、任务描述、进度条、状态标签。

```tsx
{pendingTasks.length > 0 ? pendingTasks.slice(0, 3).map(task => {
  const coverImage = task.cover_image?.split('|')[0];
  return (
    <div key={task.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
      <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
        {coverImage ? (
          <img src={coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 truncate">{task.title || '未命名任务'}</h3>
            <p className="text-sm text-gray-500">{task.tool_name || ''}</p>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full flex-shrink-0 ml-2 ${
            task.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {task.status === 'running' ? '生成中' : '排队中'}
          </span>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">{task.progress_desc || ''}</span>
            <span className="text-[#2563EB] font-medium">{task.progress ?? 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-[#2563EB] to-[#3B82F6] h-full rounded-full" style={{ width: `${task.progress ?? 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}) : (
  <p className="text-center text-gray-400 py-8">暂无进行中的任务</p>
)}
```

- [ ] **Step 5: 替换「最新作品」区块**

用 `latestWorks` 渲染3个作品卡片。封面图取 tool 的 cover_image（`.split('|')[0]`），点击「查看」跳转 `/works/detail/[id]`，「下载」调用 `GET /works/{id}/download`。

```tsx
{latestWorks.length > 0 ? (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {latestWorks.map(work => {
      const coverImage = work.cover_image?.split('|')[0];
      return (
        <div key={work.id} className="card-hover rounded-xl border border-gray-200 overflow-hidden group">
          <a href={`/works/detail/${work.id}`} className="block">
            <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
              {coverImage ? (
                <img src={coverImage} alt={work.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                <div className="flex gap-2">
                  <Link href={`/works/detail/${work.id}`} className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-medium hover:bg-gray-100">查看</Link>
                  <a href={`/api/v1/works/${work.id}/download`} className="px-3 py-1.5 bg-[#059669] text-white rounded-lg text-xs font-medium hover:bg-[#047857]">下载</a>
                </div>
              </div>
            </div>
          </a>
          <div className="p-3">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{work.title || '未命名作品'}</h3>
            <p className="text-xs text-gray-500">{work.tool_name || ''} · {formatRelativeTime(work.created_at)}</p>
          </div>
        </div>
      );
    })}
  </div>
) : (
  <p className="text-center text-gray-400 py-8">暂无作品</p>
)}
```

- [ ] **Step 6: 替换「最近使用工具」区块**

用 `recentTools` 渲染3个工具卡片。

```tsx
{recentTools.length > 0 ? (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {recentTools.map(tool => {
      const coverImage = tool.cover_image?.split('|')[0];
      return (
        <div key={tool.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
              {coverImage ? (
                <img src={coverImage} alt={tool.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{tool.name}</h3>
              <p className="text-xs text-gray-500">已使用 {tool.use_count} 次 · {formatRelativeTime(tool.last_used_at)}</p>
            </div>
          </div>
          <Link href={`/tools/${tool.id}`} className="block w-full py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-center text-gray-700 hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-blue-50 transition-all">
            使用
          </Link>
        </div>
      );
    })}
  </div>
) : (
  <p className="text-center text-gray-400 py-8">暂无使用记录</p>
)}
```

- [ ] **Step 7: 替换「我的收藏」区块**

用 `toolApi.getFavorites()` 获取数据渲染。

```tsx
{/* 在页面组件中添加 state */}
const [favorites, setFavorites] = useState<ToolFavorite[]>([]);

{/* 在数据获取 useEffect 中添加 */}
toolApi.getFavorites(1, 3).then(res => {
  setFavorites(res.items || []);
}).catch(() => {});

{/* 渲染 */}
{favorites.length > 0 ? (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {favorites.map(fav => {
      const coverImage = fav.tool?.cover_image?.split('|')[0];
      return (
        <div key={fav.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-pink-200 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-pink-400 to-rose-500">
              {coverImage ? (
                <img src={coverImage} alt={fav.tool?.name || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm truncate">{fav.tool?.name || '未知工具'}</h3>
              <p className="text-xs text-gray-500">收藏于 {formatRelativeTime(fav.created_at)}</p>
            </div>
          </div>
          <Link href={`/tools/${fav.tool_id}`} className="block w-full py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-center text-pink-600 hover:border-pink-300 hover:bg-pink-50 transition-all">
            立即使用
          </Link>
        </div>
      );
    })}
  </div>
) : (
  <p className="text-center text-gray-400 py-8">暂无收藏</p>
)}
```

- [ ] **Step 8: 添加 formatRelativeTime 工具函数**

在 `page.tsx` 中或导入工具函数：

```typescript
const formatRelativeTime = (timestamp: number | string | null | undefined): string => {
  if (!timestamp) return '未知';
  const now = Date.now();
  const t = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diff = now - t;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  return new Date(t).toLocaleDateString('zh-CN');
};
```

- [ ] **Step 9: 验证页面渲染正常**

Run: `cd apps/frontend-user && npm run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 10: Commit**

```bash
git add apps/frontend-user/src/app/user-center/page.tsx
git commit -m "feat: replace mock data with real API calls in user center"
```

---

### Task 6: Frontend — 创建我的收藏页面

**Files:**
- Create: `apps/frontend-user/src/app/user-center/favorites/page.tsx`

- [ ] **Step 1: 创建收藏页面组件**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { toolApi } from '@/lib/api/modules/tool';
import type { ToolFavorite } from '@/lib/api/types';

const formatRelativeTime = (timestamp: number | string | null | undefined): string => {
  if (!timestamp) return '未知';
  const now = Date.now();
  const t = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diff = now - t;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(t).toLocaleDateString('zh-CN');
};

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [favorites, setFavorites] = useState<ToolFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadFavorites();
  }, [isAuthenticated, page]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const res = await toolApi.getFavorites(page, pageSize);
      setFavorites(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('加载收藏失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfavorite = async (toolId: string) => {
    try {
      await toolApi.toggleFavorite(toolId);
      await loadFavorites();
    } catch (err) {
      console.error('取消收藏失败:', err);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navigation */}
      <nav className="bg-white border-b border-[#E4E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/user-center" className="text-[#64748B] hover:text-[#1E3A5F] transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-[#1E3A5F]">我的收藏</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-gray-500 mb-4">还没有收藏任何工具</p>
            <Link href="/tools" className="inline-block px-6 py-3 bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-medium rounded-lg">
              浏览工具
            </Link>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map(fav => {
                const coverImage = (fav as any).tool?.cover_image?.split('|')[0];
                return (
                  <div key={fav.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden card-hover">
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-pink-400 to-rose-500">
                          {coverImage ? (
                            <img src={coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">{(fav as any).tool?.name || '未知工具'}</h3>
                          <p className="text-xs text-gray-500">收藏于 {formatRelativeTime((fav as any).created_at)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/tools/${fav.tool_id}`}
                          className="flex-1 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white text-sm font-medium rounded-lg text-center hover:shadow-md transition-all"
                        >
                          立即使用
                        </Link>
                        <button
                          onClick={() => handleUnfavorite(fav.tool_id)}
                          className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:border-red-300 hover:text-red-500 transition-all"
                        >
                          取消收藏
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 border border-gray-200 rounded-lg disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-lg font-medium ${page === p ? 'bg-[#1E3A5F] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 border border-gray-200 rounded-lg disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: 验证页面渲染正常**

Run: `cd apps/frontend-user && npm run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add apps/frontend-user/src/app/user-center/favorites/page.tsx
git commit -m "feat: add favorites management page"
```

---

### Task 7: 修复实名认证奖励不一致

**Files:**
- Modify: `apps/frontend-user/src/app/user-center/verification/page.tsx`

- [ ] **Step 1: 将"20积分"改为"50积分"**

搜索页面中所有显示"20积分"的地方，改为"50积分"。

```typescript
// 查找: 20积分 或 20 积分
// 改为: 50积分
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-user/src/app/user-center/verification/page.tsx
git commit -m "fix: sync verification reward amount from 20 to 50 to match backend"
```

---

### Task 8: 处理 cover_image 多图分隔的公共逻辑

**Files:**
- Create: `apps/frontend-user/src/lib/utils/image.ts`

提供一个复用工具函数，方便各组件统一处理 `cover_image` 多图分隔。

- [ ] **Step 1: 创建工具函数**

```typescript
// apps/frontend-user/src/lib/utils/image.ts

/**
 * 从 cover_image 字段中提取第一张图片URL
 * cover_image 可能包含多张以 | 分隔的图片
 */
export function getFirstImage(coverImage: string | null | undefined): string | null {
  if (!coverImage) return null;
  const images = coverImage.split('|');
  return images[0]?.trim() || null;
}
```

- [ ] **Step 2: 更新 page.tsx 使用该工具函数**

在所有使用 `.split('|')[0]` 的地方统一替换为 `getFirstImage()`。

- [ ] **Step 3: Commit**

```bash
git add apps/frontend-user/src/lib/utils/image.ts apps/frontend-user/src/app/user-center/page.tsx
git commit -m "feat: add getFirstImage utility for cover_image multi-image handling"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** 侧边栏导航 ✅、4个主内容区块 ✅、用户统计API ✅、最近工具API ✅、收藏页面 ✅、实名认证奖励修复 ✅
- [ ] **Placeholder scan:** 无 TBD/TODO
- [x] **Type consistency:** UserStatsResponse 后端和 UserStats 前端类型一致；ToolRecentResponse 后端和 ToolRecentItem 前端类型一致
- [x] **cover_image 处理:** 所有地方统一使用 `.split('|')[0]` 模式，提取为公共函数
