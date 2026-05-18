from datetime import datetime
from sqlalchemy import Column, DateTime
from app.core.database import Base


class BaseModel(Base):
    __abstract__ = True

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, comment="更新时间")
