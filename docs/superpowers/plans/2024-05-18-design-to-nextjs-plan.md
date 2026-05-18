# 设计稿转化为 Next.js 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `docs/design/` 目录下 11 个 HTML 设计稿页面完整转化为 Next.js App Router 架构，确保视觉效果 100% 与设计稿一致，包括动画、渐变、间距、交互效果。

**Architecture:**
- 采用 App Router 架构 (`apps/frontend-user/src/app/`)
- 共享组件位于 `components/` 目录
- 全局样式在 `globals.css` 中已大部分实现，需要补全
- 保持现有 Zustand 状态管理，不引入 API 层

**Tech Stack:**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Zustand

---

## 计划阶段总览

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| 1 | 首页完善（8个区块） | 2小时 |
| 2 | 工具列表页 | 1.5小时 |
| 3 | 工具详情页完善 | 1.5小时 |
| 4 | 充值套餐页 | 1小时 |
| 5 | 认证页面（登录/注册/实名） | 2小时 |
| 6 | 用户中心与消费明细 | 1.5小时 |
| 7 | 投票与反馈页 | 1.5小时 |
| 8 | 导航与页脚组件完善 | 1小时 |
| **总计** | | **12小时** |

---

## 阶段 1: 首页完善（8个区块）

**Files:**
- Modify: `apps/frontend-user/src/app/page.tsx`
- Modify: `apps/frontend-user/src/components/home/HeroSection.tsx`
- Modify: `apps/frontend-user/src/components/home/BenchmarkTools.tsx`
- Modify: `apps/frontend-user/src/components/home/CategoryGrid.tsx`
- Create: `apps/frontend-user/src/components/home/NewAndHotTools.tsx`
- Create: `apps/frontend-user/src/components/home/VoteSection.tsx`
- Create: `apps/frontend-user/src/components/home/StatsAndTestimonials.tsx`
- Create: `apps/frontend-user/src/components/home/EnterpriseServices.tsx`
- Create: `apps/frontend-user/src/components/home/CTASection.tsx`

### 任务 1.1: Hero Section 改造

**目标：** 与 `index.html` 第 92-481 行完全一致

- [ ] **Step 1: 更新 Hero 背景**
  ```tsx
  // 替换现有 Hero 背景，添加 section-bg-blobs 和 hero-enhanced 类
  <section className="py-16 lg:py-24 section-bg-blobs hero-enhanced">
    {/* 添加背景 blob 动画容器 */}
    <div className="section-glow"></div>
  </section>
  ```

- [ ] **Step 2: 更新标题与描述**
  ```tsx
  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
    灵创AI工具箱
    <span className="gradient-text block mt-2">专业场景AI工具集合平台</span>
  </h1>
  <p className="text-lg sm:text-xl text-[#64748B] mb-8 leading-relaxed">
    无需AI专业知识，简单几步，获得专业级可商用的完整成果。让每一个创意都能通过AI高效实现。
  </p>
  ```

- [ ] **Step 3: 更新按钮样式**
  ```tsx
  <div className="flex flex-col sm:flex-row gap-4 mb-12">
    <Link href="/register" className="btn-primary px-8 py-4 text-white font-semibold rounded-xl text-lg focus-ring inline-block text-center">
      立即免费体验
    </Link>
    <Link href="/tools" className="btn-secondary px-8 py-4 text-[#1E3A5F] font-semibold rounded-xl text-lg focus-ring inline-block text-center">
      浏览全部工具
    </Link>
  </div>
  ```

- [ ] **Step 4: 添加 5 个价值卡片**
  ```tsx
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
    {/* 5个卡片，每个包含图标SVG + 标题 */}
    {/* 场景深耕、成果完整、按量付费、持续迭代、用户共建 */}
  </div>
  ```

- [ ] **Step 5: 验证并提交**
  运行开发服务器验证效果，确认与设计稿一致后提交

### 任务 1.2: Benchmark Tools (标杆工具区块)

**目标：** 与 `index.html` 第 483-592 行一致

- [ ] **Step 1: 创建区块标题**
  ```tsx
  <section id="tools" className="py-16 lg:py-20 bg-white section-bg-blobs">
    <div className="text-center mb-12">
      <h2 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4">精品工具 · 开箱即用</h2>
      <p className="text-lg text-[#64748B] max-w-2xl mx-auto">每一款工具都经过专业调试，输出质量达到商用标准，让你的创意快速落地</p>
    </div>
  </section>
  ```

- [ ] **Step 2: 3 个工具卡片网格**
  ```tsx
  <div className="grid md:grid-cols-3 gap-8">
    {/* 卡片1: AI有声绘本生成专家 - HOT标签 */}
    {/* 卡片2: AI电商商品详情页生成器 - NEW标签 */}
    {/* 卡片3: AI营销文案大师 */}
    {/* 每个卡片包含: 图片、标签、标题、描述、评分、使用人数、价格、按钮 */}
  </div>
  ```

