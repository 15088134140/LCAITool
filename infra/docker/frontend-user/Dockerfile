# ========================================
#  LCAITool Frontend User (Next.js) Dockerfile
# ========================================

FROM node:20-alpine AS builder

WORKDIR /app

# 启用 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制 workspace 配置和 package.json
COPY package.json pnpm-workspace.yaml ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/tailwind-config/package.json ./packages/tailwind-config/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/frontend-user/package.json ./apps/frontend-user/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY packages/ui/ ./packages/ui/
COPY packages/tailwind-config/ ./packages/tailwind-config/
COPY apps/frontend-user/ ./apps/frontend-user/

# 构建 (Next.js standalone 模式)
RUN pnpm --filter @lcaitool/frontend-user run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# 从 builder 复制 standalone 构建产物
COPY --from=builder /app/apps/frontend-user/.next/standalone ./
COPY --from=builder /app/apps/frontend-user/.next/static ./apps/frontend-user/.next/static
COPY --from=builder /app/apps/frontend-user/public ./apps/frontend-user/public

EXPOSE 3000

# 启动 Next.js
CMD ["node", "apps/frontend-user/server.js"]
