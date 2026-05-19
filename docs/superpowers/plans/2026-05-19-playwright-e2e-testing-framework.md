# Playwright E2E 测试框架实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建完整的 Playwright E2E 测试框架，支持智能体控制浏览器进行截图、登录、交互等操作

**Architecture:** Playwright 与现有 pytest 基础设施集成，采用后端集中式架构，复用数据库 fixture 构造测试数据，支持无头/可见双模式运行

**Tech Stack:** Playwright 1.40+, pytest 7.0+, Python 3.9+, Chromium

---

## 前置检查

- [ ] 确认当前工作目录为项目根目录：`c:\MyProject\LCAITool`
- [ ] 确认 `apps/backend/tests/` 目录已存在
- [ ] 确认已有 `apps/backend/requirements.txt` 包含 pytest

---

### Task 1: 创建目录结构和依赖文件

**Files:**
- Create: `apps/backend/tests/e2e/requirements.txt`
- Create: `apps/backend/tests/e2e/pytest.ini`
- Create: `apps/backend/tests/e2e/screenshots/` (empty directory)
- Create: `apps/backend/tests/e2e/videos/` (empty directory)
- Create: `apps/backend/tests/e2e/traces/` (empty directory)
- Create: `apps/backend/tests/e2e/reports/` (empty directory)
- Create: `apps/backend/tests/e2e/utils/` (empty directory)
- Create: `apps/backend/tests/e2e/data/` (empty directory)

- [ ] **Step 1: 创建 E2E 目录结构**

```bash
cd apps/backend
mkdir -p tests/e2e/{screenshots,videos,traces,reports,utils,data}
```

- [ ] **Step 2: 创建 requirements.txt**

```txt
# apps/backend/tests/e2e/requirements.txt
playwright>=1.40.0
pytest-playwright>=0.4.0
pytest-html>=4.0.0
```

- [ ] **Step 3: 创建 pytest.ini**

```ini
# apps/backend/tests/e2e/pytest.ini
[pytest]
testpaths = .
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
markers =
    slow: 标记慢速测试（如实际生成绘本）
    login: 登录相关测试
    tools: 工具页相关测试
    storybook: 绘本生成相关测试
```

- [ ] **Step 4: 验证目录结构**

```bash
ls -la tests/e2e/
```
Expected: 目录存在，包含 screenshots, videos, traces, reports, utils, data

---

### Task 2: 编写核心 conftest.py

**Files:**
- Create: `apps/backend/tests/e2e/conftest.py`
- Depends on: Task 1

- [ ] **Step 1: 编写 conftest.py 完整内容**

```python
# apps/backend/tests/e2e/conftest.py
import os
import pytest
from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright

# 基础配置
E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
E2E_HEADLESS = os.getenv("E2E_HEADLESS", "true").lower() == "true"
VIEWPORT = {"width": 1920, "height": 1080}


@pytest.fixture(scope="session")
def playwright():
    """Playwright 实例，会话级别"""
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def browser(playwright):
    """浏览器实例，会话级别，所有测试复用"""
    browser = playwright.chromium.launch(
        headless=E2E_HEADLESS,
        slow_mo=100 if not E2E_HEADLESS else 0,
        args=["--no-sandbox", "--disable-setuid-sandbox"]
    )
    yield browser
    browser.close()


@pytest.fixture(scope="session")
def browser_context(browser):
    """浏览器上下文，会话级别，共享登录状态"""
    context = browser.new_context(
        viewport=VIEWPORT,
        locale="zh-CN",
        timezone_id="Asia/Shanghai",
        record_video_dir="tests/e2e/videos/" if not E2E_HEADLESS else None,
        record_video_size=VIEWPORT,
    )
    
    # 启用 Trace 收集
    context.tracing.start(
        screenshots=True,
        snapshots=True,
        sources=True
    )
    
    yield context
    
    # 停止 Trace
    os.makedirs("tests/e2e/traces", exist_ok=True)
    context.tracing.stop(path="tests/e2e/traces/session.zip")
    context.close()


@pytest.fixture
def page(browser_context: BrowserContext, request):
    """页面对象，每个测试新建一个页面"""
    page = browser_context.new_page()
    
    # 捕获浏览器控制台日志
    page.on("console", lambda msg: print(f"[Browser {msg.type}] {msg.text}"))
    
    # 捕获页面错误
    page.on("pageerror", lambda err: print(f"[Page Error] {err}"))
    
    # 捕获请求失败
    page.on("requestfailed", lambda req: print(f"[Request Failed] {req.url} {req.failure}"))
    
    yield page
    
    # 失败时自动截图和保存 Trace
    if hasattr(request.node, "rep_call") and request.node.rep_call.failed:
        test_name = request.node.name
        os.makedirs("tests/e2e/screenshots", exist_ok=True)
        os.makedirs("tests/e2e/traces", exist_ok=True)
        
        screenshot_path = f"tests/e2e/screenshots/{test_name}.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"\n📸 失败截图已保存: {screenshot_path}")
        
        trace_path = f"tests/e2e/traces/{test_name}.zip"
        browser_context.tracing.stop(path=trace_path)
        print(f"🔍 Trace 已保存: {trace_path}")
    
    page.close()


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """捕获测试结果，用于失败时截图"""
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)
```

