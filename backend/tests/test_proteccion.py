import pytest
from fastapi import HTTPException, Request

from app.core.database import SessionLocal
from app.models import IntentoAcceso, Usuario
from app.services import proteccion_service


def test_limitador_persistente_bloquea_despues_del_maximo():
    db = SessionLocal()
    for _ in range(2):
        proteccion_service.verificar_limite(db, "login:203.0.113.8", maximo=2, ventana_segundos=300)

    with pytest.raises(HTTPException) as error:
        proteccion_service.verificar_limite(db, "login:203.0.113.8", maximo=2, ventana_segundos=300)

    assert error.value.status_code == 429
    assert db.query(IntentoAcceso).count() == 2
    db.close()


def test_ip_cliente_ignora_encabezado_falsificable():
    solicitud = Request(
        {
            "type": "http",
            "client": ("203.0.113.9", 1234),
            "headers": [(b"x-forwarded-for", b"10.0.0.1")],
            "method": "GET",
            "path": "/",
            "query_string": b"",
            "scheme": "http",
            "server": ("testserver", 80),
        }
    )
    assert proteccion_service.ip_cliente(solicitud) == "203.0.113.9"


def test_bloqueo_y_reinicio_de_intentos():
    db = SessionLocal()
    usuario = Usuario(
        nombres="Ana",
        apellidos="Pérez",
        correo_electronico="ana@example.com",
        contrasena_encriptada="hash",
        rol=3,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    for _ in range(4):
        assert proteccion_service.registrar_fallo(db, usuario) is False
    assert proteccion_service.registrar_fallo(db, usuario) is True
    assert usuario.bloqueado_hasta is not None

    proteccion_service.reiniciar_intentos(db, usuario)
    assert usuario.intentos_fallidos == 0
    assert usuario.bloqueado_hasta is None
    db.close()
