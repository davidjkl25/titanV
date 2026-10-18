"""
Reexporta todos los esquemas de Pydantic para mantener compatibilidad con
`from app.schemas import X` en cualquier parte de la app.
"""

from app.schemas.usuario_schema import (
<<<<<<< HEAD
    GoogleAuthRequest,
=======
    ForgotPasswordRequest,
    GoogleAuthRequest,
    ResetPasswordRequest,
>>>>>>> test
    TokenResponse,
    UsuarioBase,
    UsuarioCreate,
    UsuarioLogin,
    UsuarioResponse,
    UsuarioUpdate,
<<<<<<< HEAD
=======
    VerifyPinRequest,
>>>>>>> test
)
from app.schemas.colaborador_schema import (
    ColaboradorCreate,
    ColaboradorInvitar,
    ColaboradorResponse,
    ColaboradorUpdate,
<<<<<<< HEAD
=======
    InvitacionCorreoResponse,
>>>>>>> test
)
from app.schemas.proyecto_schema import (
    ProyectoBase,
    ProyectoCreate,
    ProyectoResponse,
    ProyectoUpdate,
)
from app.schemas.material_schema import (
    InventarioResponse,
    KardexResponse,
    MaterialBase,
    MaterialCreate,
    MaterialResponse,
    MaterialUpdate,
    RegistroMovimiento,
)
from app.schemas.tarea_schema import (
    ComentarioCreate,
    ComentarioResponse,
    TareaBase,
    TareaCreate,
    TareaResponse,
    TareaUpdate,
)
from app.schemas.asistencia_schema import (
    TurnoBase,
    TurnoCreate,
    TurnoResponse,
    TurnoUpdate,
)
from app.schemas.reporte_schema import EvidenciaResponse
<<<<<<< HEAD

__all__ = [
    "UsuarioBase", "UsuarioCreate", "UsuarioUpdate", "UsuarioResponse", "UsuarioLogin", "TokenResponse", "GoogleAuthRequest",
    "ColaboradorCreate", "ColaboradorInvitar", "ColaboradorUpdate", "ColaboradorResponse",
=======
from app.schemas.solicitud_schema import SolicitudMaterialCreate, SolicitudMaterialResponse, SolicitudMaterialUpdate
from app.schemas.invitacion_schema import (
    AceptarInvitacionResponse,
    EnlaceInvitacionCreate,
    EnlaceInvitacionResponse,
)

__all__ = [
    "UsuarioBase", "UsuarioCreate", "UsuarioUpdate", "UsuarioResponse", "UsuarioLogin", "TokenResponse", "GoogleAuthRequest",
    "ForgotPasswordRequest", "VerifyPinRequest", "ResetPasswordRequest",
    "ColaboradorCreate", "ColaboradorInvitar", "ColaboradorUpdate", "ColaboradorResponse",
    "InvitacionCorreoResponse",
>>>>>>> test
    "ProyectoBase", "ProyectoCreate", "ProyectoUpdate", "ProyectoResponse",
    "MaterialBase", "MaterialCreate", "MaterialUpdate", "MaterialResponse",
    "RegistroMovimiento", "KardexResponse", "InventarioResponse",
    "ComentarioCreate", "ComentarioResponse",
    "TareaBase", "TareaCreate", "TareaUpdate", "TareaResponse",
    "TurnoBase", "TurnoCreate", "TurnoUpdate", "TurnoResponse",
    "EvidenciaResponse",
<<<<<<< HEAD
=======
    "EnlaceInvitacionCreate", "EnlaceInvitacionResponse", "AceptarInvitacionResponse",
    "SolicitudMaterialCreate", "SolicitudMaterialUpdate", "SolicitudMaterialResponse",
>>>>>>> test
]