"""种子数据标杆工具配置测试"""
import json

import pytest

from app import seed_data


class _FakeResult:
    def scalar_one_or_none(self):
        return None


class _FakeDB:
    def __init__(self):
        self.added = []

    async def execute(self, _statement):
        return _FakeResult()

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        return None


def _json_value(value):
    return json.loads(value) if isinstance(value, str) else value


@pytest.mark.asyncio
async def test_seed_tools_sets_benchmark_executor_keys_and_pricing_schema():
    """三个标杆工具补齐 canonical executor_key 与计价规则"""
    db = _FakeDB()

    await seed_data.seed_tools(db)

    tools = {tool.slug: tool for tool in db.added}

    storybook = tools["storybook-generator"]
    assert storybook.executor_key == "storybook-generator"
    storybook_pricing = _json_value(storybook.pricing_schema)
    assert storybook_pricing["items"][1]["field"] == "page_count"
    assert storybook_pricing["items"][2]["when"] == {
        "field": "include_audio",
        "operator": "eq",
        "value": True,
    }

    ecommerce = tools["ecommerce-detail"]
    assert ecommerce.executor_key == "ecommerce-detail"
    ecommerce_pricing = _json_value(ecommerce.pricing_schema)
    assert ecommerce_pricing["items"][1]["field"] == "mainImageCount"
    assert ecommerce_pricing["items"][2]["field"] == "detailImageCount"

    marketing = tools["product-description"]
    assert marketing.executor_key == "product-description"
    marketing_pricing = _json_value(marketing.pricing_schema)
    assert marketing_pricing["items"] == [
        {"key": "base", "type": "fixed", "label": "营销文案基础费", "amount_ref": "base_fee"}
    ]


@pytest.mark.asyncio
async def test_seed_tools_uses_current_dynamic_form_field_names():
    """三个标杆工具 param_schema 与当前专用表单字段保持一致"""
    db = _FakeDB()

    await seed_data.seed_tools(db)

    tools = {tool.slug: tool for tool in db.added}

    storybook_schema = _json_value(tools["storybook-generator"].param_schema)
    storybook_keys = {field["key"] for field in storybook_schema}
    assert {"inputMode", "storyContent", "voiceType", "hasBackgroundMusic", "hasSoundEffects"}.issubset(storybook_keys)
    assert "include_audio" not in storybook_keys
    assert "voice_type" not in storybook_keys

    ecommerce_schema = _json_value(tools["ecommerce-detail"].param_schema)
    ecommerce_keys = {field["key"] for field in ecommerce_schema}
    assert {"productName", "productFeatures", "mainImageCount", "detailImageCount", "includePsd"}.issubset(ecommerce_keys)
    assert "product_name" not in ecommerce_keys
    assert "main_image_count" not in ecommerce_keys

    marketing_schema = _json_value(tools["product-description"].param_schema)
    marketing_keys = {field["key"] for field in marketing_schema}
    assert {"productOrBrand", "keySellingPoints", "targetPlatform", "toneStyle", "platformCount"}.issubset(marketing_keys)
    assert "platform_count" not in marketing_keys
