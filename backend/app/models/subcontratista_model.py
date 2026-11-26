from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Subcontratista(Base):
    __tablename__ = "subcontratistas"

    id = Column(Integer, primary_key=True, index=True)
    proyecto_id = Column(Integer, ForeignKey("proyectos_obra.id", ondelete="CASCADE"), nullable=False)
    nombre_empresa = Column(String(150), nullable=False)
    nit = Column(String(50), nullable=False)
    fecha_vencimiento_poliza = Column(Date, nullable=False)
    fecha_vencimiento_ss = Column(Date, nullable=False)
    estado = Column(String(50), nullable=False, default="Activo")
    fecha_eliminacion = Column(DateTime, nullable=True, default=None)

    proyecto = relationship("ProyectoObra", back_populates="subcontratistas")