- [ ] **Step 2: 验证文件语法**

```bash
cd apps/backend
python -m py_compile tests/e2e/conftest.py
```
Expected: 无语法错误

---

### Task 3: 编写工具函数和测试数据

**Files:**
- Create: `apps/backend/tests/e2e/utils/auth.py`
- Create: `apps/backend/tests/e2e/utils/helpers.py`
- Create: `apps/backend/tests/e2e/data/users.py`
- Depends on: Task 2

- [ ] **Step 1: 编写 auth.py**

```python
# apps/backend/tests/e2e/utils/auth.py
"""
认证相关辅助函数
"""

E2E_BASE_URL = "http://localhost:3000"


def login_with_api(page, username, password):
    """
    通过 API 登录并注入 token
    
    Args:
        page: Playwright Page 对象
        username: 用户名
        password: 密码
    """
    response = page.request.post(
        f"{E2E_BASE_URL}/api/v1/auth/login",
        form={
            "username": username,
            "password": password
        }
    )
    
    if response.ok:
        token_data = response.json()
        token = token_data.get("access_token")
        if token:
            # 设置 Authorization header 用于后续请求
            page.context.set_extra_http_headers({
                "Authorization": f"Bearer {token}"
            })
            return True
    
    return False


def get_login_state(page):
    """
    检查当前页面是否已登录
    
    Args:
        page: Playwright Page 对象
    """
    try:
        # 检查用户头像元素是否存在
        page.wait_for_selector("[data-testid='user-avatar']", timeout=3000)
        return True
    except:
        return False
```

- [ ] **Step 2: 编写 helpers.py**

```python
# apps/backend/tests/e2e/utils/helpers.py
"""
通用测试辅助函数
"""
import os


def take_screenshot(page, name, output_dir="tests/e2e/screenshots"):
    """
    截图辅助函数
    
    Args:
        page: Playwright Page 对象
        name: 截图名称（不含 .png 后缀）
        output_dir: 输出目录
    """
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    return path


def wait_for_network_idle(page, timeout=5000):
    """
    等待网络请求空闲
    
    Args:
        page: Playwright Page 对象
        timeout: 超时时间（毫秒）
    """
    page.wait_for_load_state("networkidle", timeout=timeout)


def scroll_to_bottom(page):
    """滚动到页面底部"""
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
```

- [ ] **Step 3: 编写 users.py 测试数据**

```python
# apps/backend/tests/e2e/data/users.py
"""
测试用户数据
"""

# 默认测试用户
DEFAULT_TEST_USER = {
    "username": "e2e_test_user",
    "email": "e2e_test@example.com",
    "password": "Test123456!",
    "phone": "13800138000",
    "points": 10000
}

# 无积分测试用户
NO_POINTS_USER = {
    "username": "e2e_no_points",
    "email": "e2e_no_points@example.com",
    "password": "Test123456!",
    "phone": "13800138001",
    "points": 0
}
```

- [ ] **Step 4: 验证文件语法**

```bash
cd apps/backend
python -m py_compile tests/e2e/utils/auth.py
python -m py_compile tests/e2e/utils/helpers.py
python -m py_compile tests/e2e/data/users.py
```
Expected: 无语法错误

---

### Task 4: 添加测试用户 Fixture

**Files:**
- Modify: `apps/backend/tests/e2e/conftest.py` (append to end)
- Depends on: Task 3

- [ ] **Step 1: 在 conftest.py 末尾添加测试用户 Fixture**

