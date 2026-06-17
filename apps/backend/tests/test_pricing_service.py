"""
PricingService 单元测试
覆盖 fixed/per_unit/conditional/when/null处理/rounding/白名单校验
"""
import pytest
from types import SimpleNamespace

from app.services.pricing_service import (
    PricingService,
    PricingResult,
    PricingBreakdownItem,
    PricingNotConfiguredError,
)


def _make_tool(base_fee=10, image_fee=2, audio_fee=1, token_fee=0, pricing_schema=None):
    """创建 mock tool 对象"""
    return SimpleNamespace(
        base_fee=base_fee,
        image_fee=image_fee,
        audio_fee=audio_fee,
        token_fee=token_fee,
        pricing_schema=pricing_schema,
    )


class TestPricingServiceFixed:
    """fixed 类型计价项测试"""

    def test_fixed_reads_base_fee(self):
        schema = {
            "version": 1,
            "items": [
                {"key": "base", "type": "fixed", "label": "基础费", "amount_ref": "base_fee"}
            ]
        }
        tool = _make_tool(base_fee=20, pricing_schema=schema)
        result = PricingService.estimate_tool_cost(tool, {})
        assert result.total == 20
        assert len(result.breakdown) == 1
        assert result.breakdown[0].amount == 20
        assert result.breakdown[0].amount_ref == "base_fee"

    def test_fixed_with_zero_fee(self):
        schema = {
            "version": 1,
            "items": [
                {"key": "base", "type": "fixed", "label": "基础费", "amount_ref": "base_fee"}
            ]
        }
        tool = _make_tool(base_fee=0, pricing_schema=schema)
        result = PricingService.estimate_tool_cost(tool, {})
        assert result.total == 0


class TestPricingServicePerUnit:
    """per_unit 类型计价项测试"""

    def test_per_unit_basic(self):
        schema = {
            "version": 1,
            "items": [
                {"key": "images", "type": "per_unit", "label": "图片费",
                 "field": "page_count", "unit_amount_ref": "image_fee"}
            ]
        }
        tool = _make_tool(image_fee=3, pricing_schema=schema)
        result = PricingService.estimate_tool_cost(tool, {"page_count": 5})
        assert result.total == 15  # 5 * 3

    def test_per_unit_null_uses_default(self):
        schema = {
            "version": 1,
            "items": [
                {"key": "images", "type": "per_unit", "label": "图片费",
                 "field": "page_count", "unit_amount_ref": "image_fee",
                 "default_quantity": 2}
            ]
        }
        tool = _make_tool(image_fee=3, pricing_schema=schema)
        result = PricingService.estimate_tool_cost(tool, {})
        assert result.total == 6  # 2 * 3
        assert len(result.warnings) == 1
        assert "默认值" in result.warnings[0]

    def test_per_unit_min_max_clamp(self):
        schema = {
            "version": 1,
            "items": [
                {"key": "images", "type": "per_unit", "label": "图片费",
                 "field": "count", "unit_amount_ref": "image_fee",
                 "min_quantity": 1, "max_quantity": 10}
            ]
        }
        tool = _make_tool(image_fee=2, pricing_schema=schema)
        # below min
        assert PricingService.estimate_tool_cost(tool, {"count": 0}).total == 2
        # above max
        assert PricingService.estimate_tool_cost(tool, {"count": 20}).total == 20

    def test_per_unit_with_unit_size(self):
        schema = {
            "version": 1,
            "items": [
                {"key": "tokens", "type": "per_unit", "label": "Token费",
                 "field": "estimated_tokens", "unit_amount_ref": "token_fee",
                 "unit_size": 1000}
            ]
        }
        tool = _make_tool(token_fee=5, pricing_schema=schema)
        result = PricingService.estimate_tool_cost(tool, {"estimated_tokens": 2500})
        assert result.total == 15  # ceil(2500/1000) * 5 = 3 * 5


