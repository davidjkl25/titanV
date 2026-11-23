import os

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.core.database import Base, engine

# Importa el paquete de modelos completo ANTES de crear las tablas,
# para que SQLAlchemy pueda resolver todas las relaciones entre clases.
from app import models  # noqa: F401

from app.routers.auth_router import router as auth_router
from app.routers.usuario_router import router as usuario_router
from app.routers.proyecto_router import router as proyecto_router
from app.routers.colaborador_router import router as colaborador_router
from app.routers.material_router import router as material_router
from app.routers.tarea_router import router as tarea_router
from app.routers.turno_router import router as turno_router
from app.routers.movimiento_router import router as movimiento_router
from app.routers.evidencia_router import router as evidencia_router
from app.routers.invitacion_router import router as invitacion_router
from app.routers.solicitud_router import router as solicitud_router

# Crear tablas automáticamente si la base de datos está disponible
try:
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conexion:
        # 1. Columnas y restricciones en tabla materiales
        conexion.execute(text("ALTER TABLE materiales ADD COLUMN IF NOT EXISTS proyecto_id INTEGER"))
        conexion.execute(text("ALTER TABLE materiales ADD COLUMN IF NOT EXISTS cantidad_inicial DOUBLE PRECISION NOT NULL DEFAULT 0"))
        conexion.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_material_proyecto') THEN
                    ALTER TABLE materiales ADD CONSTRAINT fk_material_proyecto
                        FOREIGN KEY (proyecto_id) REFERENCES proyectos_obra(id) ON DELETE CASCADE;
                END IF;
            END $$;
        """))

        # 2. Columnas nuevas en usuarios (recuperación de contraseña por PIN y bloqueo temporal)
        conexion.execute(text("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_pin VARCHAR(4)"))
        conexion.execute(text("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_pin_expira TIMESTAMP"))
        conexion.execute(text("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMP"))

    print("[Titan V OK] Tablas de base de datos conectadas y sincronizadas exitosamente.")
except Exception as e:
    print(f"[Titan V WARN] Advertencia al conectar con la base de datos: {e}")
    print("[Titan V WARN] Asegurate de que el servicio de PostgreSQL este iniciado y revisa la variable DATABASE_URL en tu archivo backend/.env")

app = FastAPI(title="Titan V API")


@app.exception_handler(RequestValidationError)
async def validacion_amigable(request, exc: RequestValidationError):
    """Devuelve los errores de validación de Pydantic como texto legible.

    Por defecto FastAPI responde con una lista técnica que el frontend termina
    mostrando como "[object Object]" en las alertas.
    """
    mensajes = []
    for error in exc.errors():
        campo = ".".join(str(parte) for parte in error["loc"][1:]) or "cuerpo"
        mensajes.append(f"{campo}: {error['msg']}")
    return JSONResponse(status_code=422, content={"detail": "; ".join(mensajes)})


# Configuración de CORS (necesaria para que el frontend, servido desde otro origen, pueda llamar a la API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de routers
app.include_router(auth_router)
app.include_router(auth_router, prefix="/api")
app.include_router(usuario_router)
app.include_router(proyecto_router)
app.include_router(colaborador_router)
app.include_router(material_router)
app.include_router(tarea_router)
app.include_router(turno_router)
app.include_router(movimiento_router)
app.include_router(evidencia_router)
app.include_router(invitacion_router)
app.include_router(solicitud_router)

# Sirve los archivos subidos (fotos/PDF de evidencias) en /uploads/...
CARPETA_UPLOADS = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(CARPETA_UPLOADS, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=CARPETA_UPLOADS), name="uploads")


@app.get("/")
def read_root():
    return {"status": "online"}
