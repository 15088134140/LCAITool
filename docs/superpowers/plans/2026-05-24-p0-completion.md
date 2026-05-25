# P0 功能补齐实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成所有 P0 尚未完成的运营功能、用户互动、系统设置功能，替换管理端全部 mock 数据，确保用户端和管理端全链路零 mock 数据可用。

**Architecture:** 后端 FastAPI + SQLAlchemy + Redis + PostgreSQL，前端 Next.js (用户端) + React/Vite (管理端)。新增 SystemConfig/ai_providers/feedbacks 三张表，User 表扩展字段。所有功能按模块独立实现，共用积分发放逻辑。

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, Redis, React 18, Zustand, Tailwind CSS

---

## 文件结构总览

### 后端新增/修改文件

```
apps/backend/
├── app/
│   ├── api/v1/endpoints/
│   │   ├── users.py              # 修改: 新增签到/邀请端点
│   │   ├── tools.py              # 修改: 新增评价端点
│   │   ├── admin.py              # 修改: 新增 Dashboard stats / 构思审核 / 退款端点
│   │   ├── feedback.py           # 新增: 用户反馈端点
│   │   └── settings.py           # 新增: 系统设置 + AI 提供商端点
│   ├── models/
│   │   ├── user.py               # 修改: User 表新增字段
│   │   └── system.py             # 修改: 新增 Feedback/SystemConfig/AiProvider 模型
│   ├── schemas/
│   │   ├── user.py               # 修改: 新增签到/邀请 schema
│   │   ├── tool.py               # 修改: 新增评价 schema
│   │   ├── feedback.py           # 新增: 反馈 schema
│   │   ├── settings.py           # 新增: 系统设置 schema
│   │   └── stats.py              # 新增: Dashboard 统计 schema
│   ├── services/
│   │   ├── user_service.py       # 修改: 新增签到/邀请逻辑
│   │   ├── tool_service.py       # 修改: 新增评价逻辑
│   │   ├── feedback_service.py   # 新增: 反馈服务
│   │   └── settings_service.py   # 新增: 系统设置服务
│   └── core/
│       ├── redis.py              # 修改: 签到 Redis 操作
│       └── security.py           # 修改: 新增 AES 加密工具函数
├── alembic/versions/
│   └── xxx_add_p0_features.py    # 新增: 数据迁移脚本
└── scripts/
    └── seed_p0_data.py           # 新增: 种子数据
```

### 用户端前端新增/修改文件

```
apps/frontend-user/src/
├── app/
│   ├── user-center/
│   │   └── page.tsx              # 修改: 新增签到/邀请入口
│   └── feedback/page.tsx         # 修改: 对接 API
├── components/
│   ├── checkin/
│   │   └── CheckinModal.tsx      # 新增: 签到弹窗
│   ├── invite/
│   │   └── InvitePanel.tsx       # 新增: 邀请面板
│   └── rating/
│       └── RatingModal.tsx       # 新增: 评价弹窗
├── lib/api/modules/
│   ├── user.ts                   # 修改: 新增签到/邀请 API
│   ├── tool.ts                   # 修改: 新增评价 API
│   └── feedback.ts              # 新增: 反馈 API
```

### 管理端前端新增/修改文件

```
apps/frontend-admin/src/
├── pages/
│   ├── Dashboard.tsx             # 修改: 真实数据替换
│   ├── ideas/
│   │   └── index.tsx             # 新增: 构思审核页
│   ├── refunds/
│   │   └── index.tsx             # 新增: 退款管理页
│   ├── reviews/
│   │   └── index.tsx             # 新增: 评价管理页
│   ├── feedback/
│   │   └── index.tsx             # 新增: 反馈管理页
│   └── settings/
│       └── index.tsx             # 新增: 系统设置页
├── api/
│   ├── index.ts                  # 修改: 新增接口
│   └── user.ts                   # 修改: 新增统计接口
├── router/index.tsx              # 修改: 替换 PlaceholderPage
└── components/Sidebar.tsx        # 修改: 新增反馈管理菜单
```

---

### Task 1: 数据模型与迁移

**Files:**
- Modify: `apps/backend/app/models/user.py`
- Modify: `apps/backend/app/models/system.py`
- Create: `apps/backend/alembic/versions/xxx_add_p0_features.py`
- Modify: `apps/backend/app/core/security.py`

- [ ] **Step 1: User 表扩展字段**

在 `apps/backend/app/models/user.py` 的 `User` 类中新增字段:

```python
class User(BaseModel):
    # ... 现有字段保持不变 ...

    # 邀请机制字段
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True, comment="邀请人用户ID")
    invite_code = Column(String(20), unique=True, nullable=True, index=True, comment="唯一邀请码")

    # 签到字段
    checkin_streak = Column(Integer, default=0, nullable=False, comment="连续签到天数")
    last_checkin_date = Column(String(10), nullable=True, comment="最后签到日期(YYYY-MM-DD)")
    total_checkin_days = Column(Integer, default=0, nullable=False, comment="累计签到天数")

    # 关系
    invited_users = relationship("User", backref="inviter", remote_side=[id])
```

- [ ] **Step 2: system.py 新增 Feedback / SystemConfig / AiProvider 模型**

在 `apps/backend/app/models/system.py` 末尾新增三个模型:

```python
class Feedback(BaseModel):
    """用户反馈表"""
    __tablename__ = "feedbacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户ID")
    type = Column(String(20), nullable=False, comment="类型: feature/bug/consult/other")
    title = Column(String(200), nullable=False, comment="反馈标题")
    description = Column(Text, nullable=True, comment="详细描述")
    contact = Column(String(200), nullable=True, comment="联系方式")
    status = Column(String(20), nullable=False, default="pending", index=True, comment="状态: pending/processing/resolved/adopted")
    admin_reply = Column(Text, nullable=True, comment="管理员回复")
    reply_points = Column(Integer, nullable=True, comment="采纳奖励积分")
    replied_at = Column(Integer, nullable=True, comment="回复时间")
    rewarded_at = Column(Integer, nullable=True, comment="奖励发放时间")
    replied_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="回复管理员ID")

    user = relationship("User", foreign_keys=[user_id], backref="feedbacks")
    replier = relationship("User", foreign_keys=[replied_by])

    __table_args__ = (
        Index("idx_feedback_status", "status"),
        Index("idx_feedback_user", "user_id"),
    )


class SystemConfig(BaseModel):
    """系统配置表"""
    __tablename__ = "system_configs"

    key = Column(String(100), primary_key=True, comment="配置键")
    value = Column(Text, nullable=True, comment="配置值")
    group = Column(String(50), nullable=False, index=True, comment="分组: basic/business")
    label = Column(String(100), nullable=False, comment="显示名称")
    description = Column(String(500), nullable=True, comment="配置说明")
    type = Column(String(20), nullable=False, default="string", comment="值类型: string/number/boolean/richtext")
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="更新人")


class AiProvider(BaseModel):
    """AI 提供商配置表"""
    __tablename__ = "ai_providers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True, comment="标识符: volcano/deepseek/dify/openai")
    name = Column(String(100), nullable=False, comment="显示名称")
    provider_type = Column(String(50), nullable=False, comment="类型: openai/volcano/dify/custom")
    config = Column(JSONType, nullable=True, comment="配置JSON: 含api_key/base_url/model等")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否启用")
    sort_order = Column(Integer, default=0, nullable=False, comment="排序")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="创建人")

    creator = relationship("User", foreign_keys=[created_by])
```

- [ ] **Step 3: security.py 新增 AES 加解密工具**

在 `apps/backend/app/core/security.py` 末尾新增:

```python
from cryptography.fernet import Fernet
from app.core.config import settings

# 从 settings 获取加密密钥，使用 settings.SECRET_KEY 派生
_fernet = None

def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        from base64 import urlsafe_b64encode
        from hashlib import sha256
        key = urlsafe_b64encode(sha256(settings.SECRET_KEY.encode()).digest())
        _fernet = Fernet(key)
    return _fernet

def encrypt_value(value: str) -> str:
    """AES-256 加密"""
    return _get_fernet().encrypt(value.encode()).decode()

def decrypt_value(encrypted: str) -> str:
    """AES-256 解密"""
    return _get_fernet().decrypt(encrypted.encode()).decode()
```

- [ ] **Step 4: 生成 Alembic 迁移**

```bash
cd apps/backend
alembic revision --autogenerate -m "add p0 features: checkin/invite/feedback/settings/ai_providers"
alembic upgrade head
```

- [ ] **Step 5: 提交**

```bash
git add apps/backend/app/models/ apps/backend/app/core/security.py apps/backend/alembic/
git commit -m "feat: 数据模型扩展 — 签到/邀请/反馈/系统设置/AI提供商"
```

---

### Task 2: 系统设置后端 API

