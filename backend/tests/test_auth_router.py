import hashlib

from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models import Usuario
from app.services import auth_service, email_service


def _crear_usuario(correo="ana@example.com", contrasena="ClaveSegura123"):
    db = SessionLocal()
    usuario = Usuario(
        nombres="Ana",
        apellidos="Pérez",
        correo_electronico=correo,
        contrasena_encriptada=auth_service.hashear_contrasena(contrasena),
        rol=3,
        activo=True,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    db.close()
    return usuario.id_usuario


def test_recuperacion_us_token_de_un_solo_uso_y_mensaje_generico(client, monkeypatch):
    enviados = []
    monkeypatch.setattr(email_service, "enviar_token_recuperacion", lambda correo, token: enviados.append(token))
    id_usuario = _crear_usuario()

    desconocido = client.post("/api/auth/forgot-password", json={"email": "no-registrado@example.com"})
    assert desconocido.status_code == 200
    assert "Si el correo está registrado" in desconocido.json()["message"]
    assert enviados == []

    conocido = client.post("/api/auth/forgot-password", json={"email": "ana@example.com"})
    assert conocido.status_code == 200
    assert (known_message := conocido.json()["message"])
    assert "Si el correo está registrado" in known_message
    assert len(enviados) == 1

    token_recuperacion = enviados[0]
    db = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    assert usuario.reset_token_hash == hashlib.sha256(token_recuperacion.encode()).hexdigest()
    assert usuario.reset_token_hash != token_recuperacion
    db.close()

    rechazado = client.post(
        "/api/auth/verify-pin",
        json={"email": "ana@example.com", "token": "token-incorrecto-con-longitud-suficiente"},
    )
    assert rechazado.status_code == 400

    verificado = client.post(
        "/api/auth/verify-pin",
        json={"email": "ana@example.com", "token": token_recuperacion},
    )
    assert verificado.status_code == 200
    token_sesion = verificado.json()["token"]

    reutilizado = client.post(
        "/api/auth/verify-pin",
        json={"email": "ana@example.com", "token": token_recuperacion},
    )
    assert reutilizado.status_code == 400

    restablecido = client.post(
        "/api/auth/reset-password",
        json={"email": "ana@example.com", "token": token_sesion, "newPassword": "NuevaClave123"},
    )
    assert restablecido.status_code == 200

    db = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    assert auth_service.verificar_contrasena("NuevaClave123", usuario.contrasena_encriptada)
    assert usuario.reset_sesion_hash is None
    db.close()


def test_cambiar_contrasena_desde_perfil_guarda_el_cambio(client):
    id_usuario = _crear_usuario()
    token = create_access_token(id_usuario, rol=3, nombre="Ana")
    respuesta = client.post(
        "/api/usuarios/me/contrasena",
        json={"contrasena_actual": "ClaveSegura123", "nueva_contrasena": "NuevaClave123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert respuesta.status_code == 200

    db = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    assert auth_service.verificar_contrasena("NuevaClave123", usuario.contrasena_encriptada)
    db.close()


def test_login_bloquea_tras_demasiados_intentos(client):
    _crear_usuario()
    corpo = {"correo_electronico": "ana@example.com", "contrasena": "Incorrecta123"}

    for _ in range(4):
        assert client.post("/api/auth/login", json=corpo).status_code == 403

    bloqueado = client.post("/api/auth/login", json=corpo)
    assert bloqueado.status_code == 429