### 任务 1.3: Category Grid (工具分类区块)

**目标：** 与 `index.html` 第 594-684 行一致

- [ ] **Step 1: 更新分类卡片为 8 个**
  - 内容创作 📚、设计工具 🎨、教育教学 🏫、电商营销 🛒
  - 办公效率 💼、视频制作 🎬、音频处理 🔊、更多 ❓

- [ ] **Step 2: 每个卡片包含渐变色背景图标**

### 任务 1.4: New & Hot Tools (新品与热门工具区块)

**目标：** 与 `index.html` 第 686-833 行一致

- [ ] **Step 1: 左侧新品列表 (3个)**
  - 社交媒体配图、PPT生成器、思维导图助手

- [ ] **Step 2: 右侧热门列表 (5个)**
  - 排名#1-#5，带评分和使用次数

### 任务 1.5: Vote Section (用户共创投票区块)

**目标：** 与 `index.html` 第 835-989 行一致

- [ ] **Step 1: 深蓝渐变背景标题区域**

- [ ] **Step 2: 6 个投票卡片网格**
  - 视频脚本生成器(66%)、播客节目生成器(51%)、简历优化大师(38%)
  - 菜谱创意生成(31%)、旅行规划助手(28%)、表情包制作器(20%)

- [ ] **Step 3: 底部操作按钮**
  - 查看全部 30+ 构思工具
  - 💡 提交我的工具创意

### 任务 1.6: Stats And Testimonials

**目标：** 与 `index.html` 第 991-1079 行一致

- [ ] **Step 1: 4 个统计数据卡片**
  - 10,000+ 注册用户
  - 50,000+ 作品产出
  - 98% 任务成功率
  - 4.9 平均评分

- [ ] **Step 2: 3 个用户评价 Testimonial 卡片**

### 任务 1.7: Enterprise Services (企业服务区块)

**目标：** 与 `index.html` 第 1082-1153 行一致

- [ ] **Step 1: 4 个服务卡片 2x2 网格**
  - 工具个人定制
  - 企业级系统定制
  - 私有化部署
  - 系统对接集成

### 任务 1.8: CTA Section

**目标：** 与 `index.html` 第 1155-1165 行一致

- [ ] **Step 1: 绿色渐变背景 CTA 区域**
  - "开始你的AI创作之旅" 大标题
  - 两个按钮：立即免费体验、查看工具定价

---

## 阶段 2: 工具列表页

**Files:**
- Create: `apps/frontend-user/src/app/tools/page.tsx`

### 任务 2.1: 工具列表页面实现

**目标：** 与 `tools.html` 完全一致

- [ ] **Step 1: 顶部深蓝渐变 Header**
  - 标题：AI 工具集合
  - 副标题：专业场景深度优化，开箱即用，成果可交付
  - 大搜索框

- [ ] **Step 2: 分类筛选栏**
  - 8 个分类按钮（全部分类 + 7个具体分类）
  - active 状态样式：蓝色背景 + 白色文字

- [ ] **Step 3: 工具栏与排序**
  - 左侧显示工具数量
  - 右侧排序选项（热门推荐、最新上线、评分最高）

- [ ] **Step 4: 工具卡片网格**
  - 3 列布局
  - 每个卡片包含：图片、标签、标题、描述、评分、使用人数、价格、立即使用按钮

---

## 阶段 3: 工具详情页完善

**Files:**
- Modify: `apps/frontend-user/src/app/tools/[id]/page.tsx`

### 任务 3.1: 工具详情页区块补全

**目标：** 与 `tool-detail.html` 完全一致

- [ ] **Step 1: 面包屑导航** (已存在 Breadcrumb 组件，验证是否一致)

- [ ] **Step 2: Tool Hero 区域**
  - 左侧：工具图标、标题、标签、描述、评分、使用次数、收藏按钮
  - 右侧：价格卡片 + 立即使用按钮

- [ ] **Step 3: 功能特点 Features**
  - 4 个功能卡片 2x2 网格

- [ ] **Step 4: 使用步骤 How It Works**
  - 4 个步骤横向排列，带连接线

- [ ] **Step 5: 效果展示 Gallery**
  - 轮播或网格展示生成样例

- [ ] **Step 6: 定价方案 Pricing**
  - 3 个定价卡片（基础版、专业版、企业版）

- [ ] **Step 7: 用户评价 Reviews**
  - 评分统计 + 评价列表

---

## 阶段 4: 充值套餐页

**Files:**
- Create: `apps/frontend-user/src/app/pricing/page.tsx`