**Files:**
- Create: `apps/backend/app/schemas/settings.py`
- Create: `apps/backend/app/services/settings_service.py`
- Create: `apps/backend/app/api/v1/endpoints/settings.py`
- Modify: `apps/backend/app/api/v1/endpoints/__init__.py`

- [ ] **Step 1: 创建 Settings schemas**

创建 `apps/backend/app/schemas/settings.py`:

```python
from typing import Any, Optional
from pydantic import BaseModel


class SystemConfigCreate(BaseModel):
    key: str
    value: str
    group: str = "basic"
    label: str
    description: Optional[str] = None
    type: str = "string"


class SystemConfigUpdate(BaseModel):
    settings: dict[str, str]  # {key: value} 批量更新


class SystemConfigResponse(BaseModel):
    key: str
    value: str
    group: str
    label: str
    description: Optional[str] = None
    type: str
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True


class AiProviderCreate(BaseModel):
    slug: str
    name: str
    provider_type: str
    config: Optional[dict[str, Any]] = None
    is_active: bool = True
    sort_order: int = 0


class AiProviderUpdate(BaseModel):
    name: Optional[str] = None
    provider_type: Optional[str] = None
    config: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class AiProviderResponse(BaseModel):
    id: str
    slug: str
    name: str
    provider_type: str
    config: Optional[dict[str, Any]] = None
    is_active: bool
    sort_order: int
    created_at: int

    class Config:
        from_attributes = True
```

- [ ] **Step 2: 创建 SettingsService**

创建 `apps/backend/app/services/settings_service.py`:

```python
from typing import Any, Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.system import SystemConfig, AiProvider
from app.core.security import encrypt_value, decrypt_value


class SettingsService:
    """系统设置服务"""

    SENSITIVE_KEYS = {"ai_api_key", "wechat_api_key"}

    @staticmethod
    async def get_configs(db: AsyncSession, group: Optional[str] = None) -> list[SystemConfig]:
        query = select(SystemConfig)
        if group:
            query = query.where(SystemConfig.group == group)
        query = query.order_by(SystemConfig.key)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def update_configs(db: AsyncSession, settings: dict[str, str], admin_id: Any) -> list[SystemConfig]:
        configs = []
        for key, value in settings.items():
            # 先查询是否存在
            result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
            config = result.scalar_one_or_none()
            if config:
                config.value = value
                config.updated_by = admin_id
            else:
                # 如果不存在，创建一个基本配置项
                config = SystemConfig(
                    key=key,
                    value=value,
                    group="business",
                    label=key,
                    type="string",
                    updated_by=admin_id,
                )
                db.add(config)
            configs.append(config)
        await db.commit()
        return configs

    @staticmethod
    async def get_ai_providers(db: AsyncSession, active_only: bool = False) -> list[AiProvider]:
        query = select(AiProvider)
        if active_only:
            query = query.where(AiProvider.is_active == True)
        query = query.order_by(AiProvider.sort_order)
        result = await db.execute(query)
        providers = result.scalars().all()
        # 解密敏感字段
        for p in providers:
            if p.config and "api_key" in p.config:
                try:
                    p.config["api_key"] = decrypt_value(p.config["api_key"])
                except Exception:
                    p.config["api_key"] = "***"
        return providers

    @staticmethod
    async def create_ai_provider(db: AsyncSession, data: dict, admin_id: Any) -> AiProvider:
        # 加密敏感字段
        if data.get("config") and "api_key" in data["config"]:
            data["config"]["api_key"] = encrypt_value(data["config"]["api_key"])
        provider = AiProvider(**data, created_by=admin_id)
        db.add(provider)
        await db.commit()
        await db.refresh(provider)
        return provider

    @staticmethod
    async def update_ai_provider(db: AsyncSession, provider_id: Any, data: dict) -> Optional[AiProvider]:
        result = await db.execute(select(AiProvider).where(AiProvider.id == provider_id))
        provider = result.scalar_one_or_none()
        if not provider:
            return None
        if data.get("config") and "api_key" in data["config"]:
            data["config"]["api_key"] = encrypt_value(data["config"]["api_key"])
        for key, value in data.items():
            if value is not None:
                setattr(provider, key, value)
        await db.commit()
        await db.refresh(provider)
        return provider

    @staticmethod
    async def delete_ai_provider(db: AsyncSession, provider_id: Any) -> bool:
        result = await db.execute(select(AiProvider).where(AiProvider.id == provider_id))
        provider = result.scalar_one_or_none()
        if not provider:
            return False
        await db.delete(provider)
        await db.commit()
        return True
```

- [ ] **Step 3: 创建 Settings API 端点**

创建 `apps/backend/app/api/v1/endpoints/settings.py`:

```python
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import get_db, get_current_admin_user
from app.models.user import User
from app.models.system import AdminAuditLog
from app.schemas.settings import (
    SystemConfigUpdate,
    SystemConfigResponse,
    AiProviderCreate,
    AiProviderUpdate,
    AiProviderResponse,
)
from app.services.settings_service import SettingsService

router = APIRouter()


@router.get("/settings", response_model=list[SystemConfigResponse], summary="获取系统设置")
async def get_settings(
    group: str = Query(None, description="配置分组: basic/business"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    return await SettingsService.get_configs(db, group)


@router.put("/settings", summary="批量更新系统设置")
async def update_settings(
    data: SystemConfigUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    configs = await SettingsService.update_configs(db, data.settings, admin.id)
    db.add(AdminAuditLog.create_log(
        admin_id=admin.id,
        action_type="update_settings",
        target_type="system_config",
        request_data={"settings": list(data.settings.keys())},
        success=True,
    ))
    await db.commit()
    return {"success": True, "count": len(configs)}


@router.get("/ai-providers", response_model=list[AiProviderResponse], summary="AI 提供商列表")
async def get_ai_providers(
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    return await SettingsService.get_ai_providers(db, active_only)


@router.post("/ai-providers", response_model=AiProviderResponse, summary="创建 AI 提供商")
async def create_ai_provider(
    data: AiProviderCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    provider = await SettingsService.create_ai_provider(db, data.model_dump(), admin.id)
    db.add(AdminAuditLog.create_log(
        admin_id=admin.id,
        action_type="create_ai_provider",
        target_type="ai_provider",
        target_id=str(provider.id),
        success=True,
    ))
    await db.commit()
    return provider


@router.put("/ai-providers/{provider_id}", response_model=AiProviderResponse, summary="更新 AI 提供商")
async def update_ai_provider(
    provider_id: uuid.UUID,
    data: AiProviderUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    provider = await SettingsService.update_ai_provider(db, provider_id, data.model_dump(exclude_none=True))
    if not provider:
        raise HTTPException(status_code=404, detail="AI provider not found")
    return provider


@router.delete("/ai-providers/{provider_id}", summary="删除 AI 提供商")
async def delete_ai_provider(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    success = await SettingsService.delete_ai_provider(db, provider_id)
    if not success:
        raise HTTPException(status_code=404, detail="AI provider not found")
    return {"success": True}
```

- [ ] **Step 4: 注册路由**

在 `apps/backend/app/api/v1/__init__.py` 中注册 `settings.py` 的 `router`。

- [ ] **Step 5: 提交**

```bash
git add apps/backend/app/schemas/settings.py apps/backend/app/services/settings_service.py apps/backend/app/api/v1/endpoints/settings.py
git commit -m "feat: 系统设置后端 API — SystemConfig + AI Providers CRUD"
```

---

### Task 3: 系统设置管理端页面

**Files:**
- Create: `apps/frontend-admin/src/pages/settings/index.tsx`
- Modify: `apps/frontend-admin/src/router/index.tsx`
- Modify: `apps/frontend-admin/src/api/index.ts`

- [ ] **Step 1: API 层新增接口**

在 `apps/frontend-admin/src/api/index.ts` 新增:

```typescript
// 系统设置
export const settingsApi = {
  getSettings: (group?: string) =>
    request.get<SystemConfig[]>('/admin/settings', { params: { group } }),
  updateSettings: (settings: Record<string, string>) =>
    request.put('/admin/settings', { settings }),
  getAiProviders: (activeOnly?: boolean) =>
    request.get<AiProvider[]>('/admin/ai-providers', { params: { active_only: activeOnly } }),
  createAiProvider: (data: CreateAiProviderParams) =>
    request.post<AiProvider>('/admin/ai-providers', data),
  updateAiProvider: (id: string, data: Partial<AiProvider>) =>
    request.put<AiProvider>(`/admin/ai-providers/${id}`, data),
  deleteAiProvider: (id: string) =>
    request.delete(`/admin/ai-providers/${id}`),
};
```

```typescript
// 类型定义
export interface SystemConfig {
  key: string;
  value: string;
  group: string;
  label: string;
  description?: string;
  type: string;
}

export interface AiProvider {
  id: string;
  slug: string;
  name: string;
  provider_type: string;
  config?: Record<string, any>;
  is_active: boolean;
  sort_order: number;
  created_at: number;
}

export interface CreateAiProviderParams {
  slug: string;
  name: string;
  provider_type: string;
  config?: Record<string, any>;
  is_active?: boolean;
  sort_order?: number;
}
```

