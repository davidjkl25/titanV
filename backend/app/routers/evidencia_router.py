import mimetypes
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import ruta_uploads
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import verificar_rol_proyecto
from app.models import RolProyecto, Usuario
from app.schemas import EvidenciaResponse
from app.services import colaborador_service, reporte_service, tarea_service

router = APIRouter(prefix="/tareas/{tarea_id}/evidencias", tags=["Evidencias"])


def _validar_tarea(db: Session, tarea_id: int):
    tarea = tarea_service.obtener_tarea(db, tarea_id)
    if not tarea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return tarea


def _validar_acceso(db: Session, tarea_id: int, usuario: Usuario):
    tarea = _validar_tarea(db, tarea_id)
    if colaborador_service.obtener_rol_de_usuario(db, tarea.proyecto_id, usuario.id_usuario) is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No eres colaborador del proyecto de esta tarea",
        )
    return tarea


def _obtener_evidencia_de_tarea(db: Session, tarea_id: int, evidencia_id: int):
    evidencia = reporte_service.obtener_evidencia(db, evidencia_id)
    if not evidencia or evidencia.tarea_id != tarea_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidencia no encontrada")
    return evidencia


@router.get("/", response_model=List[EvidenciaResponse])
def get_evidencias(
    tarea_id: int,
    incluir_eliminadas: bool = False,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _validar_acceso(db, tarea_id, current_user)
    return reporte_service.listar_evidencias(db, tarea_id, incluir_eliminadas)


@router.post("/", response_model=EvidenciaResponse, status_code=status.HTTP_201_CREATED)
async def subir_evidencia(
    tarea_id: int,
    archivo: UploadFile = File(...),
    descripcion: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    tarea = _validar_acceso(db, tarea_id, current_user)
    verificar_rol_proyecto(db, current_user, tarea.proyecto_id, RolProyecto.ARQUITECTO, RolProyecto.TRABAJADOR)
    try:
        return await reporte_service.subir_evidencia(db, tarea_id, current_user.id_usuario, archivo, descripcion)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.get("/{evidencia_id}/descargar")
def descargar_evidencia(
    tarea_id: int,
    evidencia_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _validar_acceso(db, tarea_id, current_user)
    evidencia = _obtener_evidencia_de_tarea(db, tarea_id, evidencia_id)
    nombre = Path(evidencia.ruta_archivo).name
    ruta_absoluta = (ruta_uploads() / "evidencias" / nombre).resolve()
    carpeta = (ruta_uploads() / "evidencias").resolve()

    if carpeta not in ruta_absoluta.parents or not ruta_absoluta.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo de evidencia no disponible")

    tipo, _ = mimetypes.guess_type(nombre)
    return FileResponse(
        ruta_absoluta,
        media_type=tipo or "application/octet-stream",
        filename=evidencia.nombre_archivo,
    )


@router.delete("/{evidencia_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evidencia(
    tarea_id: int,
    evidencia_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    tarea = _validar_acceso(db, tarea_id, current_user)
    rol = verificar_rol_proyecto(
        db, current_user, tarea.proyecto_id, RolProyecto.ARQUITECTO, RolProyecto.TRABAJADOR
    )

    evidencia = _obtener_evidencia_de_tarea(db, tarea_id, evidencia_id)
    if evidencia.usuario_id != current_user.id_usuario and rol != RolProyecto.ARQUITECTO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes eliminar evidencias que hayas subido tú, o pídelo al Arquitecto del proyecto.",
        )

    if not reporte_service.eliminar_evidencia(db, evidencia_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidencia no encontrada")
    return None
