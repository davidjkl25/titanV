import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import ACCESS_TOKEN_EXPIRE, MAX_USUARIOS
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Usuario
from app.schemas import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
    ResetPasswordRequest,
    TokenResponse,
    UsuarioCreate,
    UsuarioLogin,
    UsuarioResponse,
    VerifyPinRequest,
)
from app.services import auth_service, email_service, proteccion_service, usuario_service
from app.services.proteccion_service import ip_cliente

router = APIRouter(prefix="/auth", tags=["Autenticación"])

VENTANA_LOGIN = 300
VENTANA_REGISTRO = 600
VENTANA_RECUPERACION = 900
MINUTOS_TOKEN_RECUPERACION = 15
MINUTOS_SESION_RECUPERACION = 5
MENSAJE_GENERICO_RECUPERACION = "Si el correo está registrado, recibirás las instrucciones para restablecer la contraseña."
MENSAJE_TOKEN_INVALIDO = "Los datos de recuperación no son válidos o han expirado."


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _tokens_iguales(valor: str | None, candidato: str) -> bool:
    if not valor:
        return False
    return hmac.compare_digest(valor, _hash_token(candidato))


def _respuesta_token(usuario: Usuario, mensaje: str, correo: str | None = None) -> dict:
    return {
        "mensaje": mensaje,
        "usuario_id": usuario.id_usuario,
        "nombre": f"{usuario.nombres} {usuario.apellidos}".strip(),
        "correo": correo or usuario.correo_electronico,
        "rol": usuario.rol,
        "token": auth_service.crear_token_acceso(usuario),
        "token_type": "bearer",
        "expires_in": int(ACCESS_TOKEN_EXPIRE.total_seconds()),
    }


@router.post("/registro", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def registro(usuario: UsuarioCreate, request: Request, db: Session = Depends(get_db)):
    proteccion_service.verificar_limite(
        db, f"registro:{ip_cliente(request)}", maximo=5, ventana_segundos=VENTANA_REGISTRO
    )

    if MAX_USUARIOS > 0:
        total_usuarios = db.query(Usuario).count()
        if total_usuarios >= MAX_USUARIOS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Se alcanzó el límite máximo de usuarios permitidos en el sistema. Contacta al administrador.",
            )

    if usuario_service.correo_registrado(db, usuario.correo_electronico):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado.",
        )
    return usuario_service.crear_usuario(db, usuario)


@router.post("/google", response_model=TokenResponse)
def login_google(datos: GoogleAuthRequest, request: Request, db: Session = Depends(get_db)):
    proteccion_service.verificar_limite(
        db, f"google:{ip_cliente(request)}", maximo=15, ventana_segundos=VENTANA_LOGIN
    )

    datos_google = auth_service.verificar_token_google(datos.credential)
    correo_verificado = datos_google["email"]
    nombre_verificado = datos_google.get("name", correo_verificado)

    usuario = db.query(Usuario).filter(Usuario.correo_electronico == correo_verificado).first()

    if not usuario:
        if MAX_USUARIOS > 0 and db.query(Usuario).count() >= MAX_USUARIOS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Se alcanzó el límite máximo de usuarios permitidos en el sistema. Contacta al administrador.",
            )

        partes = (nombre_verificado or "").strip().split(" ", 1)
        nombres = partes[0].strip() if partes and partes[0].strip() else (correo_verificado.split("@")[0] or "Usuario")
        apellidos = partes[1].strip() if len(partes) > 1 and partes[1].strip() else "Google"

        usuario = Usuario(
            nombres=nombres,
            apellidos=apellidos,
            correo_electronico=correo_verificado,
            contrasena_encriptada=auth_service.hashear_contrasena(os.urandom(32).hex()),
            rol=3,
            activo=True,
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario se encuentra inactivo en el sistema. Contacte al administrador.",
        )

    proteccion_service.reiniciar_intentos(db, usuario)
    return _respuesta_token(usuario, "Inicio de sesión con Google exitoso", correo_verificado)


