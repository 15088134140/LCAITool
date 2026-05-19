from typing import Generic, TypeVar, Optional
from pydantic import BaseModel, Field

T = TypeVar("T")


class Response(BaseModel, Generic[T]):
    """统一响应格式"""
    code: int = Field(..., description="状态码：200成功，400参数错误，401未授权，403权限不足，404不存在，500服务器错误")
    message: str = Field(..., description="消息")
    data: Optional[T] = Field(None, description="数据")

    @classmethod
    def success(cls, data: T = None, message: str = "操作成功") -> "Response[T]":
        return cls(code=200, message=message, data=data)

    @classmethod
    def error(cls, code: int = 400, message: str = "操作失败") -> "Response[T]":
        return cls(code=code, message=message, data=None)


class PaginationParams(BaseModel):
    """分页参数"""
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")


class PaginatedResponse(BaseModel, Generic[T]):
    """分页响应"""
    items: list[T]
    total: int
    page: int
    page_size: int
