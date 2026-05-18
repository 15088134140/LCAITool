---
name: design-reference
description: 用户端前端页面设计参考源规范 - @docs/design/ 目录是唯一参考
metadata:
  type: project
  priority: critical
---

# 用户端前端页面设计参考规范

## 🔴 核心规则（必须严格遵守）

**`@docs/design/` 目录是用户端前端页面的唯一参考来源**

### 页面映射关系

| 页面 | 设计参考文件 |
|------|-------------|
| 用户登录页 | `@docs/design/login.html` |
| 用户端首页 | `@docs/design/index.html` |
| 用户注册页 | `@docs/design/register.html` |
| 工具列表页 | `@docs/design/tools.html` |
| 工具详情页 | `@docs/design/tool-detail.html` |
| 用户中心页 | `@docs/design/user-center.html` |
| 实名认证页 | `@docs/design/verification.html` |
| 投票页 | `@docs/design/vote.html` |
| 订单页 | `@docs/design/orders.html` |
| 定价页 | `@docs/design/pricing.html` |
| 反馈页 | `@docs/design/feedback.html` |

## 开发流程

1. **实现用户端页面前**，首先在 `@docs/design/` 目录中查找对应的 HTML 原型
2. **严格按照** HTML 原型中的设计风格、色彩、布局、组件进行实现
3. **只有**在 `@docs/design/` 目录中找不到对应页面时，才使用 `ui-ux-pro-max` 技能进行创作
4. 使用技能创作时，**必须严格遵循**项目整体的设计系统规范

## 设计系统一致性要求

所有创作必须保持与现有设计系统的一致性：

- **色彩系统**：深蓝色主色调 `#1E3A5F`、蓝色渐变 `#2563EB`、绿色强调色渐变
- **字体**：DM Sans，字重 400/500/700
- **玻璃态效果**：`bg-white/8 backdrop-blur-2xl border border-white/15`
- **动画**：0.2s ease 过渡效果，float 浮动动画
- **圆角**：卡片 `rounded-3xl`，按钮 `rounded-xl`
- **阴影**：`shadow-2xl shadow-black/10`

## 异常处理

如果发现：
1. `@docs/design/` 目录中缺少某个页面的设计
2. 现有设计与 CLAUDE.md 中的技术规范有冲突

**不要自行决定**，应先：
- 记录问题
- 向用户确认处理方式
- 获得明确指示后再继续开发