class TestPricingServiceConditional:
    """conditional when 条件测试"""

    def test_when_false_skips_item(self):
        schema = {
            "version": 1,
            "items": [
                {"key": "base", "type": "fixed", "label": "基础费", "amount_ref": "base_fee"},
                {"key": "audio", "type": "per_unit", "label": "语音费",
                 "field": "page_count", "unit_amount_ref": "audio_fee",
                 "when": {"field": "include_audio", "operator": "eq", "value": True}}
            ]
        }
        tool = _make_tool(base_fee=10, audio_fee=2, pricing_schema=schema)
        result = PricingService.estimate_tool_cost(tool, {"page_count": 5, "include_audio": False})
        assert result.total == 10  # only base_fee

    def test_when_true_includes_item(self):
        schema = {
            "version": 1,
            "items": [
                {"key": "base", "type": "fixed", "label": "基础费", "amount_ref": "base_fee"},
                {"key": "audio", "type": "per_unit", "label": "语音费",
                 "field": "page_count", "unit_amount_ref": "audio_fee",
                 "when": {"field": "include_audio", "operator": "eq", "value": True}}
            ]
        }
        tool = _make_tool(base_fee=10, audio_fee=2, pricing_schema=schema)
        result = PricingService.estimate_tool_cost(tool, {"page_count": 5, "include_audio": True})
        assert result.total == 20  # 10 + 5*2


class TestPricingServiceWhenOperators:
    """when operator 覆盖"""

    @pytest.mark.parametrize("operator,value,actual,expected_included", [
        ("eq", 5, 5, True),
        ("eq", 5, 3, False),
        ("ne", 5, 3, True),
        ("ne", 5, 5, False),
        ("gt", 5, 10, True),
        ("gt", 5, 3, False),
        ("gte", 5, 5, True),
        ("gte", 5, 3, False),
        ("lt", 5, 3, True),
        ("lt", 5, 10, False),
        ("lte", 5, 5, True),
        ("lte", 5, 10, False),
        ("in", [1, 2, 3], 2, True),
        ("in", [1, 2, 3], 4, False),
        ("not_in", [1, 2, 3], 4, True),
        ("not_in", [1, 2, 3], 2, False),
        ("truthy", None, True, True),
        ("truthy", None, False, False),
        ("falsy", None, False, True),
        ("falsy", None, True, False),
    ])
    def test_when_operator(self, operator, value, actual, expected_included):
        schema = {
            "version": 1,
            "items": [
                {"key": "base", "type": "fixed", "label": "基础费", "amount_ref": "base_fee"},
                {"key": "cond", "type": "fixed", "label": "条件费", "amount_ref": "base_fee",
                 "when": {"field": "flag", "operator": operator, "value": value}}
            ]
        }
        tool = _make_tool(base_fee=10, pricing_schema=schema)
        result = PricingService.estimate_tool_cost(tool, {"flag": actual})
        expected_total = 20 if expected_included else 10
        assert result.total == expected_total


class TestPricingServiceErrors:
    """错误处理测试"""

    def test_empty_schema_raises(self):
        tool = _make_tool(pricing_schema=None)
        with pytest.raises(PricingNotConfiguredError):
            PricingService.estimate_tool_cost(tool, {})

    def test_invalid_version_raises(self):
        tool = _make_tool(pricing_schema={"version": 99})
        with pytest.raises(PricingNotConfiguredError, match="版本"):
            PricingService.estimate_tool_cost(tool, {})

    def test_invalid_ref_raises(self):
        schema = {
            "version": 1,
            "items": [
                {"key": "bad", "type": "fixed", "label": "坏引用", "amount_ref": "not_in_whitelist"}
            ]
        }
        tool = _make_tool(pricing_schema=schema)
        with pytest.raises(ValueError, match="白名单"):
            PricingService.estimate_tool_cost(tool, {})