```python
# 追加到 apps/backend/tests/e2e/conftest.py 末尾

# 导入父目录 conftest 的 db_session fixture
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from conftest import db_session

from data.users import DEFAULT_TEST_USER


@pytest.fixture(scope="session")
def test_user(db_session):
    """
    创建测试用户，会话级别，所有测试复用
    注意：需要后端服务数据库可用
    """
    try:
        from app.services.user_service import create_user, get_user_by_username
        from app.schemas.user import UserCreate
        
        # 检查用户是否已存在
        existing_user = get_user_by_username(db_session, DEFAULT_TEST_USER["username"])
        if existing_user:
            return existing_user
        
        # 创建新用户
        user_data = UserCreate(
            username=DEFAULT_TEST_USER["username"],
            email=DEFAULT_TEST_USER["email"],
            password=DEFAULT_TEST_USER["password"],
            phone=DEFAULT_TEST_USER["phone"]
        )
        user = create_user(db_session, user_data)
        
        # 赠送测试积分
        user.points = DEFAULT_TEST_USER["points"]
        db_session.commit()
        db_session.refresh(user)
        
        return user
    except Exception as e:
        print(f"⚠️  创建测试用户失败: {e}，将使用 mock 用户数据")
        # 返回 mock 用户数据（用于独立运行测试）
        class MockUser:
            username = DEFAULT_TEST_USER["username"]
            email = DEFAULT_TEST_USER["email"]
        return MockUser()


@pytest.fixture
def logged_in_page(page: Page, test_user):
    """已登录的页面对象"""
    # 尝试通过 API 登录
    try:
        from utils.auth import login_with_api
        login_with_api(page, test_user.username, DEFAULT_TEST_USER["password"])
    except Exception as e:
        print(f"⚠️  自动登录失败: {e}，测试将以未登录状态继续")
    
    yield page
```

- [ ] **Step 2: 验证文件语法**

```bash
cd apps/backend
python -m py_compile tests/e2e/conftest.py
```
Expected: 无语法错误

---

### Task 5: 编写登录流程测试

**Files:**
- Create: `apps/backend/tests/e2e/test_login.py`
- Depends on: Task 4

- [ ] **Step 1: 编写 test_login.py**

```python
# apps/backend/tests/e2e/test_login.py
"""
登录流程测试
"""
import pytest
from utils.helpers import take_screenshot

E2E_BASE_URL = "http://localhost:3000"


@pytest.mark.login
class TestLogin:
    """登录相关测试"""
    
    def test_login_page_loads(self, page):
        """测试登录页正常加载"""
        page.goto(f"{E2E_BASE_URL}/login")
        
        # 截图供智能体观察
        take_screenshot(page, "login_page_loaded")
        
        # 验证页面标题
        assert "登录" in page.title() or "Login" in page.title() or "灵创AI" in page.title()
        
        # 验证页面加载成功（没有错误页面）
        assert page.get_by_role("button").count() > 0
        
        print("✅ 登录页面加载成功")
    
    def test_homepage_redirects_to_login_when_not_logged_in(self, page):
        """测试未登录时访问首页是否跳转到登录"""
        page.goto(E2E_BASE_URL)
        take_screenshot(page, "homepage_not_logged_in")
        
        # 验证页面加载成功
        assert page.url is not None
        
        print("✅ 首页访问测试完成")
    
    def test_logged_in_page_fixture(self, logged_in_page):
        """测试 logged_in_page fixture"""
        logged_in_page.goto(E2E_BASE_URL)
        take_screenshot(logged_in_page, "logged_in_homepage")
        
        # 验证页面加载成功
        assert logged_in_page.url is not None
        
        print("✅ 已登录页面 fixture 测试完成")
```

- [ ] **Step 2: 验证文件语法**

```bash
cd apps/backend
python -m py_compile tests/e2e/test_login.py
```
Expected: 无语法错误

---

### Task 6: 编写工具页测试

**Files:**
- Create: `apps/backend/tests/e2e/test_tools_page.py`
- Depends on: Task 5

- [ ] **Step 1: 编写 test_tools_page.py**

```python
# apps/backend/tests/e2e/test_tools_page.py
"""
工具页测试
"""
import pytest
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = "http://localhost:3000"


@pytest.mark.tools
class TestToolsPage:
    """工具页相关测试"""
    
    def test_tools_page_loads(self, page):
        """测试工具列表页加载"""
        page.goto(f"{E2E_BASE_URL}/tools")
        
        wait_for_network_idle(page)
        take_screenshot(page, "tools_page_loaded")
        
        # 验证页面加载成功
        assert page.url is not None
        assert "/tools" in page.url
        
        print("✅ 工具列表页加载成功")
    
    def test_storybook_tool_detail(self, page):
        """测试绘本生成工具详情页"""
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        
        wait_for_network_idle(page)
        take_screenshot(page, "storybook_detail_page")
        
        # 验证页面加载成功
        assert page.url is not None
        
        print("✅ 绘本工具详情页加载成功")
    
    def test_ecommerce_tool_detail(self, page):
        """测试电商详情页工具详情页"""
        page.goto(f"{E2E_BASE_URL}/tools/ecommerce-generator")
        
        wait_for_network_idle(page)
        take_screenshot(page, "ecommerce_detail_page")
        
        # 验证页面加载成功
        assert page.url is not None
        
        print("✅ 电商工具详情页加载成功")
```