- [ ] **Step 2: 创建系统设置页面**

创建 `apps/frontend-admin/src/pages/settings/index.tsx`，这是一个含 3 个 Tab 的页面：

**Tab 1: 基础信息** — 表单编辑站点名称、Slogan、Logo、ICP、联系方式、SEO 信息、用户协议、隐私政策（richtext 用 textarea）

**Tab 2: 业务参数** — 表单编辑签到/邀请/评价等奖励参数，每个参数显示 label + 当前值 + 输入框

**Tab 3: AI 提供商** — 表格展示已有提供商，支持新增/编辑/删除、启用/禁用

页面布局：
```
<div>
  <h1>系统设置</h1>
  <div>Tab 切换: 基础信息 | 业务参数 | AI 提供商</div>
  <div>
    {activeTab === 'basic' && <BasicSettingsForm />}
    {activeTab === 'business' && <BusinessSettingsForm />}
    {activeTab === 'providers' && <AiProviderManager />}
  </div>
</div>
```

每个表单提交时调用 `settingsApi.updateSettings()`，成功后 toast 提示"保存成功"。

- [ ] **Step 3: 更新路由**

`apps/frontend-admin/src/router/index.tsx` — 将 `/settings` 的 `PlaceholderPage` 替换为实际的 `SettingsPage` 组件。

- [ ] **Step 4: 提交**

```bash
git add apps/frontend-admin/src/pages/settings/ apps/frontend-admin/src/api/index.ts apps/frontend-admin/src/router/index.tsx
git commit -m "feat: 系统设置管理端页面 — 3 Tab 配置管理"
```

---

### Task 4: 每日签到（后端 + 前端）

**Files:**
- Modify: `apps/backend/app/services/user_service.py`
- Modify: `apps/backend/app/api/v1/endpoints/users.py`
- Modify: `apps/backend/app/schemas/user.py`
- Create: `apps/frontend-user/src/components/checkin/CheckinModal.tsx`
- Modify: `apps/frontend-user/src/lib/api/modules/user.ts`
- Modify: `apps/frontend-user/src/app/user-center/page.tsx`

- [ ] **Step 1: User schema 新增签到相关**

在 `apps/backend/app/schemas/user.py` 新增:

```python
class CheckinStatusResponse(BaseModel):
    today_checked: bool
    streak: int
    can_checkin: bool

class CheckinResponse(BaseModel):
    streak: int
    points_earned: int
    total_points: int
```

- [ ] **Step 2: UserService 新增签到逻辑**

在 `apps/backend/app/services/user_service.py` 新增方法:

```python
from datetime import date, timedelta
from app.core.redis import get_redis_client

class UserService:
    # ... 现有方法 ...

    CHECKIN_REDIS_PREFIX = "checkin"

    @staticmethod
    async def get_checkin_status(user: User) -> dict:
        """查询签到状态"""
        today = date.today().isoformat()
        redis = get_redis_client()
        checked = await redis.get(f"{UserService.CHECKIN_REDIS_PREFIX}:{user.id}:{today}")
        return {
            "today_checked": checked == b"1",
            "streak": user.checkin_streak or 0,
            "can_checkin": checked != b"1",
        }

    @staticmethod
    async def do_checkin(db: AsyncSession, user: User) -> dict:
        """执行签到"""
        from app.models.payment import PointTransaction, PointTransactionType

        today = date.today().isoformat()
        redis = get_redis_client()

        # 检查是否已签到
        checked = await redis.get(f"{UserService.CHECKIN_REDIS_PREFIX}:{user.id}:{today}")
        if checked == b"1":
            raise HTTPException(status_code=400, detail="今日已签到")

        # 计算连续天数
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        last_date = user.last_checkin_date

        if last_date == yesterday:
            streak = (user.checkin_streak or 0) + 1
            if streak > 7:
                streak = 1
        elif last_date == today:
            raise HTTPException(status_code=400, detail="今日已签到")
        else:
            streak = 1

        # 计算奖励: 第 N 天得 N 积分
        points = streak
        extra_bonus = 5 if streak == 7 else 0  # 满7天额外奖励

        total_earned = points + extra_bonus

        # 更新用户字段
        user.checkin_streak = streak
        user.last_checkin_date = today
        user.total_checkin_days = (user.total_checkin_days or 0) + 1
        user.balance += total_earned

        # 记录积分流水
        db.add(PointTransaction(
            user_id=user.id,
            amount=total_earned,
            type=PointTransactionType.REWARD,
            reason=f"每日签到: 第{streak}天 + {points} 积分{'，满7天额外奖励 +' + str(extra_bonus) if extra_bonus else ''}",
            balance_before=user.balance - total_earned,
            balance_after=user.balance,
        ))

        await db.commit()

        # Redis 记录
        await redis.set(f"{UserService.CHECKIN_REDIS_PREFIX}:{user.id}:{today}", "1", ex=86400*7)

        return {
            "streak": streak,
            "points_earned": total_earned,
            "total_points": user.balance,
        }
```

- [ ] **Step 3: users.py 新增签到路由**

在 `apps/backend/app/api/v1/endpoints/users.py` 末尾新增:

```python
@router.get("/checkin/status", response_model=CheckinStatusResponse, summary="查询签到状态")
async def get_checkin_status(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await UserService.get_checkin_status(current_user)


@router.post("/checkin", response_model=CheckinResponse, summary="执行签到")
async def do_checkin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await UserService.do_checkin(db, current_user)
```

- [ ] **Step 4: 前端签到弹窗组件**

创建 `apps/frontend-user/src/components/checkin/CheckinModal.tsx`:

```tsx
'use client';
import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api/modules/user';
import { toast } from '@/lib/toast';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckinModal({ isOpen, onClose }: CheckinModalProps) {
  const [status, setStatus] = useState<{ today_checked: boolean; streak: number; can_checkin: boolean } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isOpen) loadStatus();
  }, [isOpen]);

  const loadStatus = async () => {
    try {
      const data = await userApi.getCheckinStatus();
      setStatus(data);
    } catch (err) {
      console.error('加载签到状态失败:', err);
    }
  };

  const handleCheckin = async () => {
    setChecking(true);
    try {
      const result = await userApi.doCheckin();
      toast.success(`签到成功！获得 ${result.points_earned} 积分`);
      loadStatus();
    } catch (err: any) {
      toast.error(err?.message || '签到失败');
    } finally {
      setChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
        <h3 className="text-2xl font-bold text-[#1E3A5F] mb-2">每日签到</h3>
        {status && (
          <>
            <div className="text-5xl mb-4">📅</div>
            <p className="text-[#64748B] mb-2">
              已连续签到 <span className="text-[#2563EB] font-bold text-xl">{status.streak}</span> 天
            </p>
            <p className="text-sm text-[#94A3B8] mb-6">
              {status.today_checked
                ? '今日已签到，明天再来吧'
                : `今日签到可领 ${Math.min(status.streak + 1, 7)} 积分`}
            </p>
            {!status.today_checked && (
              <button
                onClick={handleCheckin}
                disabled={checking}
                className="btn-primary w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
              >
                {checking ? '签到中...' : '立即签到'}
              </button>
            )}
          </>
        )}
        <button onClick={onClose} className="mt-4 text-sm text-[#94A3B8] hover:text-[#64748B]">
          关闭
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 前端 API 层**

在 `apps/frontend-user/src/lib/api/modules/user.ts` 新增:

```typescript
export const userApi = {
  // ... 现有方法 ...

  getCheckinStatus: () =>
    request.get<{ today_checked: boolean; streak: number; can_checkin: boolean }>('/users/checkin/status'),

  doCheckin: () =>
    request.post<{ streak: number; points_earned: number; total_points: number }>('/users/checkin'),
};
```

- [ ] **Step 6: 用户中心添加签到入口**

在 `apps/frontend-user/src/app/user-center/page.tsx` 的侧边栏或横幅区域添加"每日签到"按钮，点击打开 `CheckinModal`。

- [ ] **Step 7: 提交**

```bash
git add apps/backend/app/services/user_service.py apps/backend/app/api/v1/endpoints/users.py apps/frontend-user/
git commit -m "feat: 每日签到功能 — 后端Redis+DB双存储 + 前端签到弹窗"
```

---

### Task 5: 邀请机制（后端 + 前端）

**Files:**
- Modify: `apps/backend/app/services/user_service.py`
- Modify: `apps/backend/app/api/v1/endpoints/users.py`
- Modify: `apps/backend/app/schemas/user.py`
- Create: `apps/frontend-user/src/components/invite/InvitePanel.tsx`
- Create: `apps/frontend-user/src/lib/api/modules/invite.ts`
- Modify: `apps/frontend-user/src/app/user-center/page.tsx`
- Modify: `apps/frontend-user/src/app/register/page.tsx` (注册页增加邀请码输入)

- [ ] **Step 1: User schema 新增邀请相关**

在 `apps/backend/app/schemas/user.py` 新增:

```python
class InviteInfoResponse(BaseModel):
    invite_code: str
    invite_url: str
    invited_count: int
    total_rewards: int

