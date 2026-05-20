"""
统一响应格式模块
提供标准化的 API 响应包装器
"""
from typing import Generic, TypeVar, Optional, Any
from datetime import datetime
import uuid
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
from fastapi import Request, status

T = TypeVar('T')


class ResponseModel(BaseModel, Generic[T]):
    """统一响应模型"""
    code: int = Field(..., description="响应状态码，200表示成功")
    message: str = Field(..., description="响应消息")
    data: Optional[T] = Field(None, description="响应数据")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="响应时间戳")
    request_id: Optional[str] = Field(None, description="请求ID，用于追踪")


class SuccessResponse(ResponseModel[T], Generic[T]):
    """成功响应"""
    code: int = Field(status.HTTP_200_OK, description="成功状态码，固定为200")


class ErrorResponse(ResponseModel[T], Generic[T]):
    """错误响应"""
    error_code: Optional[str] = Field(None, description="业务错误码")
    details: Optional[Any] = Field(None, description="详细错误信息")


def success_response(
    data: Any = None,
    message: str = "操作成功",
    request_id: Optional[str] = None,
    status_code: int = status.HTTP_200_OK
) -> JSONResponse:
    """
    生成成功响应

    Args:
        data: 响应数据
        message: 响应消息
        request_id: 请求ID
        status_code: HTTP状态码

    Returns:
        JSONResponse: FastAPI JSON响应对象
    """
    response = SuccessResponse(
        code=status_code,
        message=message,
        data=data,
        request_id=request_id
    )
    return JSONResponse(
        status_code=status_code,
        content=response.model_dump(mode='json')
    )


def error_response(
    code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    message: str = "服务器内部错误",
    error_code: Optional[str] = None,
    details: Any = None,
    data: Any = None,
    request_id: Optional[str] = None
) -> JSONResponse:
    """
    生成错误响应

    Args:
        code: HTTP状态码
        message: 错误消息
        error_code: 业务错误码
        details: 详细错误信息
        data: 附加数据
        request_id: 请求ID

    Returns:
        JSONResponse: FastAPI JSON响应对象
    """
    response = ErrorResponse(
        code=code,
        message=message,
        error_code=error_code,
        details=details,
        data=data,
        request_id=request_id
    )
    return JSONResponse(
        status_code=code,
        content=response.model_dump(mode='json')
    )


def ok(data: Any = None, message: str = "操作成功", request_id: Optional[str] = None) -> JSONResponse:
    """快捷成功响应"""
    return success_response(data=data, message=message, request_id=request_id)


def created(data: Any = None, message: str = "创建成功", request_id: Optional[str] = None) -> JSONResponse:
    """创建成功响应"""
    return success_response(
        data=data,
        message=message,
        request_id=request_id,
        status_code=status.HTTP_201_CREATED
    )


def bad_request(
    message: str = "请求参数错误",
    error_code: Optional[str] = "BAD_REQUEST",
    details: Any = None,
    request_id: Optional[str] = None
) -> JSONResponse:
    """400错误响应"""
    return error_response(
        code=status.HTTP_400_BAD_REQUEST,
        message=message,
        error_code=error_code,
        details=details,
        request_id=request_id
    )


def unauthorized(
    message: str = "未授权访问",
    error_code: Optional[str] = "UNAUTHORIZED",
    details: Any = None,
    request_id: Optional[str] = None
) -> JSONResponse:
    """401错误响应"""
    return error_response(
        code=status.HTTP_401_UNAUTHORIZED,
        message=message,
        error_code=error_code,
        details=details,
        request_id=request_id
    )


def forbidden(
    message: str = "禁止访问",
    error_code: Optional[str] = "FORBIDDEN",
    details: Any = None,
    request_id: Optional[str] = None
) -> JSONResponse:
    """403错误响应"""
    return error_response(
        code=status.HTTP_403_FORBIDDEN,
        message=message,
        error_code=error_code,
        details=details,
        request_id=request_id
    )


def not_found(
    message: str = "资源不存在",
    error_code: Optional[str] = "NOT_FOUND",
    details: Any = None,
    request_id: Optional[str] = None
) -> JSONResponse:
    """404错误响应"""
    return error_response(
        code=status.HTTP_404_NOT_FOUND,
        message=message,
        error_code=error_code,
        details=details,
        request_id=request_id
    )


def conflict(
    message: str = "资源冲突",
    error_code: Optional[str] = "CONFLICT",
    details: Any = None,
    request_id: Optional[str] = None
) -> JSONResponse:
    """409错误响应"""
    return error_response(
        code=status.HTTP_409_CONFLICT,
        message=message,
        error_code=error_code,
        details=details,
        request_id=request_id
    )


def internal_server_error(
    message: str = "服务器内部错误",
    error_code: Optional[str] = "INTERNAL_ERROR",
    details: Any = None,
    request_id: Optional[str] = None
) -> JSONResponse:
    """500错误响应"""
    return error_response(
        code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message=message,
        error_code=error_code,
        details=details,
        request_id=request_id
    )


def get_request_id(request: Request) -> str:
    """从请求中获取请求ID"""
    return getattr(request.state, "request_id", str(uuid.uuid4()))