class TestPricingServiceRounding:
    """舍入规则测试"""

    def test_ceil_rounding(self):
        schema = {
            "version": 1,
            "rounding": "ceil",
            "items": [
                {"key": "img", "type": "per_unit", "label": "图片",
                 "field": "count", "unit_amount_ref": "image_fee"}
            ]
        }
        tool = _make_tool(image_fee=1, pricing_schema=schema)
        # 1.3 -> ceil -> 2
        result = PricingService.estimate_tool_cost(tool, {"count": 1.3})
        assert result.total == 2

    def test_floor_rounding(self):
        schema = {
            "version": 1,
            "rounding": "floor",
            "items": [
                {"key": "img", "type": "per_unit", "label": "图片",
                 "field": "count", "unit_amount_ref": "image_fee"}
            ]
        }
        tool = _make_tool(image_fee=1, pricing_schema=schema)
        result = PricingService.estimate_tool_cost(tool, {"count": 1.9})
        assert result.total == 1

    def test_min_max_total(self):
        schema = {
            "version": 1,
            "min_total": 5,
            "max_total": 50,
            "items": [
                {"key": "img", "type": "per_unit", "label": "图片",
                 "field": "count", "unit_amount_ref": "image_fee"}
            ]
        }
        tool = _make_tool(image_fee=1, pricing_schema=schema)
        assert PricingService.estimate_tool_cost(tool, {"count": 1}).total == 5  # min
        assert PricingService.estimate_tool_cost(tool, {"count": 100}).total == 50  # max


class TestBenchmarkToolPricing:
    """标杆工具 pricing_schema 示例验证"""

    def test_storybook_generator(self):
        schema = {
            "version": 1, "currency": "credits", "rounding": "ceil",
            "items": [
                {"key": "base", "type": "fixed", "label": "绘本生成基础费", "amount_ref": "base_fee"},
                {"key": "page_images", "type": "per_unit", "label": "插画生成费",
                 "field": "page_count", "unit_amount_ref": "image_fee",
                 "default_quantity": 1, "min_quantity": 1, "max_quantity": 30},
                {"key": "page_audio", "type": "per_unit", "label": "语音合成费",
                 "field": "page_count", "unit_amount_ref": "audio_fee",
                 "default_quantity": 1, "min_quantity": 1, "max_quantity": 30,
                 "when": {"field": "include_audio", "operator": "eq", "value": True}}
            ]
        }
        tool = _make_tool(base_fee=20, image_fee=2, audio_fee=3, pricing_schema=schema)
        # 5 pages, with audio
        result = PricingService.estimate_tool_cost(tool, {"page_count": 5, "include_audio": True})
        assert result.total == 45  # 20 + 5*2 + 5*3

        # 5 pages, no audio
        result = PricingService.estimate_tool_cost(tool, {"page_count": 5, "include_audio": False})
        assert result.total == 30  # 20 + 5*2

    def test_ecommerce_detail(self):
        schema = {
            "version": 1, "currency": "credits", "rounding": "ceil",
            "items": [
                {"key": "base", "type": "fixed", "label": "电商详情页基础费", "amount_ref": "base_fee"},
                {"key": "main_images", "type": "per_unit", "label": "主图生成费",
                 "field": "mainImageCount", "unit_amount_ref": "image_fee",
                 "default_quantity": 3, "min_quantity": 1, "max_quantity": 5},
                {"key": "detail_images", "type": "per_unit", "label": "详情图生成费",
                 "field": "detailImageCount", "unit_amount_ref": "image_fee",
                 "default_quantity": 3, "min_quantity": 2, "max_quantity": 10}
            ]
        }
        tool = _make_tool(base_fee=12, image_fee=1, pricing_schema=schema)
        result = PricingService.estimate_tool_cost(tool, {"mainImageCount": 3, "detailImageCount": 5})
        assert result.total == 20  # 12 + 3*1 + 5*1

    def test_product_description(self):
        schema = {
            "version": 1, "currency": "credits", "rounding": "ceil",
            "items": [
                {"key": "base", "type": "fixed", "label": "营销文案基础费", "amount_ref": "base_fee"}
            ]
        }
        tool = _make_tool(base_fee=5, pricing_schema=schema)
        result = PricingService.estimate_tool_cost(tool, {})
        assert result.total == 5
