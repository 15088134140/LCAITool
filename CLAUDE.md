# 灵创AI工具箱（LCAITool）- 项目开发规范

## 📋 项目概述

**灵创AI工具箱** 是专注于垂直专业场景的精品AI工具集合平台，深耕细分场景，做深做透每一个工具，让用户在特定场景下获得开箱即用的专业级效果。

**使用中文回复我的问题**

### 核心差异化优势
- ✅ **场景化**：针对具体场景深度优化，不是通用大模型的简单封装
- ✅ **专业化**：每个工具都经过专业人员调试，输出质量达到商用标准
- ✅ **可交付**：提供完整可下载的成果包，不只是在线预览
- ✅ **可迭代**：支持基于历史成果持续优化，形成个人创作资产
- ✅ **透明化**：按次按量计费，费用清晰可见，无订阅负担

---

## 🛠 技术栈规范

### 前端技术栈
| 层级 | 技术选型 | 版本要求 |
|------|---------|---------|
| **用户端前端** | Next.js 14+ (App Router) | 14.x |
| **管理端前端** | React + Vite | 18.x / 5.x |
| **UI框架** | Tailwind CSS + shadcn/ui | 3.x |
| **状态管理** | Zustand | 4.x |

### 后端技术栈
| 层级 | 技术选型 | 版本要求 |
|------|---------|---------|
| **后端框架** | FastAPI | 0.100+ |
| **数据库** | PostgreSQL | 16.x |
| **缓存/队列** | Redis | 7.x |
| **ORM** | SQLAlchemy + Alembic | 2.x |
| **异步任务** | Celery | 5.x |

### 部署
- Docker + Docker Compose 容器化部署
- Nginx 反向代理

---

## 🎨 设计系统规范

### 色彩系统
| 用途 | 色值 | 说明 |
|------|------|------|
| **主色调** | `#1E3A5F` | 深蓝色 - 品牌主色 |
| **主色调渐变** | `#2563EB` | 蓝色 - 强调、渐变 |
| **强调色** | `#059669` → `#10B981` | 绿色渐变 - 主按钮、成功状态 |
| **边框色** | `#E4E7EB` | 浅灰 - 卡片边框 |
| **背景色** | `#F8FAFC` | 极浅蓝 - 悬浮背景 |
| **文字色** | `#1F2937` | 深灰 - 主文字 |

### 字体规范
- **首选字体**：`DM Sans`
- **备用字体**：`system-ui, -apple-system, sans-serif`
- **字体粗细**：400（常规）、500（中等）、700（粗体）

### 组件交互规范
```css
/* 卡片悬停效果 */
.card-hover {
    transition: all 0.25s ease-out;
}
.card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(30, 58, 95, 0.12);
}

/* 主按钮 */
.btn-primary {
    background: linear-gradient(135deg, #059669 0%, #10B981 100%);
}
.btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 25px rgba(5, 150, 105, 0.3);
}

/* 进度条 */
.progress-fill {
    background: linear-gradient(90deg, #059669, #10B981);
}
```

---

## 📁 目录结构规范

```
LCAiTool/
├── frontend-user/              # 用户端前端 (Next.js)
│   ├── src/app/                # App Router 页面
│   ├── src/components/ui/      # shadcn/ui 组件
│   ├── src/components/common/  # 业务组件
│   ├── src/lib/                # API客户端、工具函数
│   ├── src/store/              # Zustand 状态管理
│   └── src/styles/             # 全局样式
│
├── frontend-admin/             # 管理端前端 (React + Vite)
│   ├── src/pages/              # 页面路由
│   ├── src/components/         # 通用组件
│   ├── src/api/                # API客户端
│   └── src/store/              # 状态管理
│
├── backend/                    # FastAPI 后端
│   ├── app/api/v1/             # API路由层
│   ├── app/core/               # 核心配置
│   ├── app/models/             # 数据模型层 (35张表)
│   ├── app/schemas/            # Pydantic 模式
│   ├── app/services/           # 业务服务层
│   ├── app/providers/          # 第三方提供商
│   │   ├── ai/                 # AI提供商 (OpenAI, Dify, 火山方舟)
│   │   ├── storage/            # 存储提供商
│   │   └── payment/            # 支付提供商
│   ├── app/executors/          # 工具执行器
│   │   ├── base.py             # 执行器基类
│   │   ├── storybook.py        # 有声绘本执行器
│   │   └── ecommerce.py        # 电商详情页执行器
│   ├── app/workers/            # Celery 异步任务 (3级队列优先级)
│   ├── alembic/                # 数据库迁移
│   └── tests/                  # 测试目录
│
├── docs/                       # 文档目录
│   ├── 灵创AI工具箱产品需求文档PRD.md
│   ├── 灵创AI工具箱-技术方案文档-v1.1.md
│   └── design/                 # 设计稿 (HTML原型)
│
└── docker-compose.yml          # Docker编排
```

