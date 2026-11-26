"""Utilidades compartidas por los generadores de bitácoras y reportes de obra.

Centraliza el formato de fechas, nombres y la resolución segura de las rutas de
evidencias, para que el generador de PDF y el de Excel muestren exactamente la
misma información.
"""

import os
import re
from datetime import date, datetime, time
from pathlib import Path
from typing import Any, Optional
from xml.sax.saxutils import escape

from app.core.config import ruta_uploads
from app.models import Usuario

CARPETA_BACKEND = Path(__file__).resolve().parents[2]
CARPETA_UPLOADS = ruta_uploads()
RUTA_LOGO = CARPETA_BACKEND / "app" / "assets" / "logo.png"

EXTENSIONES_IMAGEN = {".jpg", ".jpeg", ".png", ".webp"}


def nombre_completo(usuario: Optional[Usuario]) -> str:
    """Devuelve el nombre legible de un usuario, o un guion si no existe."""
    if not usuario:
        return "—"
    return " ".join(parte for parte in (usuario.nombres, usuario.apellidos) if parte).strip() or "—"


def texto(valor: Any) -> str:
    """Convierte un valor cualquiera a texto sin exponer 'None' en el reporte."""
    if valor is None:
        return ""
    return str(valor)


def formatear_fecha(valor: Any, con_hora: bool = False) -> str:
    """Formatea fechas, horas y datetimes con el estilo usado en la app."""
    if not valor:
        return "—"
    if isinstance(valor, datetime):
        return valor.strftime("%d/%m/%Y %H:%M" if con_hora else "%d/%m/%Y")
    if isinstance(valor, date):
        return valor.strftime("%d/%m/%Y")
    if isinstance(valor, time):
        return valor.strftime("%H:%M")
    return texto(valor)


def resolver_ruta_evidencia(ruta_archivo: Optional[str]) -> Optional[str]:
    """Convierte '/uploads/evidencias/archivo.png' a una ruta local segura.

    Se usa solo el nombre base: así un valor manipulado en la BD no puede salir
    de la carpeta uploads (protección contra path traversal).
    """
    if not ruta_archivo:
        return None
    nombre = os.path.basename(texto(ruta_archivo).replace("\\", "/"))
    if not nombre:
        return None
    ruta = CARPETA_UPLOADS / "evidencias" / nombre
    return str(ruta) if ruta.is_file() else None


def es_imagen(ruta_archivo: Optional[str]) -> bool:
    _extension = os.path.splitext(texto(ruta_archivo).lower())[1]
    return _extension in EXTENSIONES_IMAGEN


def escapar_xml(valor: Any) -> str:
    """Escapa texto dinámico antes de meterlo en un Paragraph de ReportLab."""
    return escape(texto(valor))


def recortar(valor: Any, longitud: int = 48) -> str:
    """Acorta textos largos para que no rompan encabezados ni celdas."""
    contenido = texto(valor)
    return contenido if len(contenido) <= longitud else f"{contenido[: longitud - 1]}…"


def nombre_archivo_seguro(valor: Any) -> str:
    """Normaliza un nombre para usarlo como nombre de archivo descargable."""
    limpio = re.sub(r"[^A-Za-z0-9_-]+", "_", texto(valor)).strip("_")
    return limpio or "reporte"
