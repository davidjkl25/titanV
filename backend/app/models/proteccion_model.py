from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class IntentoAcceso(Base):
    __tablename__ = "intentos_acceso"

    id = Column(Integer, primary_key=True, index=True)
    clave_hash = Column(String(64), nullable=False, index=True)
    fecha = Column(DateTime, server_default=func.now(), nullable=False, index=True)
