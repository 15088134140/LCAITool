# 前端API字段清单

## 一、用户端前端 (frontend-user)

### 1. 认证接口

#### 登录请求 (Login - FormData)
- username (string)
- password (string)

#### 注册请求 (Register)
- phone (string)
- password (string)
- nickname? (string)
- code (string)

#### 发送验证码请求 (SendSmsCode)
- phone (string)

#### 登录响应 (AuthTokens)
- access_token (string)
- refresh_token (string)
- token_type (string)

#### 用户信息响应 (User)
- id (string)
- username (string)
- phone (string | null)
- email (string | null)
- nickname (string | null)
- avatar_url (string | null)
- is_active (boolean)
- is_admin (boolean)
- is_verified (boolean)
- id_card? (string)
- points (number)
- created_at (string)

### 2. 用户操作接口

#### 更新资料请求 (UpdateProfile)
- nickname? (string)
- email? (string)
- avatar_url? (string)

#### 修改密码请求 (ChangePassword)
- old_password (string)
- new_password (string)

#### 更换手机号请求 (ChangePhone)
- new_phone (string)
- code (string)

#### 实名认证请求 (VerifyIdentity)
- real_name (string)
- id_card (string)

#### 积分余额响应 (PointsBalance)
- [未定义具体类型，直接使用返回数据]

#### 积分流水响应 (PointsHistory)
- [未定义具体类型，直接使用返回数据]
  - page? (number)
  - page_size? (number)
  - type? (string)

### 3. API调用路径
- 登录: POST /auth/login
- 注册: POST /auth/register
- 发送验证码: POST /auth/send-code
- 获取当前用户: GET /users/me
- 更新资料: PATCH /users/me
- 修改密码: POST /users/change-password
- 更换手机号: POST /users/change-phone
- 实名认证: POST /users/verify
- 积分余额: GET /users/points/balance
- 积分流水: GET /users/points/history
- 登出: POST /auth/logout

### 4. 通用类型定义

#### Category (分类)
- id (string)
- name (string)
- icon (string)
- description (string)
- toolCount (number)
- sortOrder (number)

#### ToolPricing (工具定价)
- baseFee (number)
- resourceFees? (object)
  - image? (number)
  - audio? (number)
  - video? (number)
- example? (string)

#### Tool (工具)
- id (string)
- name (string)
- description (string)
- shortDescription (string)
- icon (string)
- categoryId (string)
- pricing (ToolPricing)
- avgRating (number)
- useCount (number)
- isNew (boolean)
- isFeatured (boolean)
- isHot (boolean)
- tags (string[])
- status ('active' | 'coming_soon' | 'maintenance')
- createdAt (string)
- heroImage? (string)

#### Review (评价)
- id (string)
- userId (string)
- userName (string)
- userAvatar? (string)
- rating (number)
- content (string)
- createdAt (string)
- toolId (string)

#### GetToolsParams (工具查询参数)
- categoryId? (string)
- search? (string)
- isFeatured? (boolean)
- isNew? (boolean)
- isHot? (boolean)
- page? (number)
- pageSize? (number)

#### PaginatedResult<T> (分页结果)
- items (T[])
- total (number)

---

## 二、管理端前端 (frontend-admin)

### 1. 认证接口

#### 登录请求 (LoginParams)
- username (string)
- password (string)
- rememberMe? (boolean)

#### 登录响应 (LoginResponse)
- user (object)
  - id (string)
  - username (string)
  - nickname (string)
  - avatar? (string)
  - role (string)
  - permissions (string[])
- token (string)

### 2. 用户管理接口

#### 用户类型 (User)
- id (string)
- avatar? (string)
- nickname (string)
- phone (string)
- idCardVerified (boolean)
- points (number)
- status ('active' | 'disabled')
- createdAt (string)

#### 用户列表查询参数 (UserListParams)
- page (number)
- pageSize (number)
- keyword? (string)
- status? (string)
- idCardVerified? (boolean)

#### 用户列表响应 (UserListResponse)
- list (User[])
- total (number)
- page (number)
- pageSize (number)

#### 创建用户请求 (CreateUserParams)
- nickname (string)
- phone (string)
- password (string)

#### 更新用户请求 (UpdateUserParams)
- id (string)
- nickname? (string)
- phone? (string)
- status? ('active' | 'disabled')

#### 调整积分请求 (AdjustPointsParams)
- userId (string)
- points (number)
- reason (string)