---

## 🏗 核心业务流程规范

### 1. 用户注册与认证流程
```
微信一键登录：
  用户点击「微信登录」
    → 前端跳转微信OAuth授权页
    → 用户扫码确认
    → 微信回调code到后端
    → 后端换取openid + access_token
    → 查询用户是否存在
      → 存在：生成JWT，返回登录成功
      → 不存在：创建新用户，赠送体验积分
    → 前端存储Token

实名认证：
  用户填写姓名+身份证号
    → 后端调用第三方实名核验API
    → 核验通过：AES-256加密存储身份证号
    → 标记id_card_verified = true
    → 赠送认证奖励积分
```

### 2. 工具使用完整链路
```
用户使用工具流程：
  1. 用户进入工具详情页
     → 读取工具配置（Redis缓存）
     → 展示费用说明和案例

  2. 用户填写参数/对话交互
     → 前端实时校验输入
     → 实时估算费用：base_fee + 资源费

  3. 点击「开始生成」
     → 检查用户积分余额 ≥ 预估费用
     → 检查实名认证状态
     → 创建Task记录（status=pending）
     → 预冻结积分
     → 提交任务到Celery队列
     → 返回task_id，前端进入进度页

  4. 任务执行中
     → Worker拉取任务，更新status=running
     → 执行器分步执行，每步调用update_progress
     → 实时写入TaskLog
     → 调用AI Provider API

  5. 任务完成
     → 计算实际费用（多退少不补）
     → 结算：解冻预冻结，扣取实际费用
     → 创建Work记录和WorkFile记录
     → 更新Task状态=completed
     → 触发站内通知（可选）

  6. 异常处理
     → AI调用失败：自动重试2次 → 仍失败 → 标记failed
     → 超时失败：status=timeout，全额退还积分
     → 用户主动取消：根据进度按比例扣费
```

### 3. 支付与充值流程
```
积分充值流程：
  用户选择充值档位
    → 创建Order记录（status=pending）
    → 调用微信支付统一下单API
    → 返回prepay_id和支付参数
    → 前端唤起微信支付
    → 用户支付完成
    → 微信异步回调notify_url
    → 后端验证签名，更新order=paid
    → 发放积分 + 赠送积分
    → 记录交易流水
```

### 4. 迭代创作流程
```
基于已有成果继续优化：
  用户在成果详情页点击「继续优化」
    → 加载历史版本树（支持选择任意版本为父节点）
    → 展示历史输入参数和最终提示词
    → 用户输入修改需求
    → 系统合并上下文
    → 生成新的prompt_text
    → 费用预估（迭代优惠：基础费8折）
    → 创建新Task，parent_id指向原Work
    → 执行生成流程
    → 完成后生成新版本Work（version+1）
    → 版本对比：自动生成差异说明
```

---

## 🧪 标杆工具执行规范

### 标杆工具1：AI有声绘本生成专家
| 阶段 | 进度 | 操作 | 费用计算 |
|------|------|------|---------|
| 1. 故事生成 | 0-15% | LLM根据主题生成完整故事大纲 + 分页故事文本 | 包含在基础费 |
| 2. 插画提示词生成 | 15-25% | 为每一页生成精准的绘画提示词 | 包含在基础费 |
| 3. 批量生成插图 | 25-60% | 并行调用图片生成API，N页同时生成 | image_fee × 页数 |
| 4. 语音合成 | 60-80% | 为每一页故事文本生成语音 narration | audio_fee × 页数 |
| 5. 排版与打包 | 80-95% | 生成统一封面、PDF排版、打包ZIP | 包含在基础费 |
| 6. 完成结算 | 100% | 计算总费用，生成预览，保存成果 | - |

### 标杆工具2：AI电商商品详情页生成器
- 基础费：12积分
- 图片费：1积分/张
- 输出：商品主图、详情页分段图片、营销文案、PSD源文件

---

## 🔒 安全规范

