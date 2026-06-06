"""
Celery 任务执行器解析测试
覆盖工具 executor_key 优先、空值回退与 legacy alias 解析。
"""
from types import SimpleNamespace

from app.executors.ecommerce import EcommerceExecutor
from app.executors.marketing import MarketingExecutor
from app.executors.storybook import StorybookExecutor


class FallbackExecutor:
    """测试用 fallback 执行器"""


def test_resolve_executor_class_prefers_tool_executor_key():
    """工具配置了 executor_key 时优先使用工具绑定的执行器"""
    from app.workers.tasks import _resolve_executor_class

    tool = SimpleNamespace(executor_key="ecommerce-detail")

    assert _resolve_executor_class(tool, StorybookExecutor) is EcommerceExecutor


def test_resolve_executor_class_falls_back_without_executor_key():
    """工具未配置 executor_key 时回退到 task_type 对应的执行器"""
    from app.workers.tasks import _resolve_executor_class

    tool = SimpleNamespace(executor_key=None)

    assert _resolve_executor_class(tool, FallbackExecutor) is FallbackExecutor


def test_resolve_executor_class_supports_legacy_alias():
    """工具 executor_key 使用 legacy alias 时解析到 canonical 执行器"""
    from app.workers.tasks import _resolve_executor_class

    tool = SimpleNamespace(executor_key="marketing")

    assert _resolve_executor_class(tool, StorybookExecutor) is MarketingExecutor


def test_resolve_executor_class_falls_back_for_unknown_executor_key():
    """未知 executor_key 不阻断任务，回退到传入执行器"""
    from app.workers.tasks import _resolve_executor_class

    tool = SimpleNamespace(executor_key="unknown-executor")

    assert _resolve_executor_class(tool, FallbackExecutor) is FallbackExecutor


def test_resolve_initial_executor_class_uses_registry_alias_before_legacy_map():
    """execute_tool_task 初始解析支持 registry alias，作为工具配置覆盖前的 fallback"""
    from app.workers.tasks import _resolve_initial_executor_class

    assert _resolve_initial_executor_class("ecommerce") is EcommerceExecutor
    assert _resolve_initial_executor_class("storybook-generator") is StorybookExecutor
