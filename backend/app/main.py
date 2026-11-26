from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import models  # noqa: F401
from app.routers.auth_router import router as auth_router
from app.routers.bitacora_router import router as bitacora_router
from app.routers.colaborador_router import router as colaborador_router
from app.routers.evidencia_router import router as evidencia_router
from app.routers.invitacion_router import router as invitacion_router
from app.routers.material_router import router as material_router
from app.routers.movimiento_router import router as movimiento_router
from app.routers.proyecto_router import router as proyecto_router
from app.routers.solicitud_router import router as solicitud_router
from app.routers.subcontratista_router import router as subcontratista_router
from app.routers.tarea_router import router as tarea_router
from app.routers.turno_router import router as turno_router
from app.routers.usuario_router import router as usuario_router

app = FastAPI(title="Titan V API", version="1.0.0")


@app.exception_handler(RequestValidationError)
async def validacion_amigable(request, exc: RequestValidationError):
    mensajes = []
    for error in exc.errors():
        campo = ".".join(str(parte) for parte in error["loc"][1:]) or "cuerpo"
        mensajes.append(f"{campo}: {error['msg']}")
    return JSONResponse(status_code=422, content={"detail": "; ".join(mensajes)})


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

API_ROUTERS = [
    auth_router,
    usuario_router,
    proyecto_router,
    colaborador_router,
    material_router,
    tarea_router,
    turno_router,
    movimiento_router,
    evidencia_router,
    invitacion_router,
    solicitud_router,
    subcontratista_router,
    bitacora_router,
]
for router in API_ROUTERS:
    app.include_router(router, prefix="/api")


@app.get("/")
def read_root():
    return {"status": "online"}
