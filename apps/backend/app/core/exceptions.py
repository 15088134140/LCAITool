from fastapi import HTTPException, status


class UserAlreadyExistsException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名或邮箱已存在",
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
