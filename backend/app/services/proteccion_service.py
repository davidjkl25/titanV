import hashlib
import math
from datetime import datetime, timedelta

from fastapi import HTTPException, Request, status
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import IntentoAcceso, Usuario

LIMITE_FALLOS_CONSECUTIVOS = 5
MINUTOS_BLOQUEO_CONTRASENA = 15


def ip_cliente(request: Request) -> str:
    return request.client.host if request.client else "desconocida"


def _hash_clave(clave: str) -> str:
    return hashlib.sha256(clave.encode("utf-8")).hexdigest()


def verificar_limite(db: Session, clave: str, maximo: int, ventana_segundos: int) -> None:
    ahora = datetime.utcnow()
    desde = ahora - timedelta(seconds=ventana_segundos)
    clave_hash = _hash_clave(clave)

    cantidad = (
        db.query(IntentoAcceso)
        .filter(IntentoAcceso.clave_hash == clave_hash, IntentoAcceso.fecha >= desde)
        .count()
    )
    if cantidad >= maximo:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Vuelve a intentarlo más tarde.",
        )

    db.add(IntentoAcceso(clave_hash=clave_hash, fecha=ahora))
    db.execute(delete(IntentoAcceso).where(IntentoAcceso.fecha < desde))
    db.commit()


def verificar_bloqueo_cuenta(usuario: Usuario) -> None:
    if not usuario.bloqueado_hasta:
        return
    ahora = datetime.utcnow()
    if ahora < usuario.bloqueado_hasta:
        minutos = max(1, math.ceil((usuario.bloqueado_hasta - ahora).total_seconds() / 60))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Cuenta bloqueada por demasiados intentos fallidos. Intenta de nuevo en {minutos} minuto(s).",
        )
    usuario.bloqueado_hasta = None
    usuario.intentos_fallidos = 0


def registrar_fallo(db: Session, usuario: Usuario) -> bool:
    usuario.intentos_fallidos = (usuario.intentos_fallidos or 0) + 1
    bloqueada = usuario.intentos_fallidos >= LIMITE_FALLOS_CONSECUTIVOS
    if bloqueada:
        usuario.bloqueado_hasta = datetime.utcnow() + timedelta(minutes=MINUTOS_BLOQUEO_CONTRASENA)
    db.commit()
    return bloqueada


def reiniciar_intentos(db: Session, usuario: Usuario) -> None:
    if usuario.intentos_fallidos or usuario.bloqueado_hasta:
        usuario.intentos_fallidos = 0
        usuario.bloqueado_hasta = None
        db.commit()
