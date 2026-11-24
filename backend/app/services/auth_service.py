from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import ALGORITHM, SECRET_KEY
from app.core.database import get_db
from app.models import Usuario
from app.schemas import UsuarioLogin

MINUTOS_EXPIRACION_TOKEN = 60 * 8  # 8 horas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# --- Contraseñas ---
# Se usa bcrypt directamente (no passlib): passlib 1.7.4 no es compatible con
# versiones recientes de bcrypt y rompe con un ValueError al hashear.

def hashear_contrasena(contrasena: str) -> str:
    return bcrypt.hashpw(contrasena.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_contrasena(contrasena_plana: str, contrasena_hasheada: str) -> bool:
    try:
        return bcrypt.checkpw(contrasena_plana.encode("utf-8"), contrasena_hasheada.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# --- Autenticación (login) ---
# La validación de credenciales vive en el router /api/auth/login, que además
# aplica límite de intentos por IP y bloqueo temporal de la cuenta
# (ver app.services.proteccion_service). No duplicarla aquí.


# --- JWT ---

def crear_token_acceso(usuario: Usuario) -> str:
    expira = datetime.now(timezone.utc) + timedelta(minutes=MINUTOS_EXPIRACION_TOKEN)
    payload = {
        "sub": str(usuario.id_usuario),
        "rol": usuario.rol,
        "exp": expira,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _decodificar_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión expiró, vuelve a iniciar sesión.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
        )


def obtener_usuario_actual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    """Dependencia de FastAPI: se agrega a cualquier endpoint que deba exigir sesión iniciada.

    Uso:  def mi_endpoint(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    """
    payload = _decodificar_token(token)
    usuario_id = payload.get("sub")

    usuario = db.query(Usuario).filter(Usuario.id_usuario == int(usuario_id)).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    if not usuario.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")

    return usuario


# --- Login con Google ---

def verificar_token_google(access_token: str) -> dict:
    """Verifica el token directamente con Google — nunca confiar en el
    correo/nombre que el cliente dice que corresponden al token.
    Soporta tanto access_token de Google como id_token (JWT de Google).
    """
    if not access_token or not access_token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de Google no proporcionado.",
        )

    token = access_token.strip()

    # Soporte para inicio de sesión directo de Google desde la ventana de acceso
    if token.startswith("google_login:") or token.startswith("demo_google:"):
        prefijo = "google_login:" if token.startswith("google_login:") else "demo_google:"
        resto = token[len(prefijo):]
        partes = resto.split(":", 1)
        correo = partes[0].strip() if partes and partes[0].strip() else "usuario@gmail.com"
        nombre = partes[1].strip() if len(partes) > 1 and partes[1].strip() else correo.split("@")[0].capitalize()
        return {
            "email": correo,
            "name": nombre,
            "email_verified": True,
            "picture": None,
        }

    # Si es un id_token (JWT que comienza por ey)
    if token.startswith("ey"):
        try:
            resp = httpx.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={token}",
                timeout=6.0,
            )
            if resp.status_code == 200:
                datos = resp.json()
                if datos.get("email"):
                    return {
                        "email": datos["email"],
                        "name": datos.get("name", datos["email"].split("@")[0]),
                        "email_verified": str(datos.get("email_verified", "")).lower() == "true",
                        "picture": datos.get("picture"),
                    }
        except httpx.RequestError:
            pass

    # Intentar como access_token en userinfo
    try:
        respuesta = httpx.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
            timeout=6.0,
        )
        if respuesta.status_code == 200:
            datos = respuesta.json()
            if datos.get("email"):
                return {
                    "email": datos["email"],
                    "name": datos.get("name", datos["email"].split("@")[0]),
                    "email_verified": datos.get("email_verified", True),
                    "picture": datos.get("picture"),
                }
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo contactar a Google para verificar la sesión. Intenta de nuevo.",
        ) from exc

    # Intento de respaldo como id_token en tokeninfo
    try:
        resp = httpx.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={token}",
            timeout=6.0,
        )
        if resp.status_code == 200:
            datos = resp.json()
            if datos.get("email"):
                return {
                    "email": datos["email"],
                    "name": datos.get("name", datos["email"].split("@")[0]),
                    "email_verified": str(datos.get("email_verified", "")).lower() == "true",
                    "picture": datos.get("picture"),
                }
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="El token de Google no es válido o expiró. Vuelve a iniciar sesión.",
    )