### 任务 4.1: 定价页面实现

**目标：** 与 `pricing.html` 完全一致

- [ ] **Step 1: 顶部标题区域**

- [ ] **Step 2: 套餐切换 Tab**
  - 按次充值、月度会员、年度会员

- [ ] **Step 3: 套餐卡片网格**
  - 4-5 个不同档位的充值选项
  - 突出推荐档位
  - 每个卡片包含：积分数量、赠送积分、价格、立即充值按钮

- [ ] **Step 4: 支付方式选择**
  - 微信支付、支付宝

- [ ] **Step 5: 常见问题 FAQ**

---

## 阶段 5: 认证页面

**Files:**
- Create: `apps/frontend-user/src/app/login/page.tsx`
- Create: `apps/frontend-user/src/app/register/page.tsx`
- Create: `apps/frontend-user/src/app/verification/page.tsx`

### 任务 5.1: 登录页面

**目标：** 与 `login.html` 一致

- [ ] 居中卡片布局
- [ ] Logo + 标题
- [ ] 手机号输入框
- [ ] 密码输入框
- [ ] 忘记密码链接
- [ ] 登录按钮
- [ ] 微信/支付宝快捷登录
- [ ] 底部注册链接

### 任务 5.2: 注册页面

**目标：** 与 `register.html` 一致

- [ ] 手机号输入 + 验证码
- [ ] 设置密码
- [ ] 同意协议 checkbox
- [ ] 注册按钮
- [ ] 登录链接

### 任务 5.3: 实名认证页面

**目标：** 与 `verification.html` 一致

- [ ] 实名状态提示
- [ ] 真实姓名输入
- [ ] 身份证号输入
- [ ] 手持身份证照片上传
- [ ] 提交审核按钮

---

## 阶段 6: 用户中心与消费明细

**Files:**
- Create: `apps/frontend-user/src/app/user-center/page.tsx`
- Create: `apps/frontend-user/src/app/orders/page.tsx`

### 任务 6.1: 用户中心页面

**目标：** 与 `user-center.html` 一致

- [ ] 左侧导航菜单
- [ ] 右侧用户信息卡片
- [ ] 积分余额展示
- [ ] 快捷入口（我的作品、充值记录、账号设置）

### 任务 6.2: 消费明细页面

**目标：** 与 `orders.html` 一致

- [ ] 统计概览卡片
- [ ] 消费记录表格
- [ ] 筛选与分页

---

## 阶段 7: 投票与反馈页

**Files:**
- Create: `apps/frontend-user/src/app/vote/page.tsx`
- Create: `apps/frontend-user/src/app/feedback/page.tsx`

### 任务 7.1: 用户共创投票页

**目标：** 与 `vote.html` 一致

- [ ] 顶部说明区域
- [ ] 投票工具列表
- [ ] 提交创意表单入口

### 任务 7.2: 帮助反馈页面

**目标：** 与 `feedback.html` 一致

- [ ] 常见问题折叠面板
- [ ] 反馈表单（类型、标题、描述、联系方式）
- [ ] 提交按钮

---

## 阶段 8: 导航与页脚组件完善

**Files:**
- Modify: `apps/frontend-user/src/components/layout/Navbar.tsx`
- Modify: `apps/frontend-user/src/components/layout/Footer.tsx`

### 任务 8.1: Navbar 对齐设计稿

**目标：** 与所有页面的 `<nav>` 部分一致

- [ ] 更新导航链接
  - 首页、工具中心、用户共创、帮助反馈
- [ ] 更新右侧操作按钮
  - 个人中心链接 + 充值套餐按钮

### 任务 8.2: Footer 对齐设计稿

**目标：** 与 `index.html` 第 1167-1232 行一致

- [ ] 左侧品牌介绍
- [ ] 产品链接列
- [ ] 支持链接列
- [ ] 账户链接列
- [ ] 底部版权与备案信息

---

## 验收标准

### 视觉一致性
- [ ] 所有颜色与设计稿十六进制值完全一致
- [ ] 所有间距（padding/margin/gap）与设计稿一致
- [ ] 所有圆角大小与设计稿一致
- [ ] 字体粗细与设计稿一致

### 动画与交互
- [ ] 所有 hover 效果正确实现
- [ ] 背景 blob 动画正确实现
- [ ] 卡片上浮效果正确
- [ ] 按钮悬停效果正确

### 响应式
- [ ] 移动端（sm）布局正确
- [ ] 平板端（md）布局正确
- [ ] 桌面端（lg）布局正确

### 代码质量
- [ ] 使用 TypeScript 类型
- [ ] 组件命名规范
- [ ] 无 `any` 类型
- [ ] 无未使用的 import
