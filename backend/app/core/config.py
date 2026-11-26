import os
import secrets
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_PATH)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = timedelta(minutes=int(os.getenv("JWT_EXPIRE_MINUTES", "60")))
MAX_USUARIOS = int(os.getenv("MAX_USUARIOS", "0"))

_clave_configurada = os.getenv("JWT_SECRET_KEY", "")
_es_prueba = os.getenv("ENVIRONMENT", "").lower() in {"test", "testing", "ci"}
_clave_insegura = not _clave_configurada or _clave_configurada.startswith("cambia-esto")
if _clave_insegura and not _es_prueba:
    raise RuntimeError(
        "JWT_SECRET_KEY no está configurada o sigue siendo la clave de ejemplo. "
        "Genera una clave larga y aleatoria antes de iniciar la API."
    )
if _clave_insegura:
    SECRET_KEY = secrets.token_hex(32)
else:
    SECRET_KEY = _clave_configurada


def ruta_uploads() -> Path:
    configurada = os.getenv("TITANV_UPLOAD_DIR")
    if configurada:
        return Path(configurada)
    return Path(__file__).resolve().parents[2] / "uploads"
