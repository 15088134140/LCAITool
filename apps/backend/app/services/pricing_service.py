"""
计价服务 PricingService
根据 tool.pricing_schema 和工具级单价字段计算任务费用。
"""
import json
import math
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class PricingBreakdownItem:
    """计价明细项"""
    key: str
    label: str
    amount: int
    quantity: int
    unit_amount: int
    amount_ref: Optional[str] = None
    unit_amount_ref: Optional[str] = None


@dataclass
class PricingResult:
    """计价结果"""
    total: int
    currency: str = "credits"
    breakdown: list = field(default_factory=list)
    warnings: list = field(default_factory=list)


class PricingNotConfiguredError(Exception):
    """pricing_schema 未配置时抛出，调用方应回退到执行器 estimate_cost"""
    pass


class PricingService:
    """基于 pricing_schema 的计价引擎"""

    # 可引用的工具级单价字段白名单
    WHITELIST_REFS = {"base_fee", "image_fee", "audio_fee", "token_fee"}

    @staticmethod
    def estimate_tool_cost(tool, input_params: dict) -> PricingResult:
        """
        根据 tool.pricing_schema 计算费用。

        Args:
            tool: Tool 模型实例（需有 base_fee/image_fee/audio_fee/token_fee 和 pricing_schema 属性）
            input_params: 用户提交的输入参数

        Returns:
            PricingResult: 包含 total、breakdown、warnings

        Raises:
            PricingNotConfiguredError: pricing_schema 为空或无效
            ValueError: amount_ref/unit_amount_ref 不在白名单中
        """
        if not tool or not getattr(tool, 'pricing_schema', None):
            raise PricingNotConfiguredError("工具未配置 pricing_schema")

        schema = tool.pricing_schema
        if isinstance(schema, str):
            schema = json.loads(schema)

        version = schema.get("version")
        if version != 1:
            raise PricingNotConfiguredError(f"不支持的 pricing_schema 版本: {version}")

        currency = schema.get("currency", "credits")
        rounding = schema.get("rounding", "ceil")
        min_total = schema.get("min_total", 0)
        max_total = schema.get("max_total")

        breakdown = []
        warnings = []
        total = 0

        for item in schema.get("items", []):
            item_type = item.get("type")
            item_key = item.get("key")
            item_label = item.get("label", item_key)

            # 条件判断：when 不满足时跳过此计价项
            when = item.get("when")
            if when and not PricingService._evaluate_when(when, input_params):
                continue

            if item_type == "fixed":
                amount_ref = item.get("amount_ref")
                PricingService._validate_ref(amount_ref)
                unit_amount = getattr(tool, amount_ref, 0) or 0
                amount = unit_amount
                breakdown.append(PricingBreakdownItem(
                    key=item_key, label=item_label, amount=amount,
                    quantity=1, unit_amount=unit_amount, amount_ref=amount_ref
                ))
                total += amount

            elif item_type == "per_unit":
                field = item.get("field")
                unit_amount_ref = item.get("unit_amount_ref")
                PricingService._validate_ref(unit_amount_ref)
                unit_amount = getattr(tool, unit_amount_ref, 0) or 0

                quantity = input_params.get(field)
                if quantity is None:
                    quantity = item.get("default_quantity", 1)
                    warnings.append(f"字段 '{field}' 值为空，按默认值 {quantity} 预估")

                min_q = item.get("min_quantity")
                max_q = item.get("max_quantity")
                if min_q is not None and quantity < min_q:
                    quantity = min_q
                if max_q is not None and quantity > max_q:
                    quantity = max_q

                unit_size = item.get("unit_size", 1)
                if unit_size > 1:
                    effective_quantity = max(1, (quantity + unit_size - 1) // unit_size)
                else:
                    effective_quantity = quantity

                amount = effective_quantity * unit_amount
                breakdown.append(PricingBreakdownItem(
                    key=item_key, label=item_label, amount=amount,
                    quantity=quantity, unit_amount=unit_amount,
                    unit_amount_ref=unit_amount_ref
                ))
                total += amount

        # 应用舍入规则
        if rounding == "ceil":
            total = math.ceil(total)
        elif rounding == "floor":
            total = math.floor(total)
        else:
            total = round(total)

        # 应用 min/max 限制
        if min_total is not None and total < min_total:
            total = min_total
        if max_total is not None and total > max_total:
            total = max_total

        return PricingResult(total=total, currency=currency, breakdown=breakdown, warnings=warnings)

    @staticmethod
    def _validate_ref(ref: str) -> None:
        """校验价格引用是否在白名单中"""
        if ref not in PricingService.WHITELIST_REFS:
            raise ValueError(f"价格引用 '{ref}' 不在白名单 {PricingService.WHITELIST_REFS} 中")

    @staticmethod
    def _evaluate_when(when: dict, input_params: dict) -> bool:
        """评估 when 条件"""
        field = when.get("field")
        operator = when.get("operator", "eq")
        expected = when.get("value")

        actual = input_params.get(field)

        if operator == "eq":
            return actual == expected
        elif operator == "ne":
            return actual != expected
        elif operator == "gt":
            return actual is not None and actual > expected
        elif operator == "gte":
            return actual is not None and actual >= expected
        elif operator == "lt":
            return actual is not None and actual < expected
        elif operator == "lte":
            return actual is not None and actual <= expected
        elif operator == "in":
            return actual in expected if expected else False
        elif operator == "not_in":
            return actual not in expected if expected else True
        elif operator == "truthy":
            return bool(actual)
        elif operator == "falsy":
            return not bool(actual)
        return True
