# E2E 端到端测试

基于 Playwright 的端到端测试框架，支持智能体控制浏览器进行截图、登录、交互等操作。

## 快速开始

### 1. 安装依赖

```bash
pip install -r tests/e2e/requirements.txt
playwright install chromium
```

### 2. 运行测试

#### 方式1：无头模式运行所有测试（CI/CD 默认）
```bash
pytest tests/e2e/
```

#### 方式2：可见模式运行（开发调试，可看到浏览器操作）
```bash
E2E_HEADLESS=false pytest tests/e2e/
```

#### 方式3：运行特定测试文件
```bash
pytest tests/e2e/test_login.py -v
```

#### 方式4：运行带特定标记的测试
```bash
pytest tests/e2e/ -m "login"
pytest tests/e2e/ -m "tools"
pytest tests/e2e/ -m "storybook"
pytest tests/e2e/ -m "not slow"  # 排除慢速测试
```

#### 方式5：生成 HTML 报告
```bash
pytest tests/e2e/ --html=tests/e2e/reports/report.html --self-contained-html
```

### 3. 调试失败用例

#### 查看截图
失败用例的截图保存在 `tests/e2e/screenshots/` 目录下。

#### 查看 Trace 文件（完整回放）
```bash
playwright show-trace tests/e2e/traces/<测试用例名称>.zip
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `E2E_BASE_URL` | `http://localhost:3000` | 测试目标地址 |
| `E2E_HEADLESS` | `true` | 是否无头模式 |

## 目录结构

```
tests/e2e/
├── conftest.py          # Playwright 核心配置和 fixture
├── pytest.ini           # pytest 配置
├── requirements.txt     # 依赖列表
├── README.md            # 本文档
│
├── test_login.py        # 登录流程测试
├── test_tools_page.py   # 工具页测试
├── test_storybook.py    # 绘本生成测试
│
├── data/                # 测试数据
│   ├── __init__.py
│   └── users.py         # 测试用户数据
│
├── utils/               # 测试工具函数
│   ├── __init__.py
│   ├── auth.py          # 认证辅助
│   └── helpers.py       # 通用辅助
│
├── screenshots/         # 截图输出（git ignore）
├── videos/              # 视频录制（git ignore）
├── traces/              # Trace 文件（git ignore）
└── reports/             # 测试报告（git ignore）
```

## 智能体特性

- 📸 **自动截图**：每个关键步骤和失败时自动截图
- 📝 **日志捕获**：自动输出浏览器控制台日志、页面错误、网络请求失败
- 🔍 **Trace 回放**：完整的操作回放，包括 DOM 快照、网络请求
- 🎥 **视频录制**：非无头模式下自动录制视频
- 🔐 **自动登录**：`logged_in_page` fixture 自动注入登录状态

## Fixture 说明

| Fixture | Scope | 说明 |
|---------|-------|------|
| `playwright` | session | Playwright 实例 |
| `browser` | session | Chromium 浏览器实例，所有测试复用 |
| `browser_context` | session | 浏览器上下文，共享登录状态和 cookies |
| `page` | function | 页面对象，每个测试新建一个独立页面 |
| `test_user` | session | 测试用户，自动创建或复用 |
| `logged_in_page` | function | 已登录的页面对象 |

## Marker 说明

| Marker | 说明 |
|--------|------|
| `@pytest.mark.login` | 登录相关测试 |
| `@pytest.mark.tools` | 工具页相关测试 |
| `@pytest.mark.storybook` | 绘本生成相关测试 |
| `@pytest.mark.slow` | 标记慢速测试，可通过 `-m "not slow"` 排除 |

## 后续扩展建议

1. 增加 Firefox / WebKit 浏览器支持
2. 集成 Playwright MCP Server 实现智能体直接控制浏览器
3. 增加管理后台测试用例
4. 增加视觉回归测试
5. 集成 CI/CD 流水线
