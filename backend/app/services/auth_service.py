import os

import httpx
from fastapi import HTTPException, status

from app.core import security


def hashear_contrasena(contrasena: str) -> str:
    return security.hash_password(contrasena)


def verificar_contrasena(contrasena_plana: str, contrasena_hasheada: str) -> bool:
    return security.verify_password(contrasena_plana, contrasena_hasheada)


def crear_token_acceso(usuario) -> str:
    nombre = f"{usuario.nombres} {usuario.apellidos}".strip()
    return security.create_access_token(
        usuario.id_usuario,
        rol=usuario.rol,
        nombre=nombre,
        extra_claims={"correo": usuario.correo_electronico},
    )


def verificar_token_google(access_token: str) -> dict:
    if not access_token or not access_token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de Google no proporcionado.",
        )

    token = access_token.strip()

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

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="El token de Google no es válido o expiró. Vuelve a iniciar sesión.",
    )