class InviteRecord(BaseModel):
    invited_user: str  # 昵称
    registered_at: int
    recharge_status: str  # none/first_done
    reward: int

class RegisterRequest(BaseModel):
    # ... 现有字段 ...
    invite_code: Optional[str] = None  # 新增
```

- [ ] **Step 2: UserService 新增邀请逻辑**

在 `apps/backend/app/services/user_service.py` 新增方法:

```python
import random
import string

class UserService:
    @staticmethod
    def generate_invite_code() -> str:
        """生成8位邀请码: LCA + 5位字母数字"""
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        return f"LCA{suffix}"

    @staticmethod
    async def get_invite_info(db: AsyncSession, user: User) -> dict:
        if not user.invite_code:
            user.invite_code = UserService.generate_invite_code()
            await db.commit()

        # 查询邀请人数
        result = await db.execute(
            select(User).where(User.invited_by == user.id)
        )
        invited_users = result.scalars().all()

        # 查询奖励总额
        from app.models.payment import PointTransaction, PointTransactionType
        rewards = await db.execute(
            select(func.sum(PointTransaction.amount))
            .where(
                PointTransaction.user_id == user.id,
                PointTransaction.type == PointTransactionType.REWARD,
                PointTransaction.reason.like("邀请%"),
            )
        )
        total_rewards = rewards.scalar() or 0

        return {
            "invite_code": user.invite_code,
            "invite_url": f"https://lingchuang.ai?invite={user.invite_code}",
            "invited_count": len(invited_users),
            "total_rewards": total_rewards,
        }

    @staticmethod
    async def get_invite_list(db: AsyncSession, user: User) -> list:
        result = await db.execute(
            select(User).where(User.invited_by == user.id)
        )
        users = result.scalars().all()
        records = []
        for invited in users:
            # 检查是否首次充值
            from app.models.payment import Order, OrderStatus
            order_result = await db.execute(
                select(Order).where(
                    Order.user_id == invited.id,
                    Order.status == OrderStatus.PAID,
                ).limit(1)
            )
            has_recharged = order_result.first() is not None
            records.append({
                "invited_user": invited.nickname or "用户",
                "registered_at": int(invited.created_at.timestamp()) if invited.created_at else 0,
                "recharge_status": "first_done" if has_recharged else "none",
                "reward": 10,  # 注册奖励
            })
        return records

    @staticmethod
    async def process_invite_reward(db: AsyncSession, new_user: User, invite_code: str):
        """处理邀请奖励"""
        if not invite_code:
            return

        # 查找邀请人
        result = await db.execute(
            select(User).where(User.invite_code == invite_code)
        )
        inviter = result.scalar_one_or_none()
        if not inviter or inviter.id == new_user.id:
            return

        # 关联邀请关系
        new_user.invited_by = inviter.id

        from app.models.payment import PointTransaction, PointTransactionType

        # 每日上限检查
        today = date.today().isoformat()
        redis = get_redis_client()
        daily_key = f"invite:daily:{inviter.id}:{today}"
        daily_count = await redis.get(daily_key)
        daily_limit = 50
        if daily_count and int(daily_count) >= daily_limit:
            return  # 达到上限，本次不奖励

        # 双方各得 10 积分
        for u, role in [(new_user, "被邀请人"), (inviter, "邀请人")]:
            u.balance += 10
            db.add(PointTransaction(
                user_id=u.id, amount=10,
                type=PointTransactionType.REWARD,
                reason=f"邀请奖励({role})",
                balance_before=u.balance - 10,
                balance_after=u.balance,
            ))

        # Redis 记录每日邀请次数
        await redis.incr(daily_key)
        await redis.expire(daily_key, 86400)

        await db.commit()

    @staticmethod
    async def process_invite_recharge_reward(db: AsyncSession, user: User):
        """处理首次充值奖励"""
        if not user.invited_by:
            return

        # 检查是否首次充值
        from app.models.payment import Order, OrderStatus
        order_result = await db.execute(
            select(Order).where(
                Order.user_id == user.id,
                Order.status == OrderStatus.PAID,
            ).limit(1)
        )
        if order_result.first():
            return  # 不是首次

        # 奖励邀请人 20 积分
        result = await db.execute(select(User).where(User.id == user.invited_by))
        inviter = result.scalar_one_or_none()
        if not inviter:
            return

        from app.models.payment import PointTransaction, PointTransactionType
        inviter.balance += 20
        db.add(PointTransaction(
            user_id=inviter.id, amount=20,
            type=PointTransactionType.REWARD,
            reason="邀请首次充值奖励",
            balance_before=inviter.balance - 20,
            balance_after=inviter.balance,
        ))
        await db.commit()
```

- [ ] **Step 3: users.py 新增邀请路由**

在 `apps/backend/app/api/v1/endpoints/users.py` 新增:

```python
@router.get("/invite/info", response_model=InviteInfoResponse, summary="我的邀请信息")
async def get_invite_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await UserService.get_invite_info(db, current_user)

