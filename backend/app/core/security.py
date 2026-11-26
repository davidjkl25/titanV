from datetime import datetime, timezone
from typing import Optional

import bcrypt
import jwt

from app.core.config import ACCESS_TOKEN_EXPIRE, ALGORITHM, SECRET_KEY

_CLAIMS_RESERVADOS = {"sub", "iat", "exp"}


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(
    usuario_id: int,
    rol=None,
    nombre: Optional[str] = None,
    extra_claims: Optional[dict] = None,
) -> str:
    ahora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario_id),
        "iat": ahora,
        "exp": ahora + ACCESS_TOKEN_EXPIRE,
    }
    if rol is not None:
        payload["rol"] = rol
    if nombre is not None:
        payload["nombre"] = nombre
    if extra_claims:
        payload.update({clave: valor for clave, valor in extra_claims.items() if clave not in _CLAIMS_RESERVADOS})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"require": ["sub", "iat", "exp"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise ValueError("El token ha expirado") from exc
    except jwt.InvalidTokenError as exc:
        raise ValueError("Token inválido") from exc
