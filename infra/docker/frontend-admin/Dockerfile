# ========================================
#  LCAITool Frontend Admin Dockerfile (生产模式)
# ========================================

FROM node:20-alpine AS builder

WORKDIR /app

# 启用 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制 workspace 配置和 package.json
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/frontend-admin/package.json ./apps/frontend-admin/

# 安装依赖
RUN pnpm install --frozen-lockfile || pnpm install

# 复制源码
COPY apps/frontend-admin/ ./apps/frontend-admin/

# 构建（完整类型检查 + 生产构建）
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