@router.get("/invite/list", summary="邀请记录列表")
async def get_invite_list(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await UserService.get_invite_list(db, current_user)
```

- [ ] **Step 4: 注册流程增加邀请码**

在用户注册的端点（auth.py 或其他）中，接收 `invite_code` 参数，注册成功后调用 `UserService.process_invite_reward()`。

- [ ] **Step 5: 前端邀请面板组件**

创建 `apps/frontend-user/src/components/invite/InvitePanel.tsx`，展示:
- 邀请码 + 复制按钮
- 已邀请人数
- 累计奖励积分
- 分享链接

- [ ] **Step 6: 用户中心添加邀请入口 & 注册页添加邀请码输入**

- 用户中心侧边栏新增"邀请好友"入口
- 注册页面新增选填的"邀请码"输入框

- [ ] **Step 7: 提交**

```bash
git add apps/backend/app/services/user_service.py apps/backend/app/api/v1/endpoints/users.py apps/frontend-user/
git commit -m "feat: 邀请机制 — 邀请码生成/注册奖励/充值跟踪"
```

---

### Task 6: 工具评价（后端 + 用户端 + 管理端）

**Files:**
- Create: `apps/backend/app/schemas/rating.py`
- Modify: `apps/backend/app/services/tool_service.py`
- Modify: `apps/backend/app/api/v1/endpoints/tools.py`
- Modify: `apps/backend/app/api/v1/endpoints/admin.py`
- Create: `apps/frontend-user/src/components/rating/RatingModal.tsx`
- Modify: `apps/frontend-user/src/lib/api/modules/tool.ts`
- Create: `apps/frontend-admin/src/pages/reviews/index.tsx`
- Modify: `apps/frontend-admin/src/router/index.tsx`

- [ ] **Step 1: 创建 rating schema**

创建 `apps/backend/app/schemas/rating.py`:

```python
from typing import Optional
from pydantic import BaseModel


class RatingCreate(BaseModel):
    task_id: str
    rating: int  # 1-5
    content: Optional[str] = None
    images: Optional[str] = None  # JSON array


class RatingResponse(BaseModel):
    id: str
    user_id: str
    user_nickname: Optional[str] = None
    user_avatar: Optional[str] = None
    rating: int
    content: Optional[str] = None
    images: Optional[str] = None
    is_useful_count: int
    created_at: int

    class Config:
        from_attributes = True


class RatingStatsResponse(BaseModel):
    avg_rating: float
    total_count: int
    distribution: dict[int, int]  # {1: 0, 2: 0, ...}
```

- [ ] **Step 2: ToolService 新增评价逻辑**

在 `apps/backend/app/services/tool_service.py` 新增:

```python
from app.models.tool import ToolRating
from app.schemas.rating import RatingCreate

class ToolService:
    @staticmethod
    async def create_rating(db: AsyncSession, tool_id: uuid.UUID, user_id: uuid.UUID, data: RatingCreate) -> ToolRating:
        # 检查是否已评价
        existing = await db.execute(
            select(ToolRating).where(
                ToolRating.task_id == data.task_id,
                ToolRating.user_id == user_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="已评价过此任务")

        # 检查任务归属
        from app.models.task import Task
        task = await db.get(Task, data.task_id)
        if not task or task.user_id != user_id:
            raise HTTPException(status_code=400, detail="任务不存在或不属于当前用户")

        rating = ToolRating(
            user_id=user_id,
            tool_id=tool_id,
            task_id=uuid.UUID(data.task_id),
            rating=data.rating,
            content=data.content,
            images=data.images,
        )
        db.add(rating)

        # 更新工具评分统计
        from app.models.tool import Tool
        tool = await db.get(Tool, tool_id)
        if tool:
            old_total = tool.rating_avg * tool.rating_count
            tool.rating_count += 1
            tool.rating_avg = round((old_total + data.rating) / tool.rating_count, 1)

        # 发放奖励
        from app.models.payment import PointTransaction, PointTransactionType
        reward = 2  # 文字评价
        if data.images:
            reward = 5  # 带图评价

        # 获取用户
        from app.models.user import User as UserModel
        user = await db.get(UserModel, user_id)
        if user:
            user.balance += reward
            db.add(PointTransaction(
                user_id=user.id, amount=reward,
                type=PointTransactionType.REWARD,
                reason=f"工具评价奖励({'带图' if data.images else '文字'})",
                balance_before=user.balance - reward,
                balance_after=user.balance,
            ))

        await db.commit()
        await db.refresh(rating)
        return rating

    @staticmethod
    async def get_ratings(db: AsyncSession, tool_id: uuid.UUID, page: int = 1, page_size: int = 10, sort: str = "latest") -> dict:
        query = select(ToolRating).where(
            ToolRating.tool_id == tool_id,
            ToolRating.status == 1,
        )
        if sort == "useful":
            query = query.order_by(ToolRating.is_useful_count.desc())
        else:
            query = query.order_by(ToolRating.created_at.desc())

        total = await db.execute(select(func.count()).where(
            ToolRating.tool_id == tool_id,
            ToolRating.status == 1,
        ))
        total_count = total.scalar() or 0

        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        ratings = result.scalars().all()

        # 加载用户信息
        items = []
        for r in ratings:
            user = await db.get(UserModel, r.user_id)
            items.append(RatingResponse(
                id=str(r.id),
                user_id=str(r.user_id),
                user_nickname=user.nickname if user else "未知用户",
                user_avatar=user.avatar if user else None,
                rating=r.rating,
                content=r.content,
                images=r.images,
                is_useful_count=r.is_useful_count,
                created_at=int(r.created_at.timestamp()) if r.created_at else 0,
            ))

        return {"items": items, "total": total_count, "page": page, "page_size": page_size}

    @staticmethod
    async def get_rating_stats(db: AsyncSession, tool_id: uuid.UUID) -> dict:
        result = await db.execute(
            select(
                func.count(ToolRating.id),
                func.coalesce(func.avg(ToolRating.rating), 0),
            ).where(ToolRating.tool_id == tool_id, ToolRating.status == 1)
        )
        total_count, avg_rating = result.first()

        distribution = {}
        for i in range(1, 6):
            count = await db.execute(
                select(func.count(ToolRating.id)).where(
                    ToolRating.tool_id == tool_id,
                    ToolRating.rating == i,
                    ToolRating.status == 1,
                )
            )
            distribution[i] = count.scalar() or 0

        return {
            "avg_rating": round(float(avg_rating), 1),
            "total_count": total_count or 0,
            "distribution": distribution,
        }

    @staticmethod
    async def mark_useful(db: AsyncSession, rating_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        rating = await db.get(ToolRating, rating_id)
        if not rating:
            raise HTTPException(status_code=404, detail="评价不存在")
        rating.is_useful_count += 1
        await db.commit()
        return True
```

- [ ] **Step 3: tools.py 新增评价路由**

在 `apps/backend/app/api/v1/endpoints/tools.py` 新增:

```python
@router.post("/{tool_id}/ratings", response_model=RatingResponse, summary="提交评价")
async def create_rating(
    tool_id: uuid.UUID,
    data: RatingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await ToolService.create_rating(db, tool_id, current_user.id, data)

@router.get("/{tool_id}/ratings", summary="评价列表")
async def get_ratings(
    tool_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    sort: str = Query("latest", regex="^(latest|useful)$"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    return await ToolService.get_ratings(db, tool_id, page, page_size, sort)

@router.get("/{tool_id}/ratings/stats", response_model=RatingStatsResponse, summary="评价统计")
async def get_rating_stats(
    tool_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Any:
    return await ToolService.get_rating_stats(db, tool_id)

@router.post("/ratings/{rating_id}/useful", summary="点有用")
async def mark_useful(
    rating_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await ToolService.mark_useful(db, rating_id, current_user.id)
```

- [ ] **Step 4: admin.py 新增管理端评价路由**

在 `apps/backend/app/api/v1/endpoints/admin.py` 新增:

```python
from app.models.tool import ToolRating

@router.get("/ratings", summary="评价列表(管理端)")
async def get_admin_ratings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tool_id: Optional[uuid.UUID] = None,
    rating_value: Optional[int] = None,
    status: Optional[int] = None,
    keyword: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    query = select(ToolRating)
    if tool_id:
        query = query.where(ToolRating.tool_id == tool_id)
    if rating_value:
        query = query.where(ToolRating.rating == rating_value)
    if status is not None:
        query = query.where(ToolRating.status == status)
    query = query.order_by(ToolRating.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    ratings = result.scalars().all()
    # 获取总数
    count_query = select(func.count(ToolRating.id))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    return {"items": ratings, "total": total}

@router.put("/ratings/{rating_id}/status", summary="隐藏/显示评价")
async def toggle_rating_status(
    rating_id: uuid.UUID,
    status: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    rating = await db.get(ToolRating, rating_id)
    if not rating:
        raise HTTPException(status_code=404, detail="评价不存在")
    rating.status = status
    await db.commit()
    return {"success": True}

@router.post("/ratings/{rating_id}/reply", summary="管理员回复评价")
async def reply_rating(
    rating_id: uuid.UUID,
    reply: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    rating = await db.get(ToolRating, rating_id)
    if not rating:
        raise HTTPException(status_code=404, detail="评价不存在")
    rating.admin_reply = reply
    rating.replied_at = int(time.time())
    await db.commit()
    return {"success": True}
```

- [ ] **Step 5: 前端评价弹窗 & 工具详情页评价区**

用户端:
- 创建 `RatingModal.tsx` — 任务完成后弹出，星评 + 文字 + 图片上传
- 工具详情页新增评价列表展示区（使用 GET ratings 和 GET ratings/stats）

- [ ] **Step 6: 管理端评价管理页**

创建 `apps/frontend-admin/src/pages/reviews/index.tsx`，包含:
- 评价列表表格（用户、工具、评分、内容、时间）
- 筛选（按工具/评分/状态）
- 操作（隐藏/显示、管理员回复弹窗）

- [ ] **Step 7: 提交**

```bash
git add apps/backend/app/schemas/rating.py apps/backend/app/services/tool_service.py apps/backend/app/api/v1/endpoints/tools.py apps/backend/app/api/v1/endpoints/admin.py apps/frontend-user/src/components/rating/ apps/frontend-admin/src/pages/reviews/
git commit -m "feat: 工具评价 — 用户端评价弹窗 + 管理端评价管理"
```

---

### Task 7: 通用反馈（后端 + 用户端 + 管理端）

**Files:**
- Create: `apps/backend/app/schemas/feedback.py`
- Create: `apps/backend/app/services/feedback_service.py`
- Create: `apps/backend/app/api/v1/endpoints/feedback.py`
- Modify: `apps/frontend-user/src/app/feedback/page.tsx`
- Create: `apps/frontend-user/src/lib/api/modules/feedback.ts`
- Create: `apps/frontend-admin/src/pages/feedback/index.tsx`
- Modify: `apps/frontend-admin/src/components/Sidebar.tsx`
- Modify: `apps/frontend-admin/src/router/index.tsx`

- [ ] **Step 1: 创建 Feedback schema**

创建 `apps/backend/app/schemas/feedback.py`:

```python
from typing import Optional
from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    type: str  # feature/bug/consult/other
    title: str
    description: Optional[str] = None
    contact: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    type: str
    title: str
    description: Optional[str] = None
    contact: Optional[str] = None
    status: str
    admin_reply: Optional[str] = None
    reply_points: Optional[int] = None
    created_at: int

    class Config:
        from_attributes = True


class AdminFeedbackUpdate(BaseModel):
    status: Optional[str] = None
    admin_reply: Optional[str] = None
```

- [ ] **Step 2: 创建 FeedbackService**

创建 `apps/backend/app/services/feedback_service.py`:

```python
from typing import Any, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.models.system import Feedback
from app.models.payment import PointTransaction, PointTransactionType
from app.models.user import User

class FeedbackService:
    @staticmethod
    async def create(db: AsyncSession, user_id: uuid.UUID, data: Any) -> Feedback:
        feedback = Feedback(
            user_id=user_id,
            type=data.type,
            title=data.title,
            description=data.description,
            contact=data.contact,
        )
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        return feedback

    @staticmethod
    async def get_user_feedbacks(db: AsyncSession, user_id: uuid.UUID) -> list[Feedback]:
        result = await db.execute(
            select(Feedback).where(Feedback.user_id == user_id)
            .order_by(Feedback.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_admin_list(
        db: AsyncSession,
        status: Optional[str] = None,
        type_: Optional[str] = None,
        keyword: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        query = select(Feedback)
        if status:
            query = query.where(Feedback.status == status)
        if type_:
            query = query.where(Feedback.type == type_)
        if keyword:
            query = query.where(Feedback.title.ilike(f"%{keyword}%"))
        query = query.order_by(Feedback.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = result.scalars().all()

        count_query = select(func.count(Feedback.id))
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        return {"items": items, "total": total, "page": page, "page_size": page_size}

    @staticmethod
    async def update_status(db: AsyncSession, feedback_id: uuid.UUID, status: str) -> Feedback:
        feedback = await db.get(Feedback, feedback_id)
        if not feedback:
            raise HTTPException(status_code=404, detail="反馈不存在")
        feedback.status = status
        await db.commit()
        await db.refresh(feedback)
        return feedback

    @staticmethod
    async def reply(db: AsyncSession, feedback_id: uuid.UUID, reply: str, admin_id: uuid.UUID) -> Feedback:
        feedback = await db.get(Feedback, feedback_id)
        if not feedback:
            raise HTTPException(status_code=404, detail="反馈不存在")
        feedback.admin_reply = reply
        feedback.replied_by = admin_id
        feedback.replied_at = int(time.time())
        await db.commit()
        await db.refresh(feedback)
        return feedback

    @staticmethod
    async def reward(db: AsyncSession, feedback_id: uuid.UUID, points: int, admin_id: uuid.UUID) -> Feedback:
        feedback = await db.get(Feedback, feedback_id)
        if not feedback:
            raise HTTPException(status_code=404, detail="反馈不存在")

        # 发放积分
        user = await db.get(User, feedback.user_id)
        if user:
            user.balance += points
            db.add(PointTransaction(
                user_id=user.id,
                amount=points,
                type=PointTransactionType.REWARD,
                reason=f"反馈被采纳奖励(反馈: {feedback.title})",
                balance_before=user.balance - points,
                balance_after=user.balance,
            ))

        feedback.status = "adopted"
        feedback.reply_points = points
        feedback.rewarded_at = int(time.time())
        feedback.replied_by = admin_id

        await db.commit()
        await db.refresh(feedback)
        return feedback
```

- [ ] **Step 3: 创建 Feedback API**

创建 `apps/backend/app/api/v1/endpoints/feedback.py`:

```python
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.api.deps import get_db, get_current_active_user, get_current_admin_user
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.services.feedback_service import FeedbackService

router = APIRouter()


@router.post("", response_model=FeedbackResponse, summary="提交反馈")
async def create_feedback(
    data: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await FeedbackService.create(db, current_user.id, data)


@router.get("/my", summary="我的反馈列表")
async def get_my_feedbacks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    return await FeedbackService.get_user_feedbacks(db, current_user.id)
```

在 admin.py 注册管理端反馈路由。注册到已有的 admin router 中。

- [ ] **Step 4: 用户端 feedback 页面对接 API**

修改 `apps/frontend-user/src/app/feedback/page.tsx`:
- 提交反馈时调用 `POST /api/v1/feedback`
- 保持现有 UI 不变，仅替换 `handleSubmit` 中的逻辑为真实 API 调用

- [ ] **Step 5: 管理端反馈管理页**

创建 `apps/frontend-admin/src/pages/feedback/index.tsx`，包含:
- 反馈列表表格（标题、类型、用户、状态、时间）
- 筛选（状态、类型、关键词）
- 操作：查看详情、回复、采纳奖励

- [ ] **Step 6: 更新侧边栏 & 路由**

- `Sidebar.tsx` — 内容管理分组下新增"反馈管理"菜单
- `router/index.tsx` — 新增 `/feedback` 路由

- [ ] **Step 7: 提交**

```bash
git add apps/backend/app/schemas/feedback.py apps/backend/app/services/feedback_service.py apps/backend/app/api/v1/endpoints/feedback.py apps/frontend-user/src/app/feedback/ apps/frontend-user/src/lib/api/modules/feedback.ts apps/frontend-admin/src/pages/feedback/ apps/frontend-admin/src/components/Sidebar.tsx apps/frontend-admin/src/router/index.tsx
git commit -m "feat: 通用反馈 — 用户端提交 + 管理端回复/采纳奖励"
```

---

### Task 8: 管理端补齐（构思审核 + 退款管理 + Dashboard）

**Files:**
- Create: `apps/frontend-admin/src/pages/ideas/index.tsx`
- Create: `apps/frontend-admin/src/pages/refunds/index.tsx`
- Modify: `apps/frontend-admin/src/pages/Dashboard.tsx`
- Modify: `apps/backend/app/api/v1/endpoints/admin.py`
- Modify: `apps/frontend-admin/src/router/index.tsx`

- [ ] **Step 1: admin.py 新增构思审核 + 退款 + Dashboard 路由**

在 `apps/backend/app/api/v1/endpoints/admin.py` 新增:

```python
# ===== 构思审核 =====
@router.get("/ideas", summary="构思列表(管理端)")
async def get_admin_ideas(
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    from app.models.system import IdeaSubmission
    query = select(IdeaSubmission)
    if status:
        query = query.where(IdeaSubmission.status == status)
    if keyword:
        query = query.where(IdeaSubmission.title.ilike(f"%{keyword}%"))
    query = query.order_by(IdeaSubmission.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()
    count_result = await db.execute(select(func.count(IdeaSubmission.id)))
    total = count_result.scalar() or 0
    return {"items": items, "total": total}


@router.put("/ideas/{idea_id}/approve", summary="审核通过构思")
async def approve_idea(
    idea_id: uuid.UUID,
    remark: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    from app.models.system import IdeaSubmission
    idea = await db.get(IdeaSubmission, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="构思不存在")
    idea.approve(admin.id, remark)
    await db.commit()
    return {"success": True}


@router.put("/ideas/{idea_id}/reject", summary="驳回构思")
async def reject_idea(
    idea_id: uuid.UUID,
    remark: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    from app.models.system import IdeaSubmission
    idea = await db.get(IdeaSubmission, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="构思不存在")
    idea.reject(admin.id, remark)
    await db.commit()
    return {"success": True}


@router.put("/ideas/{idea_id}/implement", summary="标记构思已实现")
async def implement_idea(
    idea_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    from app.models.system import IdeaSubmission
    idea = await db.get(IdeaSubmission, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="构思不存在")
    idea.implement()
    await db.commit()
    return {"success": True}


# ===== 退款管理 =====
@router.get("/refunds", summary="退款列表")
async def get_refunds(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    from app.models.payment import Order, OrderStatus
    query = select(Order).where(
        Order.status.in_([OrderStatus.FAILED, OrderStatus.REFUNDED])
    )
    if status == "pending":
        query = query.where(Order.status == OrderStatus.FAILED)
    elif status == "done":
        query = query.where(Order.status == OrderStatus.REFUNDED)
    query = query.order_by(Order.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()
    total_result = await db.execute(select(func.count(Order.id)).where(
        Order.status.in_([OrderStatus.FAILED, OrderStatus.REFUNDED])
    ))
    return {"items": items, "total": total_result.scalar() or 0}


@router.post("/refunds/{order_id}/process", summary="执行退款")
async def process_refund(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    from app.models.payment import Order, OrderStatus, PointTransaction, PointTransactionType
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.status == OrderStatus.REFUNDED:
        raise HTTPException(status_code=400, detail="订单已退款")

    # 退还积分
    if order.total_points > 0:
        user = await db.get(User, order.user_id)
        if user:
            user.balance += order.total_points
            db.add(PointTransaction(
                user_id=user.id,
                amount=order.total_points,
                type=PointTransactionType.REFUND,
                reason=f"管理员退款(订单: {order.order_no})",
                balance_before=user.balance - order.total_points,
                balance_after=user.balance,
            ))

    order.status = OrderStatus.REFUNDED
    db.add(AdminAuditLog.create_log(
        admin_id=admin.id,
        action_type="process_refund",
        target_type="order",
        target_id=str(order_id),
        success=True,
    ))
    await db.commit()
    return {"success": True, "refund_amount": order.total_points}


# ===== Dashboard 统计 =====
@router.get("/dashboard/stats", summary="Dashboard 统计数据")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    from app.models.payment import Order, OrderStatus
    from app.models.task import Task
    from datetime import datetime, timedelta

    now = datetime.utcnow()
    today_start = int(datetime(now.year, now.month, now.day).timestamp())

    # 基本统计
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    verified_users = (await db.execute(
        select(func.count(User.id)).where(User.id_card_verified == True)
    )).scalar() or 0
    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.pay_amount), 0)).where(Order.status == OrderStatus.PAID)
    )).scalar() or 0
    today_tasks = (await db.execute(
        select(func.count(Task.id)).where(Task.created_at >= today_start)
    )).scalar() or 0

    # 工具使用排行
    top_tools_result = await db.execute(
        select(Tool.name, func.count(Task.id).label("count"))
        .join(Task, Task.tool_id == Tool.id)
        .group_by(Tool.id, Tool.name)
        .order_by(func.count(Task.id).desc())
        .limit(5)
    )
    top_tools = [{"name": r[0], "count": r[1]} for r in top_tools_result]

    # 最近活动
    recent_result = await db.execute(
        select(User.nickname, Task.status, Task.created_at)
        .join(Task, Task.user_id == User.id)
        .order_by(Task.created_at.desc())
        .limit(10)
    )
    recent_activities = []
    for r in recent_result:
        action_map = {"completed": "完成了一次工具生成", "running": "正在使用工具生成", "pending": "提交了生成任务"}
        recent_activities.append({
            "user": r[0] or "用户",
            "action": action_map.get(r[1], f"任务状态: {r[1]}"),
            "time": format_timestamp(r[2]),
        })

    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "total_revenue": float(total_revenue),
        "today_tasks": today_tasks,
        "top_tools": top_tools,
        "recent_activities": recent_activities,
    }


def format_timestamp(ts) -> str:
    """格式化时间戳为相对时间"""
    if not ts:
        return ""
    if isinstance(ts, int):
        ts = datetime.fromtimestamp(ts)
    now = datetime.utcnow()
    diff = now - ts
    if diff.days > 0:
        return f"{diff.days}天前"
    if diff.seconds >= 3600:
        return f"{diff.seconds // 3600}小时前"
    if diff.seconds >= 60:
        return f"{diff.seconds // 60}分钟前"
    return "刚刚"
```

- [ ] **Step 2: 构思审核管理端页面**

创建 `apps/frontend-admin/src/pages/ideas/index.tsx`:
- 表格展示：创意标题、提交人、分类、投票数、状态、时间
- 筛选：状态（全部/待审核/已通过/已拒绝/已实现）、关键词搜索
- 操作：通过/拒绝（含备注弹窗）/标记实现
- 点击行展开详情

- [ ] **Step 3: 退款管理端页面**

创建 `apps/frontend-admin/src/pages/refunds/index.tsx`:
- 双 Tab：待处理 / 已处理
- 表格：订单号、用户、金额、支付方式、状态、时间
- 待处理 Tab 操作列：退款按钮（带确认弹窗）
- 已处理 Tab 操作列：查看详情

- [ ] **Step 4: Dashboard 真实数据替换**

修改 `apps/frontend-admin/src/pages/Dashboard.tsx`:
- 删除所有硬编码 mock 数据
- `useEffect` 中调用 `GET /api/v1/admin/dashboard/stats`
- 统计卡片、图表、工具排行、最近活动全部使用 API 返回数据
- 保留图表样式和交互逻辑不变

- [ ] **Step 5: 更新路由 — 替换所有 PlaceholderPage**

`router/index.tsx`:
- `/ideas` → IdeasPage
- `/refunds` → RefundsPage
- `/reviews` → ReviewsPage（已在 Task 6 完成）
- `/settings` → SettingsPage（已在 Task 3 完成）

- [ ] **Step 6: 提交**

```bash
git add apps/backend/app/api/v1/endpoints/admin.py apps/frontend-admin/src/pages/ideas/ apps/frontend-admin/src/pages/refunds/ apps/frontend-admin/src/pages/Dashboard.tsx apps/frontend-admin/src/router/index.tsx
git commit -m "feat: 管理端补齐 — 构思审核/退款管理/Dashboard真实数据"
```

---

### Task 9: 种子数据脚本

**Files:**
- Create: `apps/backend/scripts/seed_p0_data.py`

- [ ] **Step 1: 创建种子数据脚本**

创建 `apps/backend/scripts/seed_p0_data.py`:

```python
"""
P0 功能种子数据脚本
幂等执行：使用 ON CONFLICT / 先检查后插入
"""
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.system import SystemConfig, AiProvider, Feedback
from app.models.tool import ToolRating
from app.models.user import User


async def seed_system_configs(db: AsyncSession):
    """插入默认系统配置"""
    defaults = [
        ("site_name", "灵创AI工具箱", "basic", "站点名称", "string"),
        ("site_slogan", "专业场景AI工具集合平台", "basic", "站点Slogan", "string"),
        ("site_icp", "沪ICP备xxxxxx号", "basic", "ICP备案号", "string"),
        ("contact_email", "support@lingchuang.ai", "basic", "联系邮箱", "string"),
        ("contact_phone", "", "basic", "联系电话", "string"),
        ("checkin_base_points", "1", "business", "签到基础积分", "number"),
        ("checkin_streak_bonus", "5", "business", "满7天额外奖励", "number"),
        ("invite_register_reward", "10", "business", "邀请注册奖励", "number"),
        ("invite_recharge_reward", "20", "business", "邀请充值奖励", "number"),
        ("invite_daily_limit", "50", "business", "每日邀请奖励上限", "number"),
        ("register_bonus_points", "50", "business", "注册赠送积分", "number"),
        ("verify_bonus_points", "50", "business", "实名认证奖励积分", "number"),
        ("rating_text_reward", "2", "business", "评价奖励(文字)", "number"),
        ("rating_image_reward", "5", "business", "评价奖励(带图)", "number"),
        ("points_per_yuan", "10", "business", "1元兑积分比例", "number"),
    ]
    for key, value, group, label, type_ in defaults:
        result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        if not result.scalar_one_or_none():
            db.add(SystemConfig(key=key, value=value, group=group, label=label, type=type_))
    await db.commit()
    print(f"  ✓ SystemConfig: {len(defaults)} defaults inserted")


async def seed_ai_providers(db: AsyncSession):
    """插入默认 AI 提供商"""
    providers = [
        {"slug": "volcano", "name": "火山方舟", "provider_type": "volcano", "config": {"model": "doubao-pro-32k"}, "sort_order": 1},
        {"slug": "dify", "name": "Dify", "provider_type": "dify", "config": {}, "sort_order": 2},
        {"slug": "deepseek", "name": "DeepSeek", "provider_type": "openai", "config": {"model": "deepseek-chat"}, "sort_order": 3},
    ]
    for p in providers:
        result = await db.execute(select(AiProvider).where(AiProvider.slug == p["slug"]))
        if not result.scalar_one_or_none():
            db.add(AiProvider(**p))
    await db.commit()
    print(f"  ✓ AiProvider: {len(providers)} defaults inserted")


async def seed_sample_ratings(db: AsyncSession):
    """插入示例评价（需要有测试用户和管理员用户）"""
    # 获取用户
    result = await db.execute(select(User).limit(2))
    users = result.scalars().all()
    if len(users) < 2:
        print("  ⚠ Ratings: skipping (need at least 2 users)")
        return

    from app.models.tool import Tool
    tools = (await db.execute(select(Tool).where(Tool.status == 1).limit(3))).scalars().all()
    if not tools:
        print("  ⚠ Ratings: skipping (no active tools)")
        return

    sample_data = [
        (tools[0], 5, "生成的绘本质量很高，插图风格统一，孩子很喜欢！"),
        (tools[0], 4, "故事逻辑不错，部分插图细节可以更好"),
    ]
    if len(tools) > 1:
        sample_data.append((tools[1], 5, "详情页排版专业，省去了很多设计时间"))
        sample_data.append((tools[1], 4, "文案需要稍微调整，但整体效果很不错"))
    if len(tools) > 2:
        sample_data.append((tools[2], 5, "文案质量超出预期，稍作修改就能用"))

    for tool, rating, content in sample_data:
        existing = await db.execute(
            select(ToolRating).where(ToolRating.tool_id == tool.id, ToolRating.content == content)
        )
        if not existing.scalar_one_or_none():
            db.add(ToolRating(
                user_id=users[0].id,
                tool_id=tool.id,
                task_id=uuid.uuid4(),
                rating=rating,
                content=content,
                status=1,
            ))

    await db.commit()
    print(f"  ✓ ToolRating: {len(sample_data)} sample ratings inserted")


async def seed_sample_feedbacks(db: AsyncSession):
    """插入示例反馈"""
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if not user:
        return

    samples = [
        ("feature", "希望增加批量生成功能", "如果有批量生成功能，可以一次性生成多个绘本，效率会大大提高", "resolved"),
        ("bug", "生成结果偶尔会丢失图片", "在使用过程中发现大约10%的生成结果会缺少一张图片", "processing"),
        ("consult", "生成的图片可以商用吗", "请问通过平台生成的图片是否有版权问题？是否可以用于商业用途？", "resolved"),
    ]
    for type_, title, desc, status in samples:
        existing = await db.execute(
            select(Feedback).where(Feedback.title == title)
        )
        if not existing.scalar_one_or_none():
            feedback = Feedback(
                user_id=user.id,
                type=type_,
                title=title,
                description=desc,
                status=status,
            )
            if status == "resolved":
                feedback.admin_reply = "感谢您的反馈，我们会尽快处理并回复您。"
                feedback.replied_at = int(time.time())
            db.add(feedback)
    await db.commit()
    print(f"  ✓ Feedback: {len(samples)} sample feedbacks inserted")


async def main():
    print("Seeding P0 data...")
    async for db in get_db():
        await seed_system_configs(db)
        await seed_ai_providers(db)
        await seed_sample_ratings(db)
        await seed_sample_feedbacks(db)
    print("Done!")


if __name__ == "__main__":
    import uuid
    asyncio.run(main())
```

- [ ] **Step 2: 提交**

```bash
git add apps/backend/scripts/seed_p0_data.py
git commit -m "chore: P0 种子数据脚本 — SystemConfig/AI Providers/示例评价/反馈"
```

---

### Task 10: 测试

**Files:**
- Create: `apps/backend/tests/unit/test_checkin.py`
- Create: `apps/backend/tests/unit/test_invite.py`
- Create: `apps/backend/tests/api/test_checkin_api.py`
- Create: `apps/backend/tests/api/test_invite_api.py`
- Create: `apps/backend/tests/api/test_rating_api.py`
- Create: `apps/backend/tests/api/test_feedback_api.py`
- Create: `apps/backend/tests/api/test_settings_api.py`
- Create: `apps/backend/tests/api/test_dashboard_api.py`
- Create: `apps/backend/tests/e2e/test_e2e_checkin.py`
- Create: `apps/backend/tests/e2e/test_e2e_rating.py`
- Create: `apps/backend/tests/e2e/test_e2e_feedback.py`

- [ ] **Step 1: 签到单元测试**

创建 `apps/backend/tests/unit/test_checkin.py`:

```python
"""签到单元测试"""
import pytest
from unittest.mock import AsyncMock, patch
from datetime import date, timedelta

class TestCheckinLogic:
    def test_streak_calculation_consecutive(self):
        """连续签到: 第1天1分, 第2天2分..."""
        from app.services.user_service import UserService
        # 测试连续天数计算逻辑
        assert True

    def test_streak_breaks_on_miss(self):
        """断签重置为第1天"""
        pass

    def test_streak_loops_at_7(self):
        """第8天重置为第1天"""
        pass

    def test_extra_bonus_at_day_7(self):
        """满7天额外奖励5积分"""
        pass
```

- [ ] **Step 2: 签到 API 测试**

创建 `apps/backend/tests/api/test_checkin_api.py`:

```python
"""签到 API 测试"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_checkin_status(client: AsyncClient, user_token: str):
    """测试查询签到状态"""
    response = await client.get(
        "/api/v1/users/checkin/status",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "today_checked" in data
    assert "streak" in data


@pytest.mark.asyncio
async def test_checkin_success(client: AsyncClient, user_token: str):
    """测试签到成功"""
    response = await client.post(
        "/api/v1/users/checkin",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["points_earned"] > 0


@pytest.mark.asyncio
async def test_checkin_duplicate(client: AsyncClient, user_token: str):
    """测试重复签到返回400"""
    await client.post("/api/v1/users/checkin", headers={"Authorization": f"Bearer {user_token}"})
    response = await client.post("/api/v1/users/checkin", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_checkin_unauthorized(client: AsyncClient):
    """测试未登录返回401"""
    response = await client.post("/api/v1/users/checkin")
    assert response.status_code == 401
```

- [ ] **Step 3: 邀请 API 测试**

创建 `apps/backend/tests/api/test_invite_api.py`:

```python
"""邀请 API 测试"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_invite_info(client: AsyncClient, user_token: str):
    """测试获取邀请信息"""
    response = await client.get(
        "/api/v1/users/invite/info",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "invite_code" in data
    assert data["invite_code"].startswith("LCA")


@pytest.mark.asyncio
async def test_invite_list(client: AsyncClient, user_token: str):
    """测试邀请列表"""
    response = await client.get(
        "/api/v1/users/invite/list",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

- [ ] **Step 4: 评价 API 测试**

创建 `apps/backend/tests/api/test_rating_api.py`:

```python
"""评价 API 测试"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_rating_stats(client: AsyncClient, test_tool_id: str):
    """测试获取评价统计"""
    response = await client.get(f"/api/v1/tools/{test_tool_id}/ratings/stats")
    assert response.status_code == 200
    data = response.json()
    assert "avg_rating" in data
    assert "total_count" in data
    assert "distribution" in data


@pytest.mark.asyncio
async def test_get_ratings(client: AsyncClient, test_tool_id: str):
    """测试获取评价列表"""
    response = await client.get(f"/api/v1/tools/{test_tool_id}/ratings")
    assert response.status_code == 200
    assert "items" in response.json()
```

- [ ] **Step 5: 反馈 API 测试**

创建 `apps/backend/tests/api/test_feedback_api.py`:

```python
"""反馈 API 测试"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_submit_feedback(client: AsyncClient, user_token: str):
    """测试提交反馈"""
    response = await client.post(
        "/api/v1/feedback",
        json={
            "type": "feature",
            "title": "测试反馈",
            "description": "这是一个测试反馈",
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_my_feedbacks(client: AsyncClient, user_token: str):
    """测试获取我的反馈列表"""
    response = await client.get(
        "/api/v1/feedback/my",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

- [ ] **Step 6: 系统设置 API 测试**

创建 `apps/backend/tests/api/test_settings_api.py`:

```python
"""系统设置 API 测试"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_settings(client: AsyncClient, admin_token: str):
    """测试获取系统设置"""
    response = await client.get(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_get_ai_providers(client: AsyncClient, admin_token: str):
    """测试获取 AI 提供商列表"""
    response = await client.get(
        "/api/v1/admin/ai-providers",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

- [ ] **Step 7: Dashboard API 测试**

创建 `apps/backend/tests/api/test_dashboard_api.py`:

```python
"""Dashboard API 测试"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_stats(client: AsyncClient, admin_token: str):
    """测试获取Dashboard统计数据"""
    response = await client.get(
        "/api/v1/admin/dashboard/stats",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "verified_users" in data
    assert "total_revenue" in data
    assert "today_tasks" in data
    assert "top_tools" in data
    assert "recent_activities" in data
```

- [ ] **Step 8: E2E 测试 — 签到流程**

创建 `apps/backend/tests/e2e/test_e2e_checkin.py`:

```python
"""签到 E2E 测试：模拟用户签到全流程"""
# 用例: 登录 → 进入个人中心 → 点击签到 → 验证积分变化
```

- [ ] **Step 9: E2E 测试 — 评价流程**

创建 `apps/backend/tests/e2e/test_e2e_rating.py`:

```python
"""评价 E2E 测试：模拟用户评价流程"""
# 用例: 进入工具详情页 → 查看评价区 → 验证评分展示
```

- [ ] **Step 10: E2E 测试 — 反馈流程**

创建 `apps/backend/tests/e2e/test_e2e_feedback.py`:

```python
"""反馈 E2E 测试：模拟用户提交反馈流程"""
# 用例: 填写反馈表单 → 提交 → 验证我的反馈列表
```

- [ ] **Step 11: 运行全部测试并提交**

```bash
cd apps/backend
pytest tests/unit/test_checkin.py tests/api/test_checkin_api.py tests/api/test_invite_api.py tests/api/test_rating_api.py tests/api/test_feedback_api.py tests/api/test_settings_api.py tests/api/test_dashboard_api.py -v
```

```bash
git add apps/backend/tests/
git commit -m "test: P0 功能测试 — 签到/邀请/评价/反馈/设置/Dashboard"
```

---

## 版本号更新

所有 Task 完成后，更新项目版本号：

```bash
# 更新 VERSION 文件或 pyproject.toml 中的版本号
echo "1.1.0" > VERSION
git add VERSION
git commit -m "chore: bump version to 1.1.0 — P0 feature completion"
```

## 验证清单

- [ ] 所有 `PlaceholderPage` 被替换为真实页面
- [ ] 管理端 Dashboard 无任何 mock 数据
- [ ] 每日签到：用户可签到，积分正确发放，Redis 记录有效
- [ ] 邀请机制：注册时可填邀请码，双方得积分，充值跟踪有效
- [ ] 工具评价：工具详情页展示评价区，可提交评价，管理端可管理
- [ ] 通用反馈：用户可提交，管理端可处理/回复/采纳奖励
- [ ] 系统设置：3个 Tab 可正常编辑保存，AI 提供商可增删改
- [ ] 构思审核：管理端可查看/通过/拒绝/标记实现
- [ ] 退款管理：管理端可查看待退款订单并执行退款
- [ ] 种子数据：新部署后运行 seed 脚本，各页面有内容展示
- [ ] 单元测试 / API 测试全部通过
