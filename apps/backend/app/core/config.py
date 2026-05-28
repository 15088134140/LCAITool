from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    DATABASE_URL: str
    REDIS_URL: str

    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    PUBLIC_URL: str = "http://localhost:8000"
    """公开访问地址，用于构造可外部访问的完整 URL，如绘本 HTML 中的图片地址"""

    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "灵创AI工具箱"

    STORAGE_DIR: str = "./storage"
    WORKS_DIR: str = "./storage/works"
    EXTERNAL_STORAGE_DIR: str = "./storage/external"

    # AES-256 加密密钥（用于身份证号等敏感信息加密，32字节Hex格式）
    AES_ENCRYPTION_KEY: str = ""

    INTERNAL_API_TOKEN: str = ""


settings = Settings()
