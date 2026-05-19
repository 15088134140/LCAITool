# 后端API字段清单

## 基于 OpenAPI 文档 (http://localhost:8000/openapi.json)

### 1. 认证接口 (Auth)

#### 用户注册 - POST /api/v1/auth/register
**请求体 (UserCreate):**
- username (string, 必填, 3-50字符) - 用户名
- password (string, 必填, 6-100字符) - 密码
- email? (string, 邮箱格式, 最多100字符) - 邮箱

**响应 (User):**
- 参见下方 User 类型定义

#### 用户登录 - POST /api/v1/auth/login
**请求体 (FormData):**
- username (string, 必填)
- password (string, 必填)
- grant_type? (string, 必须为 "password")
- scope? (string, 默认空字符串)
- client_id? (string)
- client_secret? (string)

**响应 (Token):**
- access_token (string, 必填) - 访问令牌
- refresh_token (string, 必填) - 刷新令牌
- token_type (string, 默认 "bearer") - 令牌类型

#### 微信登录 - POST /api/v1/auth/wechat
**请求体 (WechatLoginRequest):**
- code (string, 必填) - 微信授权码

**响应 (Token):** 同上

#### 刷新令牌 - POST /api/v1/auth/refresh
**请求体 (RefreshTokenRequest):**
- refresh_token (string, 必填) - 刷新令牌

**响应 (Token):** 同上

#### 登出 - POST /api/v1/auth/logout
**响应:** 无特定数据结构

---

### 2. 用户接口 (Users)

#### 获取当前用户信息 - GET /api/v1/users/me
**响应 (User):**
- id (string, UUID, 必填)
- phone? (string, 最多20字符) - 手机号
- email? (string, 邮箱格式, 最多100字符) - 邮箱
- nickname? (string, 最多50字符) - 昵称
- avatar? (string, 最多255字符) - 头像URL
- id_card_verified (boolean, 必填) - 是否已实名认证
- balance (integer, 必填) - 积分余额
- status (integer, 必填) - 用户状态 (0=禁用, 1=启用)
- created_at (integer, 必填) - 创建时间戳
- updated_at (integer, 必填) - 更新时间戳

#### 更新当前用户信息 - PUT /api/v1/users/me
**请求体 (UserUpdate):**
- phone? (string, 最多20字符)
- email? (string, 邮箱格式, 最多100字符)
- nickname? (string, 最多50字符)
- avatar? (string, 最多255字符)

**响应 (User):** 同上

#### 实名认证 - POST /api/v1/users/verify-id
**请求体 (UserIdVerifyRequest):**
- real_name (string, 必填, 2-50字符) - 真实姓名
- id_card_number (string, 必填, 15-18字符) - 身份证号

**响应 (UserIdVerifyResponse):**
- id_card_verified (boolean, 必填) - 是否已实名认证
- real_name? (string) - 真实姓名（脱敏）
- id_card_number? (string) - 身份证号（脱敏）

#### 查询积分余额 - GET /api/v1/users/balance
**响应 (UserBalanceResponse):**
- balance (integer, 必填) - 积分余额

#### 积分流水 - GET /api/v1/users/transactions
**查询参数:**
- page? (integer, 默认 1)
- page_size? (integer, 默认 20)

**响应:** [未在OpenAPI中定义具体schema]

#### 修改密码 - POST /api/v1/users/change-password
**请求体 (ChangePasswordRequest):**
- old_password (string, 必填, 6-100字符) - 原密码
- new_password (string, 必填, 6-100字符) - 新密码

#### 发送手机验证码 - POST /api/v1/users/send-code
**请求体 (SendCodeRequest):**
- phone (string, 必填, 最多20字符) - 手机号

#### 更换手机号 - POST /api/v1/users/change-phone
**请求体 (ChangePhoneRequest):**
- phone (string, 必填, 最多20字符) - 新手机号
- code (string, 必填, 最多10字符) - 验证码

---

### 3. 管理后台接口 (Admin)

#### 用户列表 - GET /api/v1/admin/users
**查询参数:**
- page? (integer, 默认 1)
- page_size? (integer, 默认 20)
- search? (string) - 搜索关键词
- status? (integer) - 状态筛选

**响应:** [未在OpenAPI中定义具体schema]

#### 用户详情 - GET /api/v1/admin/users/{user_id}
**响应 (User):** 同上

#### 编辑用户信息 - PUT /api/v1/admin/users/{user_id}
**请求体 (UserUpdate):** 同上
**响应 (User):** 同上

#### 启用/禁用账号 - PUT /api/v1/admin/users/{user_id}/status
**查询参数:**
- status (integer, 必填) - 新状态

**响应 (User):** 同上

#### 调整积分 - POST /api/v1/admin/users/{user_id}/adjust-balance
**请求体 (AdjustBalanceRequest):**
- amount (integer, 必填) - 变更数量（正数增加，负数扣减）
- reason (string, 必填, 最多255字符) - 变更原因

**响应 (User):** 同上

#### 分配用户角色 - PUT /api/v1/admin/users/{user_id}/roles
**请求体 (UserRoleAssignRequest):**
- role_ids (string[], UUID, 必填) - 角色ID列表

**响应 (User):** 同上

#### 角色列表 - GET /api/v1/admin/roles
**查询参数:**
- page? (integer, 默认 1)
- page_size? (integer, 默认 100)

#### 创建角色 - POST /api/v1/admin/roles
**请求体 (RoleCreate):**
- name (string, 必填, 最多50字符) - 角色名称
- description? (string, 最多255字符) - 角色描述
- permissions? (string) - 权限列表(JSON)

**响应 (Role):**
- id (string, UUID, 必填)
- name (string, 必填, 最多50字符)
- description? (string, 最多255字符)
- permissions? (string)
- created_at (integer, 必填)
- updated_at (integer, 必填)

#### 编辑角色 - PUT /api/v1/admin/roles/{role_id}
**请求体 (RoleUpdate):** 同上 RoleCreate
**响应 (Role):** 同上

#### 删除角色 - DELETE /api/v1/admin/roles/{role_id}

---

### 4. 通用响应格式

#### Response<T> - 统一响应包装
- code (integer, 必填) - 状态码：200成功，400参数错误，401未授权，403权限不足，404不存在，500服务器错误
- message (string, 必填) - 消息
- data? (T) - 数据

#### PaginationParams - 分页参数
- page (integer, 默认 1) - 页码
- page_size (integer, 默认 20, 1-100) - 每页数量

#### PaginatedResponse<T> - 分页响应
- items (T[]) - 数据列表
- total (integer) - 总数
- page (integer) - 当前页
- page_size (integer) - 每页数量

---

### 5. 错误响应

#### HTTPValidationError
- detail (ValidationError[]) - 错误详情列表

#### ValidationError
- loc ((string | integer)[]) - 错误位置
- msg (string) - 错误消息
- type (string) - 错误类型
