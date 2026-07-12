# ========================================
#  LCAITool Backend Dockerfile (生产模式)
# ========================================

# Builder stage
FROM python:3.12-slim AS builder

WORKDIR /app

# 安装构建依赖（添加重试和跳过有问题的源）
RUN apt-get -o Acquire::Retries=3 update -y || true \
    && apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.12-slim AS production

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/root/.local/bin:$PATH

# 安装运行时依赖
RUN apt-get -o Acquire::Retries=3 update -y || true \
    && apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# 从 builder 复制已安装的 Python 包
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 复制源码
COPY apps/backend/ .

# 创建必要目录
RUN mkdir -p /app/storage /app/logs /app/uploads

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import httpx; response = httpx.get('http://localhost:8000/health'); assert response.status_code == 200"

EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
