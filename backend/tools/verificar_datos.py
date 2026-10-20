"""
Verifica la integridad referencial y de negocio de la base de datos de Titan V.

Uso:  venv\\Scripts\\python tools\\verificar_datos.py
"""

import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    ActaCampo,
    Comentario,
    EnlaceInvitacion,
    EvidenciaMultimedia,
    HistorialMovimiento,
    InventarioObra,
    Material,
    ProyectoColaborador,
    ProyectoObra,
    SolicitudMaterial,
    Tarea,
    TurnoRelevo,
    Usuario,
)

problemas = []


def fallar(mensaje: str) -> None:
    problemas.append(mensaje)
    print(f"  [FALLA] {mensaje}")


def main() -> int:
    db = SessionLocal()
    try:
        print("=" * 72)
        print("CONTEO POR TABLA")
        print("=" * 72)
        modelos = [
            Usuario, ProyectoObra, ProyectoColaborador, Material, InventarioObra,
            HistorialMovimiento, Tarea, Comentario, TurnoRelevo, EvidenciaMultimedia,
            ActaCampo, SolicitudMaterial, EnlaceInvitacion,
        ]
        for modelo in modelos:
            total = db.query(modelo).count()
            print(f"  {modelo.__tablename__:24s} {total:>6}")

        print()
        print("=" * 72)
        print("REGLAS DE NEGOCIO")
        print("=" * 72)

        # 1. Todo proyecto debe tener al menos un Arquitecto
        for proyecto in db.query(ProyectoObra).all():
            arquitectos = (
                db.query(func.count(ProyectoColaborador.id))
                .filter(
                    ProyectoColaborador.proyecto_id == proyecto.id,
                    ProyectoColaborador.rol == "Arquitecto",
                )
                .scalar()
                or 0
            )
            if arquitectos == 0:
                fallar(f"proyecto '{proyecto.nombre_proyecto}' sin Arquitecto")
        print("  [OK] todo proyecto tiene al menos un Arquitecto")

        # 2. Todo material pertenece a un proyecto y tiene inventario
        for material in db.query(Material).all():
            if material.proyecto_id is None:
                fallar(f"material '{material.nombre_material}' sin proyecto")
                continue
            inventario = (
                db.query(InventarioObra)
                .filter(
                    InventarioObra.proyecto_id == material.proyecto_id,
                    InventarioObra.material_id == material.id,
                )
                .first()
            )
            if inventario is None:
                fallar(f"material '{material.nombre_material}' sin fila de inventario")
        print("  [OK] todo material pertenece a un proyecto y tiene inventario")

        # 3. El stock debe cuadrar con el kardex
        for inventario in db.query(InventarioObra).all():
            material = db.query(Material).get(inventario.material_id)
            movimientos = (
                db.query(HistorialMovimiento)
                .filter(
                    HistorialMovimiento.proyecto_id == inventario.proyecto_id,
                    HistorialMovimiento.material_id == inventario.material_id,
                )
                .all()
            )
            entradas = sum(m.cantidad for m in movimientos if m.tipo_movimiento != "Salida")
            salidas = sum(m.cantidad for m in movimientos if m.tipo_movimiento == "Salida")
            esperado = (material.cantidad_inicial if material else 0) + entradas - salidas
            if abs(esperado - inventario.cantidad_disponible) > 0.001:
                fallar(
                    f"stock descuadrado material {inventario.material_id} "
                    f"(proyecto {inventario.proyecto_id}): "
                    f"inventario={inventario.cantidad_disponible}, kardex={esperado}"
                )
        print("  [OK] cantidad_disponible = cantidad_inicial + entradas - salidas")

        # 4. Las tareas solo se asignan a colaboradores del propio proyecto
        for tarea in db.query(Tarea).filter(Tarea.usuario_id.isnot(None)).all():
            es_colaborador = (
                db.query(ProyectoColaborador)
                .filter(
                    ProyectoColaborador.proyecto_id == tarea.proyecto_id,
                    ProyectoColaborador.usuario_id == tarea.usuario_id,
                )
                .first()
            )
            if es_colaborador is None:
                fallar(f"tarea {tarea.id} asignada a un usuario que no es colaborador del proyecto")
        print("  [OK] toda tarea asignada pertenece a un colaborador del proyecto")

        # 5. Los comentarios y evidencias son de usuarios del proyecto
        for comentario in db.query(Comentario).all():
            tarea = db.query(Tarea).get(comentario.tarea_id)
            if tarea is None:
                fallar(f"comentario {comentario.id} sin tarea")
                continue
            es_colaborador = (
                db.query(ProyectoColaborador)
                .filter(
                    ProyectoColaborador.proyecto_id == tarea.proyecto_id,
                    ProyectoColaborador.usuario_id == comentario.usuario_id,
                )
                .first()
            )
            if es_colaborador is None:
                fallar(f"comentario {comentario.id} de un usuario no colaborador del proyecto")
        print("  [OK] todo comentario es de un colaborador del proyecto de la tarea")

        for evidencia in db.query(EvidenciaMultimedia).all():
            tarea = db.query(Tarea).get(evidencia.tarea_id)
            if tarea is None:
                fallar(f"evidencia {evidencia.id} sin tarea")
                continue
            es_colaborador = (
                db.query(ProyectoColaborador)
                .filter(
                    ProyectoColaborador.proyecto_id == tarea.proyecto_id,
                    ProyectoColaborador.usuario_id == evidencia.usuario_id,
                )
                .first()
            )
            if es_colaborador is None:
                fallar(f"evidencia {evidencia.id} de un usuario no colaborador del proyecto")
        print("  [OK] toda evidencia es de un colaborador del proyecto de la tarea")

        # 6. Los archivos de evidencia existen en disco
        from app.services.reporte_service import CARPETA_EVIDENCIAS

        for evidencia in db.query(EvidenciaMultimedia).all():
            nombre = evidencia.ruta_archivo.split("/")[-1]
            if not (Path(CARPETA_EVIDENCIAS) / nombre).exists():
                fallar(f"evidencia {evidencia.id}: no existe el archivo {nombre} en disco")
        print("  [OK] todos los archivos de evidencia existen en disco")

        # 7. Los turnos son de colaboradores del proyecto
        for turno in db.query(TurnoRelevo).all():
            es_colaborador = (
                db.query(ProyectoColaborador)
                .filter(
                    ProyectoColaborador.proyecto_id == turno.proyecto_id,
                    ProyectoColaborador.usuario_id == turno.usuario_id,
                )
                .first()
            )
            if es_colaborador is None:
                fallar(f"turno {turno.id} de un usuario no colaborador del proyecto")
        print("  [OK] todo turno es de un colaborador del proyecto")

        # 8. Las solicitudes son coherentes
        for solicitud in db.query(SolicitudMaterial).all():
            material = db.query(Material).get(solicitud.material_id)
            if material is None or material.proyecto_id != solicitud.proyecto_id:
                fallar(f"solicitud {solicitud.id}: el material no pertenece al proyecto")
        print("  [OK] toda solicitud referencia un material del mismo proyecto")

        # 9. Vocabularios de estado
        validos_proyecto = {"Planificación", "En Ejecución", "Finalizado"}
        validos_tarea = {"Pendiente", "En Proceso", "Completada"}
        validos_solicitud = {"Pendiente", "Aprobada", "Rechazada", "Entregada"}
        validos_asistencia = {"Programado", "Presente", "Ausente"}
        validos_movimiento = {"Entrada", "Salida", "Ajuste"}
        validos_rol = {"Arquitecto", "Trabajador", "Visualizador"}

        for proyecto in db.query(ProyectoObra).all():
            if proyecto.estado not in validos_proyecto:
                fallar(f"proyecto {proyecto.id} con estado invalido '{proyecto.estado}'")
        for tarea in db.query(Tarea).all():
            if tarea.estado not in validos_tarea:
                fallar(f"tarea {tarea.id} con estado invalido '{tarea.estado}'")
        for solicitud in db.query(SolicitudMaterial).all():
            if solicitud.estado not in validos_solicitud:
                fallar(f"solicitud {solicitud.id} con estado invalido '{solicitud.estado}'")
        for turno in db.query(TurnoRelevo).all():
            if turno.estado_asistencia not in validos_asistencia:
                fallar(f"turno {turno.id} con asistencia invalida '{turno.estado_asistencia}'")
        for movimiento in db.query(HistorialMovimiento).all():
            if movimiento.tipo_movimiento not in validos_movimiento:
                fallar(f"movimiento {movimiento.id} con tipo invalido '{movimiento.tipo_movimiento}'")
        for colab in db.query(ProyectoColaborador).all():
            if colab.rol not in validos_rol:
                fallar(f"colaborador {colab.id} con rol invalido '{colab.rol}'")
        print("  [OK] todos los estados y roles usan el vocabulario del frontend")

        # 10. Ningún proyecto sin datos de operación
        for proyecto in db.query(ProyectoObra).all():
            tareas = db.query(Tarea).filter(Tarea.proyecto_id == proyecto.id).count()
            materiales = db.query(Material).filter(Material.proyecto_id == proyecto.id).count()
            cols = db.query(ProyectoColaborador).filter(ProyectoColaborador.proyecto_id == proyecto.id).count()
            if tareas == 0 or materiales == 0 or cols == 0:
                print(
                    f"  [AVISO] proyecto '{proyecto.nombre_proyecto}': "
                    f"{cols} colaboradores, {materiales} materiales, {tareas} tareas"
                )
        print("  [OK] revision de cobertura por proyecto terminada")

        print()
        print("=" * 72)
        print("DISTRIBUCION")
        print("=" * 72)
        print("  Rol global de usuarios:", dict(Counter(u.rol for u in db.query(Usuario).all())))
        print("  Rol en proyectos      :", dict(Counter(c.rol for c in db.query(ProyectoColaborador).all())))
        print("  Estado de proyectos   :", dict(Counter(p.estado for p in db.query(ProyectoObra).all())))
        print("  Estado de tareas      :", dict(Counter(t.estado for t in db.query(Tarea).all())))
        print("  Estado de solicitudes :", dict(Counter(s.estado for s in db.query(SolicitudMaterial).all())))
        print("  Asistencia de turnos  :", dict(Counter(t.estado_asistencia for t in db.query(TurnoRelevo).all())))
        print("  Tipo de movimientos   :", dict(Counter(m.tipo_movimiento for m in db.query(HistorialMovimiento).all())))

        print()
        if problemas:
            print(f"{len(problemas)} problema(s) de integridad.")
            return 1
        print("Integridad OK: todas las relaciones y reglas se cumplen.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
