#!/usr/bin/env python3
"""
Celery Worker 启动脚本
使用方法:
    # 启动默认队列的 worker
    celery -A worker worker --loglevel=info

    # 启动指定队列的 worker
    celery -A worker worker --loglevel=info -Q fast
    celery -A worker worker --loglevel=info -Q medium
    celery -A worker worker --loglevel=info -Q heavy

    # 启动 beat 调度器（用于定时任务）
    celery -A worker beat --loglevel=info
"""
import os
import sys

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.workers import celery_app

if __name__ == '__main__':
    celery_app.start()
