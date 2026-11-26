from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import verificar_rol_proyecto
from app.core.soft_delete import sin_eliminados
from app.models import RolProyecto, Subcontratista, Usuario
from app.schemas import SubcontratistaCreate, SubcontratistaResponse, SubcontratistaUpdate
from app.services import proyecto_service, subcontratista_service

router = APIRouter(prefix="/subcontratistas", tags=["Subcontratistas"])


def _exigir_arquitecto(db: Session, proyecto_id: int, usuario: Usuario) -> None:
    verificar_rol_proyecto(db, usuario, proyecto_id, RolProyecto.ARQUITECTO)


def _proyecto_existe(db: Session, proyecto_id: int) -> None:
    if not proyecto_service.obtener_proyecto(db, proyecto_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proyecto no encontrado")


@router.get("/", response_model=List[SubcontratistaResponse])
def get_subcontratistas(
    proyecto_id: Optional[int] = Query(None, description="Filtrar por proyecto"),
    incluir_eliminados: bool = False,
    skip: int = 0,
    limit: int = 100,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if proyecto_id is not None:
        _proyecto_existe(db, proyecto_id)
        verificar_rol_proyecto(db, current_user, proyecto_id)
        return subcontratista_service.listar_subcontratistas(
            db, proyecto_id, incluir_eliminados, skip, limit
        )

    permitidos = [
        proyecto.id
        for proyecto in proyecto_service.listar_proyectos(db, current_user.id_usuario, incluir_eliminados)
    ]
    if not permitidos:
        return []
    query = db.query(Subcontratista).filter(Subcontratista.proyecto_id.in_(permitidos))
    if not incluir_eliminados:
        query = sin_eliminados(query, Subcontratista)
    return query.offset(skip).limit(limit).all()


@router.get("/{subcontratista_id}", response_model=SubcontratistaResponse)
def get_subcontratista(
    subcontratista_id: int,
    incluir_eliminados: bool = False,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subcontratista = subcontratista_service.obtener_subcontratista(
        db, subcontratista_id, incluir_eliminados
    )
    if not subcontratista:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcontratista no encontrado")
    verificar_rol_proyecto(db, current_user, subcontratista.proyecto_id)
    return subcontratista


@router.post("/", response_model=SubcontratistaResponse, status_code=status.HTTP_201_CREATED)
def create_subcontratista(
    datos: SubcontratistaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _proyecto_existe(db, datos.proyecto_id)
    _exigir_arquitecto(db, datos.proyecto_id, current_user)
    return subcontratista_service.crear_subcontratista(db, datos)


@router.put("/{subcontratista_id}", response_model=SubcontratistaResponse)
def update_subcontratista(
    subcontratista_id: int,
    datos: SubcontratistaUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subcontratista = subcontratista_service.obtener_subcontratista(db, subcontratista_id)
    if not subcontratista:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcontratista no encontrado")
    _exigir_arquitecto(db, subcontratista.proyecto_id, current_user)
    actualizado = subcontratista_service.actualizar_subcontratista(db, subcontratista_id, datos)
    if not actualizado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcontratista no encontrado")
    return actualizado


@router.delete("/{subcontratista_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subcontratista(
    subcontratista_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subcontratista = subcontratista_service.obtener_subcontratista(db, subcontratista_id)
    if not subcontratista:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcontratista no encontrado")
    _exigir_arquitecto(db, subcontratista.proyecto_id, current_user)
    if not subcontratista_service.eliminar_subcontratista(db, subcontratista_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcontratista no encontrado")
    return None


@router.post("/{subcontratista_id}/restaurar", response_model=SubcontratistaResponse)
def restaurar_subcontratista(
    subcontratista_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subcontratista = subcontratista_service.obtener_subcontratista(
        db, subcontratista_id, incluir_eliminados=True
    )
    if not subcontratista:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcontratista no encontrado")
    _exigir_arquitecto(db, subcontratista.proyecto_id, current_user)
    restaurado = subcontratista_service.restaurar_subcontratista(db, subcontratista_id)
    if not restaurado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subcontratista no encontrado o no está eliminado"
        )
    return restaurado
