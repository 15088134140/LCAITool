from fastapi import HTTPException, status
from typing import Optional, Any


class BusinessException(HTTPException):
    """业务异常基类"""
    def __init__(
        self,
        detail: str = "业务操作失败",
        error_code: Optional[str] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        headers: Optional[dict] = None
    ):
        self.error_code = error_code
        self.headers = headers
        super().__init__(
            status_code=status_code,
            detail=detail,
            headers=headers
        )


class ValidationException(HTTPException):
    """数据验证异常"""
    def __init__(
        self,
        detail: str = "数据验证失败",
        error_code: Optional[str] = "VALIDATION_ERROR",
        validation_errors: Optional[Any] = None,
        status_code: int = status.HTTP_422_UNPROCESSABLE_ENTITY,
        headers: Optional[dict] = None
    ):
        self.error_code = error_code
        self.validation_errors = validation_errors
        self.headers = headers
        super().__init__(
            status_code=status_code,
            detail=detail,
            headers=headers
        )


class IdempotentTokenException(HTTPException):
    """幂等性Token异常"""
    def __init__(
        self,
        detail: str = "幂等性Token无效",
        error_code: Optional[str] = "IDEMPOTENT_TOKEN_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ):
        self.error_code = error_code
        super().__init__(
            status_code=status_code,
            detail=detail
        )


class UserAlreadyExistsException(HTTPException):
    def __init__(self, detail: str = "该手机号已注册"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


class UserNotFoundException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )


class InvalidCredentialsException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )


class InvalidTokenException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )


class InsufficientPermissionsException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足",
        )


class InvalidVerificationCodeException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码错误",
        )


class TokenExpiredException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )


class InsufficientBalanceException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="积分余额不足",
        )


class OptimisticLockException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="数据已被修改，请刷新后重试",
        )


class InvalidIdCardFormatException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="身份证号格式不正确",
        )
