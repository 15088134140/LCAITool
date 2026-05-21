"""
Celery 应用配置
配置 Redis 连接、多队列优先级、任务超时等
"""
from celery import Celery
from celery.schedules import crontab
from kombu import Queue, Exchange
from app.core.config import settings

# 定义队列优先级
fast_queue = Queue(
    'fast',
    Exchange('fast'),
    routing_key='fast',
    priority=0
)

medium_queue = Queue(
    'medium',
    Exchange('medium'),
    routing_key='medium',
    priority=5
)

heavy_queue = Queue(
    'heavy',
    Exchange('heavy'),
    routing_key='heavy',
    priority=10
)

# 创建 Celery 应用
celery_app = Celery(
    'lca_itool_workers',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# 配置 Celery
celery_app.conf.update(
    # 任务序列化格式
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],

    # 时区设置
    timezone='Asia/Shanghai',
    enable_utc=True,

    # 结果过期时间（1小时）
    result_expires=3600,

    # 队列配置
    task_queues=(fast_queue, medium_queue, heavy_queue),

    # 默认队列
    task_default_queue='medium',
    task_default_exchange='medium',
    task_default_routing_key='medium',

    # 任务软超时和硬超时设置（按队列）
    task_soft_time_limit={
        'fast': 30,      # 快速任务：30秒
        'medium': 300,   # 中等任务：5分钟
        'heavy': 1800,   # 重任务：30分钟
    },
    task_time_limit={
        'fast': 60,      # 快速任务：60秒
        'medium': 600,   # 中等任务：10分钟
        'heavy': 3600,   # 重任务：60分钟
    },

    # 任务重试配置
    task_max_retries=3,
    task_default_retry_delay=30,  # 默认重试延迟（秒）

    # Worker 配置
    worker_prefetch_multiplier=1,  # 每个 worker 一次只预取一个任务
    worker_max_tasks_per_child=100,  # 每个 worker 执行 100 个任务后重启
    worker_max_memory_per_child=400000,  # 400MB 内存限制

    # 任务结果跟踪
    task_track_started=True,

    # 不忽略结果（虽然我们用 Redis Pub/Sub 实时推送，但结果仍可查询）
    task_ignore_result=False,

    # 发布任务时确认
    task_acks_late=True,
    task_acks_on_failure_or_timeout=True,

    # 任务路由（根据任务名称自动分配到不同队列）
    task_routes={
        # 文本生成类任务 -> fast 队列
        'app.workers.tasks.*text*': {'queue': 'fast'},
        # 图片生成类任务 -> medium 队列
        'app.workers.tasks.*image*': {'queue': 'medium'},
        # PDF、打包类任务 -> heavy 队列
        'app.workers.tasks.*pdf*': {'queue': 'heavy'},
        'app.workers.tasks.execute_tool_task': {'queue': 'medium'},
    },

    # 定时任务配置（示例）
    beat_schedule={
        # 每分钟检查一次超时任务
        'check-timeout-tasks': {
            'task': 'app.workers.tasks.check_timeout_tasks',
            'schedule': 60.0,
        },
        # 每天凌晨清理过期任务结果
        'cleanup-expired-results': {
            'task': 'app.workers.tasks.cleanup_expired_results',
            'schedule': crontab(hour=3, minute=0),
        },
    }
)

# 自动发现任务模块
celery_app.autodiscover_tasks(['app.workers'])
