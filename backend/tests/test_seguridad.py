import jwt

from app.core.config import ACCESS_TOKEN_EXPIRE, ALGORITHM, SECRET_KEY
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


def test_hash_y_verificacion_de_contrasena():
    hash_almacenado = hash_password("ClaveSegura123")
    assert hash_almacenado != "ClaveSegura123"
    assert verify_password("ClaveSegura123", hash_almacenado)
    assert not verify_password("Incorrecta123", hash_almacenado)


def test_token_unico_con_expiracion_configurada():
    token = create_access_token(7, rol=3, nombre="Ana", extra_claims={"sub": "99", "correo": "ana@example.com"})
    claims = decode_access_token(token)

    assert claims["sub"] == "7"
    assert claims["rol"] == 3
    assert claims["nombre"] == "Ana"
    assert claims["correo"] == "ana@example.com"
    assert claims["exp"] - claims["iat"] == int(ACCESS_TOKEN_EXPIRE.total_seconds())
    assert jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])["exp"] == claims["exp"]


def test_token_invalido_se_rechaza():
    try:
        decode_access_token("token.no.valido")
    except ValueError as error:
        assert str(error) == "Token inválido"
    else:
        raise AssertionError("Se esperaba ValueError")
