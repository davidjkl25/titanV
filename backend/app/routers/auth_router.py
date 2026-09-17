import os
import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Usuario
from app.schemas import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
    ResetPasswordRequest,
    UsuarioCreate,
    UsuarioLogin,
    UsuarioResponse,
    VerifyPinRequest,
)
from app.services import auth_service, email_service, usuario_service
from app.services.email_service import EmailError

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


@router.post("/registro", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def registro(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    """Registro público de nuevo usuario en la base de datos."""
    if usuario_service.correo_registrado(db, usuario.correo_electronico):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado.",
        )
    return usuario_service.crear_usuario(db, usuario)


@router.post("/google")
def login_google(datos: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Inicia sesión con Google o crea al usuario en PostgreSQL si es nuevo.

    El correo y nombre se toman de la respuesta VERIFICADA de Google
    (obtenida server-side con el access_token), nunca de lo que el cliente
    haya mandado en el body — eso es lo que cierra el hueco de seguridad.
    """
    datos_google = auth_service.verificar_token_google(datos.credential)
    correo_verificado = datos_google["email"]
    nombre_verificado = datos_google.get("name", correo_verificado)

    usuario = db.query(Usuario).filter(Usuario.correo_electronico == correo_verificado).first()

    if not usuario:
        partes = nombre_verificado.strip().split(" ", 1)
        nombres = partes[0]
        apellidos = partes[1] if len(partes) > 1 else ""

        nuevo_usuario = Usuario(
            nombres=nombres,
            apellidos=apellidos,
            correo_electronico=correo_verificado,
            contrasena_encriptada=auth_service.hashear_contrasena(os.urandom(32).hex()),
            rol=3,
            activo=True,
        )
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        usuario = nuevo_usuario

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario se encuentra inactivo en el sistema. Contacte al administrador.",
        )

    token = auth_service.crear_token_acceso(usuario)

    return {
        "mensaje": "Inicio de sesión con Google exitoso",
        "usuario_id": usuario.id_usuario,
        "nombre": f"{usuario.nombres} {usuario.apellidos}".strip(),
        "correo": usuario.correo_electronico,
        "rol": usuario.rol,
        "token": token,
        "token_type": "bearer",
    }


@router.post("/login")
def login(credenciales: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = auth_service.autenticar_usuario(db, credenciales)

    if not usuario:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Credenciales incorrectas")

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario se encuentra inactivo. Contacte al administrador.",
        )

    token = auth_service.crear_token_acceso(usuario)

    return {
        "mensaje": "Login exitoso",
        "usuario_id": usuario.id_usuario,
        "nombre": f"{usuario.nombres} {usuario.apellidos}".strip(),
        "rol": usuario.rol,
        "token": token,
        "token_type": "bearer",
    }


@router.get("/verificar")
def verificar_sesion(usuario_actual: Usuario = Depends(auth_service.obtener_usuario_actual)):
    """Útil para que el frontend confirme si el token guardado todavía es válido."""
    return {
        "usuario_id": usuario_actual.id_usuario,
        "nombre": f"{usuario_actual.nombres} {usuario_actual.apellidos}".strip(),
        "rol": usuario_actual.rol,
    }


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo_electronico == req.email).first()
    if not usuario:
        return {"message": "Si el correo está registrado, se ha enviado un código PIN."}

    pin = f"{random.randint(0, 9999):04d}"
    usuario.reset_pin = pin
    usuario.reset_pin_expira = datetime.utcnow() + timedelta(minutes=15)
    db.commit()

    try:
        email_service.enviar_pin_por_correo(req.email, pin)
    except EmailError as e:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo enviar el código. {e}",
        )

    return {"message": "Código PIN generado exitosamente."}


@router.post("/verify-pin")
def verify_pin(req: VerifyPinRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo_electronico == req.email).first()

    if not usuario or usuario.reset_pin != req.pin:
        raise HTTPException(status_code=400, detail="El código PIN es incorrecto.")

    if usuario.reset_pin_expira and datetime.utcnow() > usuario.reset_pin_expira:
        raise HTTPException(status_code=400, detail="El código PIN ha expirado.")

    return {"message": "PIN verificado correctamente."}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo_electronico == req.email).first()

    if not usuario or usuario.reset_pin != req.pin:
        raise HTTPException(status_code=400, detail="El código PIN es incorrecto.")

    if usuario.reset_pin_expira and datetime.utcnow() > usuario.reset_pin_expira:
        raise HTTPException(status_code=400, detail="El código PIN ha expirado.")

    usuario.contrasena_encriptada = auth_service.hashear_contrasena(req.newPassword)
    usuario.reset_pin = None
    usuario.reset_pin_expira = None
    db.commit()

    return {"message": "Contraseña actualizada exitosamente."}
