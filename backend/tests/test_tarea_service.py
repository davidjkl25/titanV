from datetime import date

import pytest

from app.core.database import SessionLocal
from app.models import ColaboradorProyecto, EstadoProyecto, ProyectoObra, RolProyecto, Tarea, Usuario
from app.schemas import TareaCreate
from app.services import tarea_service


def _crear_contexto(db):
    usuario = Usuario(
        nombres="Ana",
        apellidos="Pérez",
        correo_electronico="ana@example.com",
        contrasena_encriptada="hash",
        rol=3,
    )
    proyecto = ProyectoObra(
        nombre_proyecto="Obra piloto",
        ubicacion_direccion="Calle 1",
        estado=EstadoProyecto.PLANIFICACION.value,
        fecha_inicio=date(2026, 1, 1),
        fecha_fin_estimada=date(2026, 12, 31),
    )
    db.add_all([usuario, proyecto])
    db.commit()
    db.refresh(usuario)
    db.refresh(proyecto)
    db.add(
        ColaboradorProyecto(
            proyecto_id=proyecto.id,
            usuario_id=usuario.id_usuario,
            rol=RolProyecto.ARQUITECTO.value,
        )
    )
    db.commit()
    return usuario, proyecto


def test_crear_tarea_rechaza_proyecto_inexistente_sin_crear_registros():
    db = SessionLocal()
    _crear_contexto(db)
    totales_antes = (db.query(ProyectoObra).count(), db.query(Usuario).count())

    with pytest.raises(ValueError, match="proyecto indicado no existe"):
        tarea_service.crear_tarea(
            db,
            TareaCreate(nombre_tarea="Tarea inválida", proyecto_id=9999, usuario_id=None),
        )

    assert (db.query(ProyectoObra).count(), db.query(Usuario).count()) == totales_antes
    assert db.query(Tarea).count() == 0
    db.close()


def test_crear_tarea_rechaza_usuario_inexistente_y_no_colaborador():
    db = SessionLocal()
    usuario, proyecto = _crear_contexto(db)

    with pytest.raises(ValueError, match="usuario asignado no existe"):
        tarea_service.crear_tarea(
            db,
            TareaCreate(nombre_tarea="Tarea inválida", proyecto_id=proyecto.id, usuario_id=9999),
        )

    otro_usuario = Usuario(
        nombres="Luis",
        apellidos="Gómez",
        correo_electronico="luis@example.com",
        contrasena_encriptada="hash",
        rol=3,
    )
    db.add(otro_usuario)
    db.commit()
    db.refresh(otro_usuario)

    with pytest.raises(ValueError, match="no es colaborador"):
        tarea_service.crear_tarea(
            db,
            TareaCreate(
                nombre_tarea="Tarea inválida",
                proyecto_id=proyecto.id,
                usuario_id=otro_usuario.id_usuario,
            ),
        )

    assert db.query(Tarea).count() == 0
    assert usuario.id_usuario is not None
    db.close()


def test_crear_tarea_valida_colaborador_del_proyecto():
    db = SessionLocal()
    usuario, proyecto = _crear_contexto(db)
    tarea = tarea_service.crear_tarea(
        db,
        TareaCreate(
            nombre_tarea="Nivelación",
            proyecto_id=proyecto.id,
            usuario_id=usuario.id_usuario,
        ),
    )
    assert tarea.id is not None
    assert tarea.proyecto_id == proyecto.id
    assert tarea.usuario_id == usuario.id_usuario
    db.close()
