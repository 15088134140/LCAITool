"""
数据库兼容性功能
提供PostgreSQL和SQLite之间的兼容性层
"""
from sqlalchemy import Text, TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB
import json


class JSONType(TypeDecorator):
    """
    兼容PostgreSQL JSONB和SQLite Text的JSON类型

    在PostgreSQL中使用JSONB，在SQLite中使用Text（存储JSON字符串）
    """
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == 'postgresql':
            return value
        return json.dumps(value, ensure_ascii=False)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                pass
        return value
