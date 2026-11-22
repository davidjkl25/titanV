"""Armado y validación de los datos del reporte de obra.

Este servicio no depende de FastAPI: recibe la sesión, el usuario autenticado y
las opciones ya validadas por el router, y devuelve un objeto inmutable con todo
lo necesario para generar el PDF o el Excel. Las reglas de acceso por rol también
viven aquí para que no se puedan evadir cambiando el generador.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, time
from typing import Dict, List, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.core.soft_delete import sin_eliminados
from app.models import (
    Comentario,
    EvidenciaMultimedia,
    HistorialMovimiento,
    InventarioObra,
    Material,
    ProyectoObra,
    RolProyecto,
    Tarea,
    TurnoRelevo,
    Usuario,
)
from app.services import proyecto_service
from app.services.bitacora_utils import formatear_fecha, nombre_completo, texto

ETIQUETAS_MODULOS = {
    "tareas": "Tareas (completadas, en proceso y pendientes)",
    "evidencias": "Registro fotográfico / Evidencias",
    "turnos": "Turnos y asistencia del personal",
    "materiales": "Consumo de materiales e insumos",
}


@dataclass
class ComentarioReporte:
    fecha: str
    autor: str
    contenido: str


@dataclass
class TareaReporte:
    id: int
    nombre: str
    descripcion: str
    estado: str
    responsable: str
    fecha_asignacion: str
    fecha_inicio: str
    fecha_fin_estimada: str
    comentarios: List[ComentarioReporte] = field(default_factory=list)


@dataclass
class EvidenciaReporte:
    id: int
    tarea: str
    descripcion: str
    nombre_archivo: str
    ruta_archivo: str
    fecha_subida: str
    fecha_subida_dt: Optional[datetime]
    usuario: str


@dataclass
class TurnoReporte:
    id: int
    fecha: str
    hora_inicio: str
    hora_fin: str
    usuario: str
    estado_asistencia: str


@dataclass
class MovimientoReporte:
    id: int
    fecha: str
    material: str
    unidad_medida: str
    tipo_movimiento: str
    cantidad: float
    usuario: str


@dataclass
class InventarioReporte:
    material: str
    unidad_medida: str
    cantidad_inicial: float
    cantidad_disponible: float


@dataclass
class DatosReporteObra:
    proyecto: ProyectoObra
    usuario: Usuario
    rol: RolProyecto
    fecha_inicio: Optional[date]
    fecha_fin: Optional[date]
    generado_en: datetime
    modulos: Dict[str, bool]
    etiquetas_modulos: Dict[str, str]
    tareas: List[TareaReporte] = field(default_factory=list)
    evidencias: List[EvidenciaReporte] = field(default_factory=list)
    turnos: List[TurnoReporte] = field(default_factory=list)
    movimientos: List[MovimientoReporte] = field(default_factory=list)
    inventario: List[InventarioReporte] = field(default_factory=list)

    @property
    def periodo(self) -> str:
        if self.fecha_inicio and self.fecha_fin:
            return f"{formatear_fecha(self.fecha_inicio)} al {formatear_fecha(self.fecha_fin)}"
        if self.fecha_inicio:
            return f"Desde {formatear_fecha(self.fecha_inicio)}"
        if self.fecha_fin:
            return f"Hasta {formatear_fecha(self.fecha_fin)}"
        return "Todo el proyecto"


def validar_opciones_reporte(
    rol: RolProyecto,
    formato: str,
    fecha_inicio: Optional[date],
    fecha_fin: Optional[date],
    incluir_tareas: bool,
    incluir_evidencias: bool,
    incluir_turnos: bool,
    incluir_materiales: bool,
) -> Dict[str, bool]:
    """Normaliza el formato y aplica las restricciones por rol.

    ValueError: opciones inválidas (sin módulos o rango invertido).
    PermissionError: el rol intenta acceder a un módulo o formato prohibido.
    """
    formato_normalizado = "excel" if formato == "xlsx" else formato
    modulos = {
        "tareas": bool(incluir_tareas),
        "evidencias": bool(incluir_evidencias),
        "turnos": bool(incluir_turnos),
        "materiales": bool(incluir_materiales),
    }

    if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
        raise ValueError("La fecha de fin no puede ser anterior a la fecha de inicio.")

    if not any(modulos.values()):
        raise ValueError("Selecciona al menos un módulo para generar el reporte.")

    if rol == RolProyecto.VISUALIZADOR:
        if formato_normalizado != "pdf":
            raise PermissionError(
                "El rol Visualizador solo puede exportar reportes de avance y evidencias en PDF."
            )
        if modulos["turnos"] or modulos["materiales"]:
            raise PermissionError(
                "El rol Visualizador solo puede incluir tareas y evidencias; "
                "los datos de asistencia e inventario son internos."
            )

    return modulos


def _inicio_datetime(fecha: Optional[date]) -> Optional[datetime]:
    return datetime.combine(fecha, time.min) if fecha else None


def _fin_datetime(fecha: Optional[date]) -> Optional[datetime]:
    return datetime.combine(fecha, time.max) if fecha else None


def generar_datos_reporte(
    db: Session,
    proyecto_id: int,
    usuario: Usuario,
    rol: RolProyecto,
    modulos: Dict[str, bool],
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
) -> DatosReporteObra:
    """Consulta solo el proyecto autorizado y ensambla el reporte completo.

    Los listados no usan el `limit=100` de los endpoints normales: un corte de
    obra debe incluir TODO el periodo seleccionado.
    """
    proyecto = proyecto_service.obtener_proyecto(db, proyecto_id)
    if not proyecto:
        raise ValueError("Proyecto no encontrado.")

    datos = DatosReporteObra(
        proyecto=proyecto,
        usuario=usuario,
        rol=rol,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        generado_en=datetime.now(),
        modulos=modulos,
        etiquetas_modulos=ETIQUETAS_MODULOS,
    )

    if modulos["tareas"]:
        datos.tareas = _obtener_tareas(db, proyecto_id, fecha_inicio, fecha_fin)

    if modulos["evidencias"]:
        datos.evidencias = _obtener_evidencias(db, proyecto_id, fecha_inicio, fecha_fin)

    if modulos["turnos"]:
        datos.turnos = _obtener_turnos(db, proyecto_id, fecha_inicio, fecha_fin)

    if modulos["materiales"]:
        datos.movimientos = _obtener_movimientos(db, proyecto_id, fecha_inicio, fecha_fin)
        datos.inventario = _obtener_inventario(db, proyecto_id)

    return datos


def _obtener_tareas(
    db: Session, proyecto_id: int, fecha_inicio: Optional[date], fecha_fin: Optional[date]
) -> List[TareaReporte]:
    query = db.query(Tarea).filter(
        Tarea.proyecto_id == proyecto_id,
        Tarea.fecha_eliminacion.is_(None),
    )

    # Una tarea entra al corte si alguna de sus fechas de seguimiento cae en el
    # rango; así no se pierden tareas iniciadas antes y cerradas dentro del corte.
    campos_fecha = (Tarea.fecha_asignacion, Tarea.fecha_inicio, Tarea.fecha_fin_estimada)
    if fecha_inicio and fecha_fin:
        query = query.filter(
            or_(*(and_(campo >= fecha_inicio, campo <= fecha_fin) for campo in campos_fecha))
        )
    elif fecha_inicio:
        query = query.filter(or_(*(campo >= fecha_inicio for campo in campos_fecha)))
    elif fecha_fin:
        query = query.filter(or_(*(campo <= fecha_fin for campo in campos_fecha)))

    tareas = query.order_by(Tarea.fecha_asignacion.asc(), Tarea.id.asc()).all()
    if not tareas:
        return []

    comentarios = (
        db.query(Comentario)
        .join(Tarea, Comentario.tarea_id == Tarea.id)
        .filter(
            Tarea.proyecto_id == proyecto_id,
            Tarea.fecha_eliminacion.is_(None),
            Comentario.fecha_eliminacion.is_(None),
        )
        .order_by(Comentario.fecha_comentario.asc())
        .all()
    )
    por_tarea: Dict[int, List[ComentarioReporte]] = defaultdict(list)
    for comentario in comentarios:
        por_tarea[comentario.tarea_id].append(
            ComentarioReporte(
                fecha=formatear_fecha(comentario.fecha_comentario, con_hora=True),
                autor=nombre_completo(comentario.usuario),
                contenido=texto(comentario.contenido),
            )
        )

    return [
        TareaReporte(
            id=tarea.id,
            nombre=texto(tarea.nombre_tarea),
            descripcion=texto(tarea.descripcion),
            estado=texto(tarea.estado),
            responsable=nombre_completo(tarea.operario),
            fecha_asignacion=formatear_fecha(tarea.fecha_asignacion),
            fecha_inicio=formatear_fecha(tarea.fecha_inicio),
            fecha_fin_estimada=formatear_fecha(tarea.fecha_fin_estimada),
            comentarios=por_tarea.get(tarea.id, []),
        )
        for tarea in tareas
    ]


def _obtener_evidencias(
    db: Session, proyecto_id: int, fecha_inicio: Optional[date], fecha_fin: Optional[date]
) -> List[EvidenciaReporte]:
    query = (
        db.query(EvidenciaMultimedia)
        .join(Tarea, EvidenciaMultimedia.tarea_id == Tarea.id)
        .filter(
            Tarea.proyecto_id == proyecto_id,
            Tarea.fecha_eliminacion.is_(None),
            EvidenciaMultimedia.fecha_eliminacion.is_(None),
        )
    )

    inicio_dt = _inicio_datetime(fecha_inicio)
    fin_dt = _fin_datetime(fecha_fin)
    if inicio_dt:
        query = query.filter(EvidenciaMultimedia.fecha_subida >= inicio_dt)
    if fin_dt:
        query = query.filter(EvidenciaMultimedia.fecha_subida <= fin_dt)

    evidencias = query.order_by(EvidenciaMultimedia.fecha_subida.asc()).all()
    return [
        EvidenciaReporte(
            id=evidencia.id,
            tarea=texto(evidencia.tarea.nombre_tarea) if evidencia.tarea else "—",
            descripcion=texto(evidencia.descripcion) or texto(evidencia.nombre_archivo),
            nombre_archivo=texto(evidencia.nombre_archivo),
            ruta_archivo=texto(evidencia.ruta_archivo),
            fecha_subida=formatear_fecha(evidencia.fecha_subida, con_hora=True),
            fecha_subida_dt=evidencia.fecha_subida,
            usuario=nombre_completo(evidencia.usuario),
        )
        for evidencia in evidencias
    ]


def _obtener_turnos(
    db: Session, proyecto_id: int, fecha_inicio: Optional[date], fecha_fin: Optional[date]
) -> List[TurnoReporte]:
    query = sin_eliminados(
        db.query(TurnoRelevo).filter(TurnoRelevo.proyecto_id == proyecto_id), TurnoRelevo
    )
    if fecha_inicio:
        query = query.filter(TurnoRelevo.fecha_turno >= fecha_inicio)
    if fecha_fin:
        query = query.filter(TurnoRelevo.fecha_turno <= fecha_fin)

    turnos = query.order_by(TurnoRelevo.fecha_turno.asc(), TurnoRelevo.hora_inicio.asc()).all()
    return [
        TurnoReporte(
            id=turno.id,
            fecha=formatear_fecha(turno.fecha_turno),
            hora_inicio=formatear_fecha(turno.hora_inicio),
            hora_fin=formatear_fecha(turno.hora_fin),
            usuario=nombre_completo(turno.usuario),
            estado_asistencia=texto(turno.estado_asistencia) or "—",
        )
        for turno in turnos
    ]


def _obtener_movimientos(
    db: Session, proyecto_id: int, fecha_inicio: Optional[date], fecha_fin: Optional[date]
) -> List[MovimientoReporte]:
    query = db.query(HistorialMovimiento).filter(HistorialMovimiento.proyecto_id == proyecto_id)

    inicio_dt = _inicio_datetime(fecha_inicio)
    fin_dt = _fin_datetime(fecha_fin)
    if inicio_dt:
        query = query.filter(HistorialMovimiento.fecha_movimiento >= inicio_dt)
    if fin_dt:
        query = query.filter(HistorialMovimiento.fecha_movimiento <= fin_dt)

    movimientos = query.order_by(HistorialMovimiento.fecha_movimiento.asc()).all()
    return [
        MovimientoReporte(
            id=movimiento.id,
            fecha=formatear_fecha(movimiento.fecha_movimiento, con_hora=True),
            material=texto(movimiento.material.nombre_material) if movimiento.material else "—",
            unidad_medida=texto(movimiento.material.unidad_medida) if movimiento.material else "",
            tipo_movimiento=texto(movimiento.tipo_movimiento),
            cantidad=float(movimiento.cantidad or 0),
            usuario=nombre_completo(movimiento.usuario),
        )
        for movimiento in movimientos
    ]


def _obtener_inventario(db: Session, proyecto_id: int) -> List[InventarioReporte]:
    filas = (
        db.query(InventarioObra, Material)
        .outerjoin(Material, InventarioObra.material_id == Material.id)
        .filter(InventarioObra.proyecto_id == proyecto_id)
        .order_by(Material.nombre_material.asc())
        .all()
    )
    return [
        InventarioReporte(
            material=texto(material.nombre_material) if material else "Material sin nombre",
            unidad_medida=texto(material.unidad_medida) if material else "",
            cantidad_inicial=float(material.cantidad_inicial or 0) if material else 0.0,
            cantidad_disponible=float(inventario.cantidad_disponible or 0),
        )
        for inventario, material in filas
        if material is None or material.fecha_eliminacion is None
    ]
