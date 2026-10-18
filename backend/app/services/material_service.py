from typing import Optional

from sqlalchemy.orm import Session

from app.core.soft_delete import marcar_eliminado, restaurar, sin_eliminados
<<<<<<< HEAD
from app.models import Material
from app.schemas import MaterialCreate, MaterialUpdate


def listar_materiales(db: Session, incluir_eliminados: bool = False, skip: int = 0, limit: int = 100):
    query = db.query(Material)
    if not incluir_eliminados:
        query = sin_eliminados(query, Material)
    return query.offset(skip).limit(limit).all()


def obtener_material(db: Session, material_id: int, incluir_eliminados: bool = False) -> Optional[Material]:
    query = db.query(Material).filter(Material.id == material_id)
    if not incluir_eliminados:
        query = sin_eliminados(query, Material)
    return query.first()


def crear_material(db: Session, material: MaterialCreate) -> Material:
    nuevo_material = Material(**material.model_dump())
    db.add(nuevo_material)
    db.commit()
    db.refresh(nuevo_material)
    return nuevo_material


def actualizar_material(db: Session, material_id: int, datos: MaterialUpdate) -> Optional[Material]:
    material = obtener_material(db, material_id)
    if not material:
        return None

    for campo, valor in datos.model_dump(exclude_unset=True).items():
=======
from app.models import InventarioObra, Material
from app.schemas import MaterialCreate, MaterialUpdate


def listar_materiales(
    db: Session,
    proyecto_id: int,
    incluir_eliminados: bool = False,
    skip: int = 0,
    limit: int = 100
):
    """Solo los insumos del proyecto indicado."""

    query = db.query(Material).filter(
        Material.proyecto_id == proyecto_id
    )

    if not incluir_eliminados:
        query = sin_eliminados(query, Material)

    return (
        query
        .order_by(Material.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def obtener_material(
    db: Session,
    material_id: int,
    incluir_eliminados: bool = False
) -> Optional[Material]:

    query = db.query(Material).filter(
        Material.id == material_id
    )

    if not incluir_eliminados:
        query = sin_eliminados(query, Material)

    return query.first()


def crear_material(
    db: Session,
    material: MaterialCreate
) -> Material:

    # Primero creamos el material
    nuevo_material = Material(
        nombre_material=material.nombre_material,
        unidad_medida=material.unidad_medida,
        cantidad_inicial=material.cantidad_inicial,
        proyecto_id=material.proyecto_id,
    )

    db.add(nuevo_material)
    db.flush()

    # Luego creamos su inventario inicial
    inventario = InventarioObra(
        proyecto_id=material.proyecto_id,
        material_id=nuevo_material.id,
        cantidad_disponible=material.cantidad_inicial,
    )

    db.add(inventario)

    db.commit()
    db.refresh(nuevo_material)

    return nuevo_material


def actualizar_material(
    db: Session,
    material_id: int,
    datos: MaterialUpdate
) -> Optional[Material]:

    material = obtener_material(db, material_id)

    if not material:
        return None

    for campo, valor in datos.model_dump(
        exclude_unset=True
    ).items():
>>>>>>> test
        setattr(material, campo, valor)

    db.commit()
    db.refresh(material)
<<<<<<< HEAD
    return material


def eliminar_material(db: Session, material_id: int) -> bool:
    """Soft delete: deja de listarse, pero el historial de movimientos que lo
    referencia sigue siendo consultable (no se pierde el kardex)."""
    material = obtener_material(db, material_id)
=======

    return material


def eliminar_material(
    db: Session,
    material_id: int
) -> bool:

    """Soft delete del material."""

    material = obtener_material(db, material_id)

>>>>>>> test
    if not material:
        return False

    marcar_eliminado(db, material)
<<<<<<< HEAD
    return True


def restaurar_material(db: Session, material_id: int) -> Optional[Material]:
    material = obtener_material(db, material_id, incluir_eliminados=True)
=======

    return True


def restaurar_material(
    db: Session,
    material_id: int
) -> Optional[Material]:

    material = obtener_material(
        db,
        material_id,
        incluir_eliminados=True
    )

>>>>>>> test
    if not material or material.fecha_eliminacion is None:
        return None

    restaurar(db, material)
<<<<<<< HEAD
=======

>>>>>>> test
    return material