@router.post("/login", response_model=TokenResponse)
def login(credenciales: UsuarioLogin, request: Request, db: Session = Depends(get_db)):
    proteccion_service.verificar_limite(
        db, f"login:{ip_cliente(request)}", maximo=10, ventana_segundos=VENTANA_LOGIN
    )

    usuario = db.query(Usuario).filter(Usuario.correo_electronico == credenciales.correo_electronico).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Credenciales incorrectas")

    proteccion_service.verificar_bloqueo_cuenta(usuario)

    if not auth_service.verificar_contrasena(credenciales.contrasena, usuario.contrasena_encriptada):
        bloqueada = proteccion_service.registrar_fallo(db, usuario)
        if bloqueada:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Cuenta bloqueada por {proteccion_service.MINUTOS_BLOQUEO_CONTRASENA} minutos "
                    "tras demasiados intentos fallidos."
                ),
            )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Credenciales incorrectas")

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario se encuentra inactivo. Contacte al administrador.",
        )

    proteccion_service.reiniciar_intentos(db, usuario)
    return _respuesta_token(usuario, "Login exitoso")


@router.get("/verificar")
def verificar_sesion(usuario_actual: Usuario = Depends(get_current_user)):
    return {
        "usuario_id": usuario_actual.id_usuario,
        "nombre": f"{usuario_actual.nombres} {usuario_actual.apellidos}".strip(),
        "correo": usuario_actual.correo_electronico,
        "rol": usuario_actual.rol,
    }


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    correo = req.email.lower()
    proteccion_service.verificar_limite(
        db, f"forgot-ip:{ip_cliente(request)}", maximo=5, ventana_segundos=VENTANA_RECUPERACION
    )
    proteccion_service.verificar_limite(db, f"forgot-mail:{correo}", maximo=5, ventana_segundos=VENTANA_RECUPERACION)

    usuario = db.query(Usuario).filter(Usuario.correo_electronico == correo).first()
    if usuario:
        token = secrets.token_urlsafe(32)
        usuario.reset_token_hash = _hash_token(token)
        usuario.reset_token_expira = datetime.utcnow() + timedelta(minutes=MINUTOS_TOKEN_RECUPERACION)
        usuario.reset_token_usado_en = None
        usuario.reset_sesion_hash = None
        usuario.reset_sesion_expira = None
        db.commit()
        email_service.enviar_token_recuperacion(correo, token)

    return {"message": MENSAJE_GENERICO_RECUPERACION}


@router.post("/verify-pin")
def verify_pin(req: VerifyPinRequest, request: Request, db: Session = Depends(get_db)):
    correo = req.email.lower()
    proteccion_service.verificar_limite(
        db, f"pin-ip:{ip_cliente(request)}", maximo=15, ventana_segundos=VENTANA_RECUPERACION
    )
    proteccion_service.verificar_limite(db, f"pin-mail:{correo}", maximo=10, ventana_segundos=VENTANA_RECUPERACION)

    usuario = db.query(Usuario).filter(Usuario.correo_electronico == correo).first()
    if (
        not usuario
        or not _tokens_iguales(usuario.reset_token_hash, req.token)
        or not usuario.reset_token_expira
        or datetime.utcnow() > usuario.reset_token_expira
    ):
        raise HTTPException(status_code=400, detail=MENSAJE_TOKEN_INVALIDO)

    sesion_token = secrets.token_urlsafe(32)
    usuario.reset_sesion_hash = _hash_token(sesion_token)
    usuario.reset_sesion_expira = datetime.utcnow() + timedelta(minutes=MINUTOS_SESION_RECUPERACION)
    usuario.reset_token_hash = None
    usuario.reset_token_expira = None
    usuario.reset_token_usado_en = datetime.utcnow()
    db.commit()

    return {"message": "Código verificado. Ingresa tu nueva contraseña.", "token": sesion_token}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    correo = req.email.lower()
    proteccion_service.verificar_limite(
        db, f"reset-ip:{ip_cliente(request)}", maximo=10, ventana_segundos=VENTANA_RECUPERACION
    )
    proteccion_service.verificar_limite(db, f"reset-mail:{correo}", maximo=5, ventana_segundos=VENTANA_RECUPERACION)

    usuario = db.query(Usuario).filter(Usuario.correo_electronico == correo).first()
    if (
        not usuario
        or not _tokens_iguales(usuario.reset_sesion_hash, req.token)
        or not usuario.reset_sesion_expira
        or datetime.utcnow() > usuario.reset_sesion_expira
    ):
        raise HTTPException(status_code=400, detail=MENSAJE_TOKEN_INVALIDO)

    usuario.contrasena_encriptada = auth_service.hashear_contrasena(req.newPassword)
    usuario.reset_token_hash = None
    usuario.reset_token_expira = None
    usuario.reset_sesion_hash = None
    usuario.reset_sesion_expira = None
    usuario.intentos_fallidos = 0
    usuario.bloqueado_hasta = None
    db.commit()

    return {"message": "Contraseña actualizada exitosamente."}
