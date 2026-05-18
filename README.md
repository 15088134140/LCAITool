# 灵创AI工具箱

专业场景AI工具集合平台，让每一个创意都能通过AI高效实现。

## 技术栈

- **前端用户端**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **前端管理端**: React + Vite + TypeScript + Tailwind CSS
- **后端**: FastAPI + SQLAlchemy 2.0 + PostgreSQL + Redis
- **包管理**: pnpm + Turborepo Monorepo
- **UI 组件**: shadcn/ui

## 项目结构

```
LCAITool/
├── apps/
│   ├── backend/              # FastAPI 后端服务
│   ├── frontend-user/        # Next.js 用户端
│   └── frontend-admin/       # Vite 管理端
├── packages/
│   ├── ui/                   # 共享 UI 组件
│   ├── tailwind-config/      # 共享 Tailwind 配置
│   ├── tsconfig/             # 共享 TypeScript 配置
│   └── eslint-config/        # 共享 ESLint 配置
├── docs/                     # 文档目录
└── docker-compose.yml        # 本地开发环境
```

## 快速开始

### 前置要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Python >= 3.12
- Docker & Docker Compose

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动基础设施（PostgreSQL + Redis）

```bash
docker compose up -d
```

### 3. 配置环境变量

```bash
cd apps/backend
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

### 4. 创建 Python 虚拟环境并安装依赖

```bash
cd apps/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 5. 启动所有服务

```bash
# 根目录执行
turbo dev
```

或者单独启动：

```bash
# 启动后端 (端口 8000)
cd apps/backend && source venv/bin/activate && python -m uvicorn app.main:app --reload

# 启动用户端 (端口 3000)
pnpm --filter @lcaitool/frontend-user dev

# 启动管理端 (端口 3001)
pnpm --filter @lcaitool/frontend-admin dev
```

### 6. 访问地址

- 用户端: http://localhost:3000
- 管理端: http://localhost:3001
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 开发命令

```bash
# 构建所有应用
turbo build

# 代码检查
turbo lint

# 代码格式化
pnpm format

# 提交代码（自动 lint 和格式化）
git add .
git commit -m "feat: 你的提交信息"
```

## 数据库管理

### 启动 pgAdmin（可选）

```bash
docker compose --profile devtools up -d pgadmin
```

访问: http://localhost:5050
- 邮箱: admin@lcaitool.com
- 密码: admin123

## License

MIT
