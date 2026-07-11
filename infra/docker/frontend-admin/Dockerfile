# ========================================
#  LCAITool Frontend Admin Dockerfile
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
COPY apps/frontend-admin/package.json ./apps/frontend-admin/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY packages/ui/ ./packages/ui/
COPY packages/tailwind-config/ ./packages/tailwind-config/
COPY apps/frontend-admin/ ./apps/frontend-admin/

# 构建
RUN pnpm --filter @lcaitool/frontend-admin run build

# Production stage
FROM nginx:alpine AS production

# 复制 Nginx 配置
COPY infra/docker/frontend-admin/nginx.conf /etc/nginx/nginx.conf
COPY infra/docker/frontend-admin/default.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/apps/frontend-admin/dist /usr/share/nginx/html

# 创建必要目录
RUN mkdir -p /var/cache/nginx/client_temp \
    && chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
