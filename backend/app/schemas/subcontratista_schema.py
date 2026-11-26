from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class SubcontratistaBase(BaseModel):
    nombre_empresa: str = Field(..., max_length=150)
    nit: str = Field(..., max_length=50)
    fecha_vencimiento_poliza: date
    fecha_vencimiento_ss: date
    estado: str = Field("Activo", max_length=50)


class SubcontratistaCreate(SubcontratistaBase):
    proyecto_id: int


class SubcontratistaUpdate(BaseModel):
    nombre_empresa: Optional[str] = Field(None, max_length=150)
    nit: Optional[str] = Field(None, max_length=50)
    fecha_vencimiento_poliza: Optional[date] = None
    fecha_vencimiento_ss: Optional[date] = None
    estado: Optional[str] = Field(None, max_length=50)


class SubcontratistaResponse(SubcontratistaBase):
    id: int
    proyecto_id: int

    class Config:
        from_attributes = True
