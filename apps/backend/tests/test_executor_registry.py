"""
执行器注册表单元测试
覆盖 canonical key、legacy alias 与列表输出。
"""


def test_get_executor_class_by_canonical_key():
    """按 canonical executor_key 获取执行器类"""
    from app.executors.registry import get_executor_class
    from app.executors.storybook import StorybookExecutor

    assert get_executor_class("storybook-generator") is StorybookExecutor


def test_get_executor_class_by_legacy_alias():
    """按历史别名获取执行器类"""
    from app.executors.registry import get_executor_class
    from app.executors.ecommerce import EcommerceExecutor
    from app.executors.marketing import MarketingExecutor

    assert get_executor_class("ecommerce") is EcommerceExecutor
    assert get_executor_class("marketing") is MarketingExecutor


def test_resolve_executor_key_returns_canonical_key():
    """legacy alias 会解析为 canonical executor_key"""
    from app.executors.registry import resolve_executor_key

    assert resolve_executor_key("ecommerce") == "ecommerce-detail"
    assert resolve_executor_key("marketing") == "product-description"
    assert resolve_executor_key("product-description") == "product-description"
    assert resolve_executor_key("unknown") is None


def test_list_executors_excludes_executor_class():
    """执行器列表只返回前端需要的元信息，不暴露 class 对象"""
    from app.executors.registry import list_executors

    executors = list_executors()

    assert {item["key"] for item in executors} == {
        "storybook-generator",
        "ecommerce-detail",
        "product-description",
        "creative-video-generator",
    }
    assert all("class" not in item for item in executors)


def test_get_executor_class_creative_video_generator():
    """creative-video-generator 执行器类正确注册"""
    from app.executors.registry import get_executor_class, resolve_executor_key
    from app.executors.creative_video import CreativeVideoExecutor

    assert resolve_executor_key("creative-video-generator") == "creative-video-generator"
    assert get_executor_class("creative-video-generator") is CreativeVideoExecutor
