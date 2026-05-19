---
name: playwright-e2e-testing-framework-design
description: Playwright E2E 端到端测试框架设计文档，支持智能体控制浏览器进行截图、登录、交互等操作
metadata:
  type: spec
  version: 1.0
  author: Claude Superpowers
  created: 2026-05-19
---

# Playwright E2E 测试框架设计文档

## 1. 项目背景

灵创AI工具箱项目需要支持智能体运行测试时能够打开浏览器、截图、观察用户行为、模拟登录等浏览器交互操作。本设计基于 Playwright 搭建 E2E（端到端）测试框架，与现有 pytest 基础设施无缝集成。

## 2. 设计目标

- ✅ **智能体友好**：可靠的选择器、自动等待、稳定的交互
- ✅ **自动截图**：失败场景自动捕获截图供智能体观察
- ✅ **Trace 调试**：完整的操作回放功能
- ✅ **登录持久化**：一次登录，所有测试复用
- ✅ **数据复用**：直接使用后端数据库 fixture 构造测试数据
- ✅ **灵活运行**：支持无头/可见模式切换，适配不同场景

## 3. 技术选型

| 技术 | 选型 | 理由 |
|------|------|------|
| 浏览器自动化 | Playwright | 现代化 API，自动等待，多浏览器支持，Trace Viewer |
| 测试框架 | pytest | 与现有后端测试框架一致，学习成本低 |
| 浏览器 | Chromium | 初始阶段专注单一浏览器，快速落地 |
| 运行模式 | 无头 + 可见双模式 | 通过环境变量 `E2E_HEADLESS` 切换 |

## 4. 目录结构设计

```
apps/backend/
├── tests/
│   ├── conftest.py              # 现有 pytest 配置
│   ├── test_auth_service.py     # 现有单元测试
│   ├── test_user_service.py     # 现有单元测试
│   │
│   └── e2e/                     # 新增 E2E 测试目录
│       ├── conftest.py          # Playwright 专属配置
│       ├── pytest.ini           # E2E 专用 pytest 配置
│       ├── requirements.txt     # E2E 测试依赖
│       │
│       ├── test_login.py        # 登录流程测试
│       ├── test_homepage.py     # 首页浏览测试
│       ├── test_tools_page.py   # 工具列表页测试
│       ├── test_storybook.py    # 绘本生成工具测试
│       │
│       ├── data/                # 测试数据
│       │   └── users.py         # 测试用户数据
│       │
│       ├── utils/               # 测试工具函数
│       │   ├── auth.py          # 认证辅助函数
│       │   ├── api.py           # API 调用辅助
│       │   └── helpers.py       # 通用辅助函数
│       │
│       ├── screenshots/         # 截图输出（git ignore）
│       ├── videos/              # 视频录制（git ignore）
│       ├── traces/              # Trace 文件（git ignore）
│       └── reports/             # 测试报告（git ignore）
```

## 5. 核心 Fixture 设计

### 5.1 浏览器生命周期 Fixture

- `playwright`: 会话级别，Playwright 实例
- `browser`: 会话级别，Chromium 浏览器实例，所有测试复用
- `browser_context`: 会话级别，浏览器上下文，共享登录状态和 cookies
- `page`: 测试用例级别，每个测试新建一个独立页面

### 5.2 关键特性

**自动等待机制**：Playwright 内置，无需手动 `time.sleep()`

**失败自动截图**：每个测试失败时自动保存全屏截图

```python
if request.node.rep_call.failed:
    page.screenshot(path=screenshot_path, full_page=True)
```

**Trace 收集**：每个失败用例保存独立 Trace 文件，支持完整回放

```python
context.tracing.start(
    screenshots=True,
    snapshots=True,
    sources=True
)
```

**控制台日志捕获**：自动输出浏览器控制台日志

```python
page.on("console", lambda msg: print(f"[Browser {msg.type}] {msg.text}"))
```

### 5.3 认证 Fixture

- `test_user`: 会话级别，创建测试用户并赠送积分
- `logged_in_page`: 测试用例级别，已注入登录状态的页面

## 6. 测试用例设计

### 6.1 登录流程测试 (`test_login.py`)

- `test_login_page_loads`: 验证登录页正常加载
- `test_navigate_to_home_after_login`: 验证登录后跳转到首页

### 6.2 工具页测试 (`test_tools_page.py`)

- `test_tools_page_loads`: 验证工具列表页加载
- `test_tool_detail_page`: 验证工具详情页元素

### 6.3 绘本生成测试 (`test_storybook.py`)

- `test_storybook_form_submission`: 验证表单提交和进度页面

## 7. 运行方式设计

### 7.1 命令配置

通过 `pytest.ini` 配置测试路径和 markers：

```ini
[pytest]
testpaths = tests/e2e
markers =
    slow: 标记慢速测试
    login: 登录相关测试
    tools: 工具页相关测试
    storybook: 绘本生成相关测试
```

### 7.2 运行命令

```bash
# 无头模式运行所有测试（CI/CD 默认）
pytest tests/e2e/

# 可见模式运行（开发调试）
E2E_HEADLESS=false pytest tests/e2e/

# 运行特定测试文件
pytest tests/e2e/test_login.py -v

# 运行带特定标记的测试
pytest tests/e2e/ -m "login"

# 查看 Trace（失败后调试）
playwright show-trace tests/e2e/traces/<test_name>.zip
```

### 7.3 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `E2E_BASE_URL` | `http://localhost:3000` | 测试目标地址 |
| `E2E_HEADLESS` | `true` | 是否无头模式 |

## 8. 智能体增强特性

### 8.1 观察能力

- 📸 **截图**：每个关键步骤自动截图，供智能体视觉观察
- 📝 **日志**：浏览器控制台日志、网络请求日志自动输出
- 🔍 **Trace**：完整的操作回放，包括 DOM 快照、网络请求、JS 调用栈

### 8.2 交互能力

- 点击、输入、选择等标准浏览器操作
- 支持执行自定义 JavaScript
- 支持网络拦截和 Mock

## 9. 与现有系统集成

### 9.1 后端测试集成

- 复用现有 `db_session` fixture 构造测试数据
- 复用现有 service 层创建测试用户
- 统一的 pytest 测试报告和 CI/CD 流程

### 9.2 .gitignore 更新

```
# E2E 测试输出
apps/backend/tests/e2e/screenshots/
apps/backend/tests/e2e/videos/
apps/backend/tests/e2e/traces/
apps/backend/tests/e2e/reports/
apps/backend/tests/e2e/state.json
```

## 10. 实施计划概览

| 步骤 | 内容 | 预计工作量 |
|------|------|-----------|
| 1 | 安装依赖，创建目录结构 | 5分钟 |
| 2 | 编写核心 conftest.py | 15分钟 |
| 3 | 编写基础测试用例 | 20分钟 |
| 4 | 编写工具函数和辅助类 | 10分钟 |
| 5 | 本地测试验证 | 10分钟 |
| 6 | 更新文档和 .gitignore | 5分钟 |

**总计：约 65 分钟**

## 11. 后续扩展方向

- [ ] 增加 Firefox / WebKit 浏览器支持
- [ ] 增加管理后台测试用例
- [ ] 集成 Playwright MCP Server 实现智能体直接控制浏览器
- [ ] 增加性能测试（LCP、加载时间等）
- [ ] 集成视觉回归测试
