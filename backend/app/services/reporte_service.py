import hashlib
import os
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import ruta_uploads
from app.core.soft_delete import marcar_eliminado, sin_eliminados
from app.models import EvidenciaMultimedia

EXTENSIONES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".mp4"}
TAMANO_MAXIMO_BYTES = 15 * 1024 * 1024
CHUNK_BYTES = 1024 * 1024


def carpeta_evidencias() -> Path:
    carpeta = ruta_uploads() / "evidencias"
    carpeta.mkdir(parents=True, exist_ok=True)
    return carpeta


def _extension_valida(nombre_archivo: str) -> bool:
    _, extension = os.path.splitext(nombre_archivo.lower())
    return extension in EXTENSIONES_PERMITIDAS


async def guardar_archivo_en_disco(archivo: UploadFile) -> str:
    _, extension = os.path.splitext(archivo.filename or "")
    nombre_unico = f"{uuid.uuid4().hex}{extension.lower()}"
    ruta_absoluta = carpeta_evidencias() / nombre_unico
    total = 0

    try:
        with ruta_absoluta.open("wb") as destino:
            while contenido := await archivo.read(CHUNK_BYTES):
                total += len(contenido)
                if total > TAMANO_MAXIMO_BYTES:
                    raise ValueError("El archivo supera el límite de 15 MB.")
                destino.write(contenido)
    except Exception:
        ruta_absoluta.unlink(missing_ok=True)
        raise

    return f"/uploads/evidencias/{nombre_unico}"


async def subir_evidencia(
    db: Session, tarea_id: int, usuario_id: int, archivo: UploadFile, descripcion: Optional[str] = None
) -> EvidenciaMultimedia:
    if not archivo.filename or not _extension_valida(archivo.filename):
        raise ValueError(
            f"Tipo de archivo no permitido. Formatos válidos: {', '.join(sorted(EXTENSIONES_PERMITIDAS))}"
        )

    ruta = await guardar_archivo_en_disco(archivo)

    nueva_evidencia = EvidenciaMultimedia(
        tarea_id=tarea_id,
        usuario_id=usuario_id,
        nombre_archivo=archivo.filename,
        ruta_archivo=ruta,
        descripcion=descripcion,
    )
    db.add(nueva_evidencia)
    db.commit()
    db.refresh(nueva_evidencia)
    return nueva_evidencia


def listar_evidencias(db: Session, tarea_id: int, incluir_eliminadas: bool = False) -> List[EvidenciaMultimedia]:
    query = db.query(EvidenciaMultimedia).filter(EvidenciaMultimedia.tarea_id == tarea_id)
    if not incluir_eliminadas:
        query = sin_eliminados(query, EvidenciaMultimedia)
    return query.order_by(EvidenciaMultimedia.fecha_subida.desc()).all()


def obtener_evidencia(db: Session, evidencia_id: int) -> Optional[EvidenciaMultimedia]:
    return (
        db.query(EvidenciaMultimedia)
        .filter(EvidenciaMultimedia.id == evidencia_id, EvidenciaMultimedia.fecha_eliminacion.is_(None))
        .first()
    )


def eliminar_evidencia(db: Session, evidencia_id: int) -> bool:
    evidencia = (
        db.query(EvidenciaMultimedia)
        .filter(EvidenciaMultimedia.id == evidencia_id, EvidenciaMultimedia.fecha_eliminacion.is_(None))
        .first()
    )
    if not evidencia:
        return False

    marcar_eliminado(db, evidencia)
    return True
