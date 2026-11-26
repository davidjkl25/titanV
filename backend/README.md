# Backend Titan V

API REST de Titan V construida con FastAPI, SQLAlchemy y PostgreSQL.

## Arranque

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env            # Windows: copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

`DATABASE_URL` y `JWT_SECRET_KEY` son obligatorias. La aplicación rechaza claves
de ejemplo o vacías salvo que `ENVIRONMENT` sea `test`, `testing` o `ci`.
`JWT_EXPIRE_MINUTES` define la vigencia del token (60 por defecto).
`TITANV_UPLOAD_DIR` permite cambiar el directorio de evidencias.

Todas las rutas de negocio se registran con el prefijo `/api`. Swagger está en
`http://localhost:8000/docs`.

## Estructura

```text
backend/
├── app/
│   ├── core/       # configuración, sesiones, JWT, bcrypt, permisos
│   ├── models/     # entidades SQLAlchemy
│   ├── schemas/    # validación Pydantic
│   ├── routers/    # capa HTTP
│   └── services/   # lógica de negocio
├── migrations/     # Alembic
├── tests/          # pytest
└── sql/database.sql
```

## Seguridad y datos

- Una sola implementación de JWT en `core/security.py`; la identidad sale del
  token mediante `get_current_user`.
- Roles por proyecto en `RolProyecto`: `Arquitecto`, `Trabajador`,
  `Visualizador`.
- Borrado lógico con `fecha_eliminacion`; las rutas de restauración permiten
  recuperar registros.
- Materiales, inventario y movimientos pertenecen a un proyecto.
- El trigger `trigger_validar_stock` se crea en la migración y en
  `sql/database.sql`.
- Evidencias: subida y descarga autenticadas, máximo 15 MB y extensiones
  `jpg`, `jpeg`, `png`, `webp`, `pdf` y `mp4`.
- Recuperación de contraseña: token de 32 bytes aleatorios, hasheado con
  SHA-256 y de un solo uso.
- Intentos de acceso: persistidos en `intentos_acceso`, sin confiar en
  `X-Forwarded-For`.

## Pruebas

```bash
python -m compileall -q app
python -m pytest -q
python -c "from app.main import app; app.openapi()"
```

Los tests usan SQLite y no requieren PostgreSQL ni SMTP. `tests/conftest.py`
configura `ENVIRONMENT=test` y una base temporal antes de importar la app.