### 数据安全
- **用户隐私信息**：AES-256 加密存储
- **身份证号**：脱敏显示（仅显示前后4位）+ SHA-256 哈希去重
- **数据库备份**：每日全量备份 + 小时级增量备份
- **操作日志**：所有关键操作留存6个月，可审计

### 接口安全
- **签名校验**：所有接口请求签名校验
- **限流策略**：按 User + IP 双重限流
- **防护**：SQL 注入/XSS/CSRF 防护
- **幂等性**：敏感接口（支付、扣费）加幂等性Token

### 资金安全
- **预冻结机制**：扣费前预冻结，任务完成后结算
- **异常检测**：异常扣费自动检测和退款机制
- **每日对账**：财务数据每日对账校验

---

## 🚀 性能指标要求

| 指标 | 目标值 |
|------|--------|
| **首屏加载** | < 1.5秒 (LCP) |
| **工具详情页** | < 2秒 |
| **API响应** | 99% < 500ms |
| **并发用户** | 支持2000并发 |
| **搜索响应** | < 300ms |

---

## 📊 MVP功能范围

### ✅ P0 - 必须完成（上线即有）
- [ ] 完整首页设计（8个区块）、工具卡片、分类导航、搜索
- [ ] 完整工具详情页、效果演示、定价说明、评价展示
- [ ] 微信一键登录注册、个人实名认证
- [ ] 积分充值（微信/支付宝）、按次扣费、消费明细
- [ ] AI有声绘本生成专家完整功能（表单模式）
- [ ] AI电商商品详情页生成器完整功能
- [ ] 成果列表、详情预览、打包下载
- [ ] 构思工具列表、投票功能、查看全部
- [ ] 工具配置管理、用户管理、订单管理、基础数据看板

### ⭐ P1 - 重要功能（上线后2周内完成）
- [ ] 迭代创作功能、对话模式工具
- [ ] 工具评价、通用反馈、建议奖励机制
- [ ] 每日签到、积分奖励、邀请机制
- [ ] 中英文切换支持

### 🚀 P2 - 后续迭代（上线后1-2个月）
- [ ] 定时任务、批量生成
- [ ] 工具定制咨询入口、私有化部署咨询
- [ ] 开发者入驻初步方案、工具分账机制设计

---

## 🧭 开发原则

### 1. 先设计后编码
- 功能开发前先对照 PRD 确认需求边界
- 技术方案确认后再动手编码
- 不确定的地方及时沟通，不做假设

### 2. 最小可行原则
- 优先实现核心路径，边缘场景后置
- 不做过度设计，不提前抽象
- 每个功能完成后及时自测验证

### 3. 代码质量
- 遵循现有代码风格
- 新增代码必须有注释
- 关键业务逻辑必须有单元测试
- 数据库变更必须通过 Alembic migration

### 4. 安全第一
- 涉及用户数据的操作必须留痕
- 支付相关代码必须双人 Review
- 新增接口必须考虑权限控制

---

## Superpowers + gstack 搭配配置

### Superpowers（思考与流程层）
负责所有 plan、brainstorm、debug、TDD、verify、code review。
触发方式：自动触发。

### gstack（执行与外部世界层）
负责浏览器操作、QA、ship、deploy、canary、安全审计。
触发方式：斜杠命令手动触发。

### 浏览器规则
使用 /browse 作为唯一浏览器入口。
禁止使用 mcp__claude-in-chrome__* 操作浏览器。

### 分工裁决
- 计划撰写 → Superpowers: writing-plans
- 计划多视角审查 → gstack: /autoplan
- 编码 → Superpowers: test-driven-development
- 调试 → Superpowers: systematic-debugging
- 真实环境验证 → gstack: /qa
- 代码审查 → Superpowers: requesting-code-review
- 发布 → gstack: /ship
- 安全审计 → gstack: /cso

Available skills: /office-hours, /plan-ceo-review, /plan-eng-review,
/plan-design-review, /design-consultation, /design-shotgun, /design-html,
/review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /qa,
/qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro,
/investigate, /document-release, /codex, /cso, /autoplan, /pair-agent,
/careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn

---

## 📚 参考文档

| 文档 | 说明 |
|------|------|
| `docs/灵创AI工具箱产品需求文档PRD.md` | 完整产品需求说明 |
| `docs/灵创AI工具箱-技术方案文档-v1.1.md` | 技术架构与详细设计 |
| `docs/design/` | 页面设计稿与HTML原型 |

---

**最后更新时间**：2026-05-18
**文档版本**：V1.0