import time
from sqlalchemy import Column, Integer
from app.core.database import Base


class BaseModel(Base):
    __abstract__ = True

    created_at = Column(Integer, default=lambda: int(time.time()), nullable=False, comment="创建时间")
    updated_at = Column(Integer, default=lambda: int(time.time()), onupdate=lambda: int(time.time()), nullable=False, comment="更新时间")
