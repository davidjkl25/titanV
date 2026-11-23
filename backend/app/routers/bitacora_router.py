"""Endpoint centralizado de exportación de la bitácora / reportes de obra."""

from datetime import date, datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import verificar_rol_proyecto
from app.models import RolProyecto, Usuario
from app.services import bitacora_datos_service, bitacora_excel_service, bitacora_pdf_service, proyecto_service
from app.services.bitacora_utils import nombre_archivo_seguro

router = APIRouter(prefix="/api/proyectos/{proyecto_id}/reportes", tags=["Reportes"])


@router.get(
    "/exportar",
    summary="Exportar bitácora de obra en PDF o Excel",
    description=(
        "Genera un reporte del proyecto activo para el rango de fechas indicado. "
        "Arquitecto: todos los módulos, PDF y Excel. Visualizador: solo tareas y "
        "evidencias en PDF. Trabajador: sin acceso. El valor 'xlsx' es alias de 'excel'."
    ),
)
def exportar_reporte_obra(
    proyecto_id: int,
    fecha_inicio: Optional[date] = Query(None, description="Fecha de inicio del corte (YYYY-MM-DD)"),
    fecha_fin: Optional[date] = Query(None, description="Fecha de fin del corte (YYYY-MM-DD)"),
    formato: Literal["pdf", "excel", "xlsx"] = Query("pdf", description="Formato de exportación"),
    incluir_tareas: bool = Query(True, description="Incluir tareas y su bitácora de comentarios"),
    incluir_evidencias: bool = Query(True, description="Incluir registro fotográfico / evidencias"),
    incluir_turnos: bool = Query(False, description="Incluir turnos y asistencia (solo Arquitecto)"),
    incluir_materiales: bool = Query(False, description="Incluir kardex e inventario (solo Arquitecto)"),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # La identidad nace del JWT y el permiso se resuelve dentro del proyecto;
    # nunca se confía en un usuario_id enviado por query string.
    if not proyecto_service.obtener_proyecto(db, proyecto_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proyecto no encontrado.")

    rol = verificar_rol_proyecto(
        db, current_user, proyecto_id, RolProyecto.ARQUITECTO, RolProyecto.VISUALIZADOR
    )

    try:
        modulos = bitacora_datos_service.validar_opciones_reporte(
            rol=rol,
            formato=formato,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            incluir_tareas=incluir_tareas,
            incluir_evidencias=incluir_evidencias,
            incluir_turnos=incluir_turnos,
            incluir_materiales=incluir_materiales,
        )
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))

    try:
        datos = bitacora_datos_service.generar_datos_reporte(
            db=db,
            proyecto_id=proyecto_id,
            usuario=current_user,
            rol=rol,
            modulos=modulos,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))

    formato_normalizado = "excel" if formato == "xlsx" else formato
    if formato_normalizado == "pdf":
        contenido = bitacora_pdf_service.generar_pdf(datos)
        extension = "pdf"
        tipo_contenido = "application/pdf"
    else:
        contenido = bitacora_excel_service.generar_excel(datos)
        extension = "xlsx"
        tipo_contenido = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    nombre_base = nombre_archivo_seguro(f"reporte_obra_{proyecto_id}_{datetime.now():%Y%m%d}")
    return Response(
        content=contenido,
        media_type=tipo_contenido,
        headers={"Content-Disposition": f'attachment; filename="{nombre_base}.{extension}"'},
    )
