from typing import Optional

from sqlalchemy.orm import Session

from app.core.soft_delete import marcar_eliminado, restaurar, sin_eliminados
from app.models import Comentario, ColaboradorProyecto, ProyectoObra, Tarea, Usuario
from app.schemas import ComentarioCreate, TareaCreate, TareaUpdate


def _validar_proyecto(db: Session, proyecto_id: Optional[int]) -> int:
    if proyecto_id is None:
        raise ValueError("Debes indicar el proyecto de la tarea.")
    proyecto = db.query(ProyectoObra).filter(ProyectoObra.id == proyecto_id).first()
    if not proyecto:
        raise ValueError("El proyecto indicado no existe.")
    return proyecto.id


def _validar_usuario(db: Session, usuario_id: Optional[int], proyecto_id: Optional[int] = None) -> Optional[int]:
    if usuario_id is None:
        return None
    usuario = db.query(Usuario).filter(Usuario.id_usuario == usuario_id).first()
    if not usuario:
        raise ValueError("El usuario asignado no existe.")
    if proyecto_id is not None:
        colaborador = (
            db.query(ColaboradorProyecto)
            .filter(
                ColaboradorProyecto.usuario_id == usuario_id,
                ColaboradorProyecto.proyecto_id == proyecto_id,
            )
            .first()
        )
        if not colaborador:
            raise ValueError("El usuario asignado no es colaborador del proyecto.")
    return usuario.id_usuario


def listar_tareas(
    db: Session,
    proyecto_id: Optional[int] = None,
    incluir_eliminados: bool = False,
    skip: int = 0,
    limit: int = 100,
    proyectos_permitidos: Optional[list] = None,
):
    query = db.query(Tarea)
    if proyecto_id is not None:
        query = query.filter(Tarea.proyecto_id == proyecto_id)
    elif proyectos_permitidos is not None:
        if not proyectos_permitidos:
            return []
        query = query.filter(Tarea.proyecto_id.in_(proyectos_permitidos))
    if not incluir_eliminados:
        query = sin_eliminados(query, Tarea)
    return query.order_by(Tarea.id.desc()).offset(skip).limit(limit).all()


def obtener_tarea(db: Session, tarea_id: int, incluir_eliminados: bool = False) -> Optional[Tarea]:
    query = db.query(Tarea).filter(Tarea.id == tarea_id)
    if not incluir_eliminados:
        query = sin_eliminados(query, Tarea)
    return query.first()


def crear_tarea(db: Session, tarea: TareaCreate) -> Tarea:
    datos = tarea.model_dump()
    proyecto_id = _validar_proyecto(db, datos.get("proyecto_id"))
    datos["proyecto_id"] = proyecto_id
    datos["usuario_id"] = _validar_usuario(db, datos.get("usuario_id"), proyecto_id)
    nueva_tarea = Tarea(**datos)
    db.add(nueva_tarea)
    db.commit()
    db.refresh(nueva_tarea)
    return nueva_tarea


def actualizar_tarea(db: Session, tarea_id: int, datos: TareaUpdate) -> Optional[Tarea]:
    tarea = obtener_tarea(db, tarea_id)
    if not tarea:
        return None

    cambios = datos.model_dump(exclude_unset=True)
    if "usuario_id" in cambios:
        cambios["usuario_id"] = _validar_usuario(db, cambios["usuario_id"], tarea.proyecto_id)
    for campo, valor in cambios.items():
        setattr(tarea, campo, valor)

    db.commit()
    db.refresh(tarea)
    return tarea


def eliminar_tarea(db: Session, tarea_id: int) -> bool:
    tarea = obtener_tarea(db, tarea_id)
    if not tarea:
        return False

    marcar_eliminado(db, tarea)
    return True


def restaurar_tarea(db: Session, tarea_id: int) -> Optional[Tarea]:
    tarea = obtener_tarea(db, tarea_id, incluir_eliminados=True)
    if not tarea or tarea.fecha_eliminacion is None:
        return None

    restaurar(db, tarea)
    return tarea


def listar_comentarios(db: Session, tarea_id: int, incluir_eliminados: bool = False):
    query = db.query(Comentario).filter(Comentario.tarea_id == tarea_id)
    if not incluir_eliminados:
        query = sin_eliminados(query, Comentario)
    return query.order_by(Comentario.fecha_comentario.asc()).all()


def obtener_comentario(db: Session, comentario_id: int) -> Optional[Comentario]:
    return db.query(Comentario).filter(Comentario.id == comentario_id).first()


def crear_comentario(db: Session, tarea_id: int, usuario_id: int, comentario: ComentarioCreate) -> Comentario:
    usuario_valido_id = _validar_usuario(db, usuario_id)
    nuevo_comentario = Comentario(
        contenido=comentario.contenido,
        tarea_id=tarea_id,
        usuario_id=usuario_valido_id,
    )
    db.add(nuevo_comentario)
    db.commit()
    db.refresh(nuevo_comentario)
    return nuevo_comentario


def eliminar_comentario(db: Session, comentario_id: int) -> bool:
    comentario = db.query(Comentario).filter(Comentario.id == comentario_id).first()
    if not comentario or comentario.fecha_eliminacion is not None:
        return False

    marcar_eliminado(db, comentario)
    return True