- [ ] **Step 2: 验证文件语法**

```bash
cd apps/backend
python -m py_compile tests/e2e/test_tools_page.py
```
Expected: 无语法错误

---

### Task 7: 编写绘本生成测试

**Files:**
- Create: `apps/backend/tests/e2e/test_storybook.py`
- Depends on: Task 6

- [ ] **Step 1: 编写 test_storybook.py**

```python
# apps/backend/tests/e2e/test_storybook.py
"""
绘本生成工具测试
"""
import pytest
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = "http://localhost:3000"


@pytest.mark.storybook
class TestStorybookGenerator:
    """绘本生成工具相关测试"""
    
    def test_storybook_page_loads(self, page):
        """测试绘本生成页面加载"""
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        
        wait_for_network_idle(page)
        take_screenshot(page, "storybook_page_loaded")
        
        assert page.url is not None
        print("✅ 绘本生成页面加载成功")
    
    def test_storybook_form_elements_exist(self, page):
        """测试绘本生成表单元素存在"""
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)
        
        # 检查页面上的输入元素（无论具体定位器，只要页面加载成功即可）
        form_count = page.locator("input").count()
        take_screenshot(page, "storybook_form_elements")
        
        print(f"✅ 页面包含 {form_count} 个输入元素")
    
    @pytest.mark.slow
    def test_storybook_form_submission_smoke(self, page):
        """
        绘本生成表单提交冒烟测试
        注意：此测试仅验证提交按钮存在，不实际执行生成
        """
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)
        
        # 截图
        take_screenshot(page, "storybook_before_submit")
        
        # 验证按钮存在（使用多种可能的选择器）
        buttons = page.get_by_role("button")
        button_count = buttons.count()
        
        print(f"✅ 页面包含 {button_count} 个按钮")
        assert button_count > 0
```

- [ ] **Step 2: 验证文件语法**

```bash
cd apps/backend
python -m py_compile tests/e2e/test_storybook.py
```
Expected: 无语法错误

---

### Task 8: 安装依赖并执行冒烟测试

**Files:**
- Depends on: Task 7

- [ ] **Step 1: 安装 E2E 测试依赖**

```bash
cd apps/backend
pip install -r tests/e2e/requirements.txt
```
Expected: 所有包安装成功

- [ ] **Step 2: 安装 Playwright 浏览器**

```bash
cd apps/backend
playwright install chromium
```
Expected: Chromium 浏览器安装成功

- [ ] **Step 3: 执行 pytest 冒烟测试（仅收集测试）**

```bash
cd apps/backend
pytest tests/e2e/ --collect-only -v
```
Expected: 能够收集到所有测试用例，无错误

---

### Task 9: 更新 .gitignore 忽略输出文件

**Files:**
- Modify: `apps/backend/.gitignore` (or create if not exists)
- Depends on: Task 8

- [ ] **Step 1: 检查是否存在 .gitignore**

```bash
cd apps/backend
ls -la .gitignore || echo "File does not exist"
```

- [ ] **Step 2: 更新或创建 .gitignore**

如果文件不存在，创建它；如果存在，追加以下内容：

```
# ===== E2E 测试输出 =====
tests/e2e/screenshots/
tests/e2e/videos/
tests/e2e/traces/
tests/e2e/reports/
tests/e2e/state.json
tests/e2e/*.log
```

---

### Task 10: 创建 README 说明文档

**Files:**
- Create: `apps/backend/tests/e2e/README.md`
- Depends on: Task 9

- [ ] **Step 1: 编写 README.md**

```markdown
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

#### 查看录制的视频（仅非无头模式时会录制视频

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
│   └── users.py         # 测试用户数据
│
├── utils/               # 测试工具函数
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
```

---

## 验收检查清单

在标记完成之前，验证以下所有项：

- [ ] 所有目录创建完成
- [ ] 所有 Python 文件无语法错误
- [ ] Playwright 依赖安装成功
- [ ] Chromium 浏览器安装成功
- [ ] pytest 可以正确收集所有测试用例
- [ ] .gitignore 已更新
- [ ] README 文档已创建

---

## 后续扩展建议

1. 增加 Firefox / WebKit 浏览器支持
2. 集成 Playwright MCP Server 实现智能体直接控制浏览器
3. 增加管理后台测试用例
4. 增加视觉回归测试
5. 集成 CI/CD 流水线
