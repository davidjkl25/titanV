"""
Siembra un juego de datos de demostración completo en Titan V.

Crea usuarios con rol global, proyectos con colaboradores (Arquitecto /
Trabajador / Visualizador), inventario por proyecto con kardex inmutable,
tareas con comentarios y evidencias, turnos de campo, actas, solicitudes de
material y enlaces de invitación.

Uso:
    cd backend
    venv\\Scripts\\python tools\\sembrar_datos_demo.py            # siembra
    venv\\Scripts\\python tools\\sembrar_datos_demo.py --reset    # borra y vuelve a sembrar

Los datos quedan relacionados entre sí y respetan las reglas del dominio:
  - todo proyecto tiene al menos un Arquitecto
  - todo material pertenece a un proyecto y tiene su inventario
  - inventario_obras.cantidad_disponible = cantidad_inicial + entradas - salidas
  - las tareas solo se asignan a colaboradores del propio proyecto
  - las evidencias cuelgan de una tarea y las sube un colaborador
"""

import argparse
import os
import random
import struct
import sys
import zlib
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func  # noqa: E402

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
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
    RolProyecto,
    RolUsuario,
    SolicitudMaterial,
    Tarea,
    TurnoRelevo,
    Usuario,
)

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------
DOMINIO_DEMO = "@demo.titanv.co"
CONTRASENA_DEMO = "TitanV2026"
RUTA_UPLOADS = Path(__file__).resolve().parents[1] / "uploads"
CARPETA_EVIDENCIAS = RUTA_UPLOADS / "evidencias"
CARPETA_ACTAS = RUTA_UPLOADS / "actas"

ALEATORIO = random.Random(20260919)
# Las columnas de la base son TIMESTAMP WITHOUT TIME ZONE, asi que se trabaja
# en UTC naive (igual que el resto del backend).
AHORA = datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
def _png_obra(ancho: int, alto: int, semilla: int, titulo: str) -> bytes:
    """Genera un PNG válido que simula una foto de avance de obra."""
    rng = random.Random(semilla)
    r, g, b = rng.randint(30, 90), rng.randint(60, 120), rng.randint(90, 150)

    filas = []
    for y in range(alto):
        fila = bytearray([0])  # filtro "None" en cada scanline
        for x in range(ancho):
            # Suelo con degradado + retícula tipo plano de obra
            franja = int(28 * (y / alto))
            base_r = max(0, r - franja)
            base_g = max(0, g - franja)
            base_b = max(0, b - franja)
            if y > alto * 0.55:  # zona de terreno
                base_r, base_g, base_b = 120, 104, 78
                if (x // 40 + y // 40) % 2 == 0:
                    base_r, base_g, base_b = 132, 116, 88
            if x % 80 == 0 or y % 80 == 0:  # retícula
                base_r = min(255, base_r + 18)
                base_g = min(255, base_g + 18)
                base_b = min(255, base_b + 18)
            # Cuadros "estructura"
            if (x // 60 + y // 45) % 7 == 0 and y < alto * 0.6:
                base_r, base_g, base_b = 210, 150, 60
            fila += bytes((base_r, base_g, base_b))
        filas.append(bytes(fila))

    crudo = b"".join(filas)

    def bloque(tipo: bytes, datos: bytes) -> bytes:
        cuerpo = tipo + datos
        return struct.pack(">I", len(datos)) + cuerpo + struct.pack(">I", zlib.crc32(cuerpo) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", ancho, alto, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + bloque(b"IHDR", ihdr)
        + bloque(b"IDAT", zlib.compress(crudo, 6))
        + bloque(b"IEND", b"")
    )


def _pdf_acta(titulo: str, lineas: list) -> bytes:
    """Genera un PDF mínimo (una página) con el acta de campo."""
    contenido = ["BT", "/F1 16 Tf", "72 760 Td", f"({titulo}) Tj", "ET", "BT", "/F1 10 Tf", "72 735 Td"]
    for linea in lineas:
        contenido.append(f"({linea}) Tj")
        contenido.append("0 -14 Td")
    contenido.append("ET")
    flujo = "\n".join(contenido).encode("latin-1", "replace")

    objetos = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(flujo)).encode() + b" >>\nstream\n" + flujo + b"\nendstream",
    ]

    salida = bytearray(b"%PDF-1.4\n")
    offsets = []
    for indice, objeto in enumerate(objetos, start=1):
        offsets.append(len(salida))
        salida += f"{indice} 0 obj\n".encode() + objeto + b"\nendobj\n"

    inicio_xref = len(salida)
    salida += f"xref\n0 {len(objetos) + 1}\n".encode()
    salida += b"0000000000 65535 f \n"
    for offset in offsets:
        salida += f"{offset:010d} 00000 n \n".encode()
    salida += f"trailer\n<< /Size {len(objetos) + 1} /Root 1 0 R >>\nstartxref\n{inicio_xref}\n%%EOF\n".encode()
    return bytes(salida)


# ---------------------------------------------------------------------------
# Catálogos de datos
# ---------------------------------------------------------------------------
EQUIPO = [
    # (nombres, apellidos, rol global, certificación de maquinaria, activo, días para vencer la licencia)
    ("Laura", "Mendoza Rojas", RolUsuario.ADMIN, False, True, None),
    ("Andrés", "Quintero Lozano", RolUsuario.SUPERVISOR, True, True, 210),
    ("Marcela", "Villalba Gómez", RolUsuario.SUPERVISOR, False, True, 95),
    ("César", "Hoyos Martínez", RolUsuario.SUPERVISOR, True, True, 365),
    ("Jhon", "Restrepo Londoño", RolUsuario.OPERARIO, True, True, 180),
    ("Sara", "Alzate Carvajal", RolUsuario.OPERARIO, False, True, 40),
    ("Nicolás", "Cuiñas Rojas", RolUsuario.OPERARIO, True, True, 300),
    ("Diana", "Perozo Naik", RolUsuario.OPERARIO, False, True, None),
    ("Óscar", "Santamaría Ríos", RolUsuario.OPERARIO, False, False, 15),
    ("Karen", "Palacios Mejía", RolUsuario.OPERARIO, True, True, 250),
    ("Felipe", "Cardona Bedoya", RolUsuario.OPERARIO, False, True, 120),
    ("Yuliana", "Boyacá Quintero", RolUsuario.OPERARIO, False, True, None),
]

PROYECTOS_NUEVOS = [
    # (nombre, ubicación, estado, días desde el inicio, días hasta el fin)
    ("Torre Titan Norte", "Calle 134 # 9-42, Bogotá", "En Ejecución", -210, 480),
    ("Ampliación Ruta 7 Chía", "Autopista Norte km 18, Chía", "En Ejecución", -165, 395),
    ("Urbanización Ciudadela Sur", "Barrio Ciudadela, Soacha", "En Ejecución", -120, 540),
    ("Puente vehicular Río Blanco", "Vía Pereira - Armenia km 42", "Planificación", -25, 700),
    ("Remodelación C.C. Andes", "Calle 10 # 40-20, Medellín", "Finalizado", -640, -130),
]

# Catálogo de materiales de construcción con su unidad
CATALOGO_MATERIALES = [
    ("Cemento Gris ARGOS", "Saco"),
    ("Cemento Blanco Coron", "Saco"),
    ("Arena Lavada", "Metro cúbico (m³)"),
    ("Gravela Triturada", "Metro cúbico (m³)"),
    ("Acero Pulgado 1/2\"", "Varilla"),
    ("Acero Pulgado 5/8\"", "Varilla"),
    ("Acero Pulgado 3/4\"", "Varilla"),
    ("Ladrillo Cocido", "Unidad"),
    ("Bloque de Concreto", "Unidad"),
    ("Concreto Premezclado 3000 PSI", "Metro cúbico (m³)"),
    ("Mortero de pega", "Metro cúbico (m³)"),
    ("Almohadilla para ladrillo", "Unidad"),
    ("Teja de Zinc", "Rollo"),
    ("Teja Colonial", "Unidad"),
    ("Malla de welded 6x6", "Rollo"),
    ("Alambre de amarre", "Kilogramo (kg)"),
    ("Pintura interiores (blanco)", "Galón"),
    ("Pintura exterior (beige)", "Galón"),
    ("Esmalte para metal", "Litro (L)"),
    ("Solvente para limpieza", "Galón"),
    ("Madera de encofrado", "Metro (m)"),
    ("Tablero de encofrado", "Unidad"),
    ("Puntal metálico 3 m", "Unidad"),
    ("Cinta de enmascarar", "Rollo"),
    ("Guantes de cuero", "Par"),
    ("Casco de seguridad", "Unidad"),
    ("Botas de jebe", "Par"),
    ("Chaleco reflectivo", "Unidad"),
    ("Herramienta: broca SDS", "Unidad"),
]

# Tareas tipo de obra, con el estado y la descripción
CATALOGO_TAREAS = [
    ("Replanteo de ejes", "Verificación de los ejes de columnas contra el plano estructural aprobado.", "Completada"),
    ("Excavación para cimientos", "Excavación, nivelación y compactación del suelo de fundación.", "Completada"),
    ("Cimentación de zijas", "Armado de refuerzo, instalación de soportes y vaciado de cimiento.", "Completada"),
    ("Placa de piso 1", "Encofrado, instalación de malla y vaciado de la losa de primer nivel.", "En Proceso"),
    ("Muros en mampostería", "Levantamiento de muros en ladrillo con mortero de pega hasta la altura de diseño.", "En Proceso"),
    ("Instalación de tubería eléctrica", "Tendido de canalizaciones y cables en losas y muros.", "En Proceso"),
    ("Instalación de tubería sanitaria", "Tendido de redes de aguas residuales y pluviales con las pendientes definidas.", "Pendiente"),
    ("Vaciado de cubierta", "Vaciado del losado de cubierta y aplicación de impermeabilización.", "Pendiente"),
    ("Pañetes y acabados", "Pañete interior y exterior de muros con mortero fino.", "Pendiente"),
    ("Enchape cerámico", "Instalación de enchape cerámico en zonas húmedas y áreas comunes secas.", "Pendiente"),
    ("Pintura general", "Preparación de superficies, aplicación de imprimante y dos manos de pintura.", "Pendiente"),
    ("Adecuación de accesos", "Construcción de senderos peatonales, escaleras y plataforma de acceso.", "Pendiente"),
    ("Pruebas de instalaciones", "Pruebas de presión de redes y pruebas funcionales eléctricas.", "Pendiente"),
    ("Limpieza final y entrega", "Retiro de escombros, limpieza general y acta de entrega al cliente.", "Completada"),
]

COMENTARIOS_OBRA = [
    "Se ajustó la cantidad de material según el rendimiento real del día.",
    "Quedó pendiente revisar el nivel de las columnas del segundo sector.",
    "El equipo reporta jornada favorable. Se continúa sin novedades.",
    "Se desmontó la formaleta y se vació el concreto de la losa.",
    "Solicito revisión del plano porque hay una interferencia con la instalación existente.",
    "Se entregaron los materiales al frente de trabajo.",
    "Correctivo: se corrigió la plomada de los muros del norte.",
    "Se documentó el avance con fotos en la evidencia de la tarea.",
    "El clima no afecta el cronograma de esta actividad.",
    "Se coordinó con la interventoría para el visto bueno del traspaso.",
]

DESCRIPCIONES_EVIDENCIA = [
    "Frente de trabajo al inicio de la jornada.",
    "Detalle del elemento ejecutado.",
    "Maquinaria operando en el sector.",
    "Acabado terminado de la unidad.",
    "Panorámica general del avance.",
]

ESTADOS_SOLICITUD = ["Pendiente", "Aprobada", "Rechazada", "Entregada"]
ESTADOS_ASISTENCIA = ["Presente", "Presente", "Presente", "Ausente", "Programado"]


# ---------------------------------------------------------------------------
# Siembra
# ---------------------------------------------------------------------------
def borrar_datos_demo(db) -> None:
    """Elimina los proyectos demo y todo lo que cuelga de ellos.

    Los usuarios demo NO se borran: si se eliminaran, el ON DELETE CASCADE de
    PostgreSQL se llevaria por delante los movimientos, comentarios y turnos
    de los proyectos del equipo que tambien los referencia.
    """
    proyectos_demo = [
        p.id
        for p in db.query(ProyectoObra).filter(ProyectoObra.nombre_proyecto.in_([d[0] for d in PROYECTOS_NUEVOS])).all()
    ]

    if proyectos_demo:
        db.query(EvidenciaMultimedia).filter(EvidenciaMultimedia.tarea_id.in_(
            db.query(Tarea.id).filter(Tarea.proyecto_id.in_(proyectos_demo))
        )).delete(synchronize_session=False)
        db.query(Comentario).filter(Comentario.tarea_id.in_(
            db.query(Tarea.id).filter(Tarea.proyecto_id.in_(proyectos_demo))
        )).delete(synchronize_session=False)
        db.query(Tarea).filter(Tarea.proyecto_id.in_(proyectos_demo)).delete(synchronize_session=False)
        db.query(HistorialMovimiento).filter(HistorialMovimiento.proyecto_id.in_(proyectos_demo)).delete(synchronize_session=False)
        db.query(InventarioObra).filter(InventarioObra.proyecto_id.in_(proyectos_demo)).delete(synchronize_session=False)
        db.query(Material).filter(Material.proyecto_id.in_(proyectos_demo)).delete(synchronize_session=False)
        db.query(SolicitudMaterial).filter(SolicitudMaterial.proyecto_id.in_(proyectos_demo)).delete(synchronize_session=False)
        db.query(TurnoRelevo).filter(TurnoRelevo.proyecto_id.in_(proyectos_demo)).delete(synchronize_session=False)
        db.query(EnlaceInvitacion).filter(EnlaceInvitacion.proyecto_id.in_(proyectos_demo)).delete(synchronize_session=False)
        db.query(ActaCampo).filter(ActaCampo.proyecto_id.in_(proyectos_demo)).delete(synchronize_session=False)
        db.query(ProyectoColaborador).filter(ProyectoColaborador.proyecto_id.in_(proyectos_demo)).delete(synchronize_session=False)
        db.query(ProyectoObra).filter(ProyectoObra.id.in_(proyectos_demo)).delete(synchronize_session=False)

    db.commit()
    print(f"  Proyectos demo eliminados: {len(proyectos_demo)}.")


def _correo_demo(nombres: str, apellidos: str) -> str:
    """Construye el correo del usuario sin tildes ni espacios, para que sea
    fácil de escribir a mano: jhon.restrepo@demo.titanv.co"""
    import unicodedata

    def limpiar(texto: str) -> str:
        plano = unicodedata.normalize("NFKD", texto)
        return "".join(c for c in plano if not unicodedata.combining(c)).encode("ascii", "ignore").decode()

    primero = limpiar(nombres.split()[0]).lower()
    segundo = limpiar(apellidos.split()[0]).lower()
    return f"{primero}.{segundo}{DOMINIO_DEMO}"


def crear_usuarios(db) -> list:
    """Crea el equipo de obra y devuelve la lista de usuarios en orden."""
    usuarios = []
    for nombres, apellidos, rol, certificacion, activo, dias_licencia in EQUIPO:
        correo = _correo_demo(nombres, apellidos)
        existente = db.query(Usuario).filter(Usuario.correo_electronico == correo).first()
        licencia = AHORA.date() + timedelta(days=dias_licencia) if dias_licencia else None
        if existente:
            # Se actualiza en lugar de recrear: conserva el id y no rompe las
            # filas que lo referencian en otros proyectos.
            existente.nombres = nombres
            existente.apellidos = apellidos
            existente.rol = rol.value
            existente.activo = activo
            existente.tiene_certificacion_maquinaria = certificacion
            existente.fecha_vencimiento_licencia = licencia
            existente.intentos_fallidos = 0
            db.flush()
            usuarios.append(existente)
            continue

        usuario = Usuario(
            nombres=nombres,
            apellidos=apellidos,
            correo_electronico=correo,
            contrasena_encriptada=hash_password(CONTRASENA_DEMO),
            rol=rol.value,
            intentos_fallidos=0,
            activo=activo,
            fecha_vencimiento_licencia=licencia,
            tiene_certificacion_maquinaria=certificacion,
        )
        db.add(usuario)
        db.flush()
        usuarios.append(usuario)
    db.commit()
    return usuarios


def obtener_o_crear_proyecto(db, nombre, ubicacion, estado, inicio, fin) -> ProyectoObra:
    proyecto = db.query(ProyectoObra).filter(ProyectoObra.nombre_proyecto == nombre).first()
    if proyecto:
        return proyecto
    proyecto = ProyectoObra(
        nombre_proyecto=nombre,
        ubicacion_direccion=ubicacion,
        estado=estado,
        fecha_inicio=inicio,
        fecha_fin_estimada=fin,
    )
    db.add(proyecto)
    db.flush()
    return proyecto


def asegurar_colaborador(db, proyecto_id: int, usuario_id: int, rol: str) -> None:
    existente = (
        db.query(ProyectoColaborador)
        .filter(ProyectoColaborador.proyecto_id == proyecto_id, ProyectoColaborador.usuario_id == usuario_id)
        .first()
    )
    if existente:
        # Si ya es colaborador pero con otro rol, se conserva el más alto
        if rol == RolProyecto.ARQUITECTO.value and existente.rol != RolProyecto.ARQUITECTO.value:
            existente.rol = RolProyecto.ARQUITECTO.value
        return
    db.add(
        ProyectoColaborador(
            proyecto_id=proyecto_id,
            usuario_id=usuario_id,
            rol=rol,
            fecha_vinculacion=AHORA - timedelta(days=ALEATORIO.randint(10, 180)),
        )
    )


def _sembrar_colaboradores(db, proyecto: ProyectoObra, usuarios: list, rng) -> tuple:
    """Asigna el equipo al proyecto. Devuelve (arquitectos, trabajadores, visualizadores)."""
    administradores = [u for u in usuarios if u.rol == RolUsuario.ADMIN.value]
    supervisores = [u for u in usuarios if u.rol == RolUsuario.SUPERVISOR.value]
    operarios = [u for u in usuarios if u.rol == RolUsuario.OPERARIO.value and u.activo]

    arquitectos = [administradores[0]] + rng.sample(supervisores, k=min(2, len(supervisores)))
    trabajadores = rng.sample(operarios, k=min(rng.randint(3, 5), len(operarios)))
    visualizadores = [u for u in rng.sample(operarios, k=min(2, len(operarios))) if u not in trabajadores]
    if not visualizadores:
        visualizadores = [u for u in operarios if u not in trabajadores][:1]

    for usuario in arquitectos:
        asegurar_colaborador(db, proyecto.id, usuario.id_usuario, RolProyecto.ARQUITECTO.value)
    for usuario in trabajadores:
        asegurar_colaborador(db, proyecto.id, usuario.id_usuario, RolProyecto.TRABAJADOR.value)
    for usuario in visualizadores:
        asegurar_colaborador(db, proyecto.id, usuario.id_usuario, RolProyecto.VISUALIZADOR.value)
    db.flush()

    return arquitectos, trabajadores, visualizadores


def _sembrar_inventario(db, proyecto: ProyectoObra, rng, equipo: tuple, objetivo: int = 8) -> dict:
    """Agrega materiales con su inventario y su kardex hasta llegar a `objetivo`."""
    arquitectos, trabajadores, _ = equipo
    autores = trabajadores + arquitectos
    conteo = {"materiales": 0, "movimientos": 0}

    actuales = db.query(Material).filter(
        Material.proyecto_id == proyecto.id, Material.fecha_eliminacion.is_(None)
    ).count()
    faltan = max(0, objetivo - actuales)
    if not faltan:
        return conteo

    nombres_usados = {
        m.nombre_material
        for m in db.query(Material).filter(Material.proyecto_id == proyecto.id).all()
    }
    catalogo = [c for c in CATALOGO_MATERIALES if c[0] not in nombres_usados] or CATALOGO_MATERIALES

    for nombre_material, unidad in rng.sample(catalogo, k=min(faltan, len(catalogo))):
        cantidad_inicial = float(rng.choice([10, 20, 25, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 500]))
        material = Material(
            proyecto_id=proyecto.id,
            nombre_material=nombre_material,
            unidad_medida=unidad,
            cantidad_inicial=cantidad_inicial,
        )
        db.add(material)
        db.flush()
        _kardex_de_un_material(db, material, rng, autores)
        conteo["materiales"] += 1
        conteo["movimientos"] += (
            db.query(HistorialMovimiento)
            .filter(HistorialMovimiento.material_id == material.id)
            .count()
        )

    db.flush()
    return conteo


def _sembrar_tareas(db, proyecto: ProyectoObra, rng, equipo: tuple, objetivo: int = 8) -> dict:
    """Agrega tareas con comentarios y evidencias hasta llegar a `objetivo`."""
    arquitectos, trabajadores, _ = equipo
    conteo = {"tareas": 0, "comentarios": 0, "evidencias": 0}

    actuales = db.query(Tarea).filter(
        Tarea.proyecto_id == proyecto.id, Tarea.fecha_eliminacion.is_(None)
    ).count()
    faltan = max(0, objetivo - actuales)
    if not faltan:
        return conteo

    titulos_usados = {
        t.nombre_tarea for t in db.query(Tarea).filter(Tarea.proyecto_id == proyecto.id).all()
    }
    catalogo = [t for t in CATALOGO_TAREAS if t[0] not in titulos_usados] or CATALOGO_TAREAS

    for nombre_tarea, descripcion, estado in rng.sample(catalogo, k=min(faltan, len(catalogo))):
        asignado = rng.choice(trabajadores)
        fecha_inicio = AHORA.date() - timedelta(days=rng.randint(5, 150))
        duracion = rng.randint(5, 45)
        tarea = Tarea(
            proyecto_id=proyecto.id,
            usuario_id=asignado.id_usuario,
            nombre_tarea=nombre_tarea,
            descripcion=descripcion,
            estado=estado,
            fecha_inicio=fecha_inicio,
            fecha_fin_estimada=fecha_inicio + timedelta(days=duracion),
            fecha_asignacion=fecha_inicio - timedelta(days=rng.randint(0, 4)),
        )
        db.add(tarea)
        db.flush()
        conteo["tareas"] += 1

        for _ in range(rng.randint(1, 3)):
            autor = rng.choice([asignado] + arquitectos)
            db.add(
                Comentario(
                    tarea_id=tarea.id,
                    usuario_id=autor.id_usuario,
                    contenido=rng.choice(COMENTARIOS_OBRA),
                    fecha_comentario=AHORA - timedelta(days=rng.randint(0, 40), hours=rng.randint(0, 9)),
                )
            )
            conteo["comentarios"] += 1

        if rng.random() < 0.65:
            for _ in range(rng.randint(1, 2)):
                CARPETA_EVIDENCIAS.mkdir(parents=True, exist_ok=True)
                nombre_archivo = f"{nombre_tarea[:28].strip().replace(' ', '_')}.png"
                nombre_unico = f"{rng.getrandbits(64):016x}.png"
                ruta_relativa = f"/uploads/evidencias/{nombre_unico}"
                (CARPETA_EVIDENCIAS / nombre_unico).write_bytes(
                    _png_obra(640, 360, rng.randint(1, 10**9), nombre_tarea)
                )
                db.add(
                    EvidenciaMultimedia(
                        tarea_id=tarea.id,
                        usuario_id=asignado.id_usuario,
                        nombre_archivo=nombre_archivo,
                        ruta_archivo=ruta_relativa,
                        descripcion=rng.choice(DESCRIPCIONES_EVIDENCIA),
                        fecha_subida=AHORA - timedelta(days=rng.randint(0, 60), hours=rng.randint(0, 9)),
                    )
                )
                conteo["evidencias"] += 1

    db.flush()
    return conteo


def _sembrar_turnos(db, proyecto: ProyectoObra, rng, equipo: tuple) -> dict:
    """Genera los turnos de las ultimas tres semanas (solo los que falten)."""
    _, trabajadores, _ = equipo
    conteo = {"turnos": 0}

    existentes = {
        (t.usuario_id, t.fecha_turno)
        for t in db.query(TurnoRelevo).filter(TurnoRelevo.proyecto_id == proyecto.id).all()
    }

    dia = AHORA.date() - timedelta(days=21)
    while dia <= AHORA.date():
        if dia.weekday() < 5:
            for usuario in trabajadores:
                if (usuario.id_usuario, dia) in existentes:
                    continue
                if rng.random() < 0.82:
                    db.add(
                        TurnoRelevo(
                            proyecto_id=proyecto.id,
                            usuario_id=usuario.id_usuario,
                            fecha_turno=dia,
                            hora_inicio=time(6, 0) if rng.random() < 0.5 else time(7, 0),
                            hora_fin=time(14, 0) if rng.random() < 0.5 else time(15, 0),
                            estado_asistencia=rng.choice(ESTADOS_ASISTENCIA),
                        )
                    )
                    conteo["turnos"] += 1
        dia += timedelta(days=1)

    db.flush()
    return conteo


def _sembrar_solicitudes(db, proyecto: ProyectoObra, rng, equipo: tuple) -> dict:
    """Crea solicitudes de material en distintos estados."""
    _, trabajadores, _ = equipo
    conteo = {"solicitudes": 0}

    actuales = db.query(SolicitudMaterial).filter(SolicitudMaterial.proyecto_id == proyecto.id).count()
    faltan = max(0, rng.randint(1, 4) - actuales)
    materiales = db.query(Material).filter(
        Material.proyecto_id == proyecto.id, Material.fecha_eliminacion.is_(None)
    ).all()
    if not materiales or not faltan:
        return conteo

    for _ in range(faltan):
        material = rng.choice(materiales)
        db.add(
            SolicitudMaterial(
                proyecto_id=proyecto.id,
                material_id=material.id,
                usuario_id=rng.choice(trabajadores).id_usuario,
                cantidad=float(rng.choice([2, 4, 5, 10, 15, 20, 30])),
                estado=rng.choice(ESTADOS_SOLICITUD),
                fecha_solicitud=AHORA - timedelta(days=rng.randint(1, 45)),
                fecha_actualizacion=AHORA - timedelta(days=rng.randint(0, 20)),
            )
        )
        conteo["solicitudes"] += 1

    db.flush()
    return conteo


def _sembrar_actas(db, proyecto: ProyectoObra, rng) -> dict:
    """Genera las actas de campo con su PDF en disco."""
    conteo = {"actas": 0}

    actuales = db.query(ActaCampo).filter(ActaCampo.proyecto_id == proyecto.id).count()
    if actuales >= 2:
        return conteo

    CARPETA_ACTAS.mkdir(parents=True, exist_ok=True)
    for indice in range(actuales, rng.randint(1, 2)):
        momento = AHORA - timedelta(days=rng.randint(10, 200))
        nombre_pdf = f"acta_{proyecto.id}_{indice + 1}.pdf"
        (CARPETA_ACTAS / nombre_pdf).write_bytes(
            _pdf_acta(
                f"Acta de campo - {proyecto.nombre_proyecto}",
                [
                    f"Acta N. {indice + 1} - {momento:%d/%m/%Y}",
                    f"Obra: {proyecto.nombre_proyecto}",
                    f"Ubicacion: {proyecto.ubicacion_direccion}",
                    "Responsable: Arquitecto de la obra",
                    "Estado de la obra: avance conforme al cronograma pactado.",
                    "Observaciones: sin novedades relevantes en este periodo.",
                ],
            )
        )
        db.add(
            ActaCampo(
                proyecto_id=proyecto.id,
                fecha_generacion=momento,
                ruta_pdf=f"/uploads/actas/{nombre_pdf}",
                firma_supervisor_url=None,
                firma_operario_url=None,
                coordenadas_gps=f"4.{rng.randint(60, 75)}N, -{rng.randint(70, 80)}.{rng.randint(1000, 9999)}",
                marca_agua_timestamp=f"{momento:%Y-%m-%d %H:%M:%S}",
            )
        )
        conteo["actas"] += 1

    db.flush()
    return conteo


def _sembrar_enlace(db, proyecto: ProyectoObra, rng, arquitectos: list) -> dict:
    """Crea un enlace de invitación vigente."""
    conteo = {"enlaces": 0}
    if db.query(EnlaceInvitacion).filter(EnlaceInvitacion.proyecto_id == proyecto.id).count() > 0:
        return conteo
    db.add(
        EnlaceInvitacion(
            proyecto_id=proyecto.id,
            creado_por_id=arquitectos[0].id_usuario,
            rol=RolProyecto.TRABAJADOR.value,
            token=ALEATORIO.getrandbits(192).to_bytes(24, "big").hex(),
            fecha_creacion=AHORA - timedelta(days=rng.randint(1, 20)),
            fecha_expiracion=AHORA + timedelta(days=rng.randint(1, 6)),
            activo=True,
        )
    )
    conteo["enlaces"] = 1
    db.flush()
    return conteo


def sembrar_proyecto(db, proyecto: ProyectoObra, usuarios: list, semilla: int) -> dict:
    """Siembra (o completa) un proyecto. Es idempotente: solo agrega lo que falta."""
    rng = random.Random(semilla)
    conteo = {
        "materiales": 0, "movimientos": 0, "tareas": 0, "comentarios": 0,
        "evidencias": 0, "turnos": 0, "solicitudes": 0, "actas": 0, "enlaces": 0,
        "colaboradores": 0,
    }

    antes = db.query(ProyectoColaborador).filter(ProyectoColaborador.proyecto_id == proyecto.id).count()
    arquitectos, trabajadores, visualizadores = _sembrar_colaboradores(db, proyecto, usuarios, rng)
    conteo["colaboradores"] = db.query(ProyectoColaborador).filter(
        ProyectoColaborador.proyecto_id == proyecto.id
    ).count() - antes

    for bloque in (
        _sembrar_inventario(db, proyecto, rng, (arquitectos, trabajadores, visualizadores)),
        _sembrar_tareas(db, proyecto, rng, (arquitectos, trabajadores, visualizadores)),
        _sembrar_turnos(db, proyecto, rng, (arquitectos, trabajadores, visualizadores)),
        _sembrar_solicitudes(db, proyecto, rng, (arquitectos, trabajadores, visualizadores)),
        _sembrar_actas(db, proyecto, rng),
        _sembrar_enlace(db, proyecto, rng, arquitectos),
    ):
        for clave, valor in bloque.items():
            conteo[clave] += valor

    # Un material dado de baja (soft delete) para que se vea la funcion
    if rng.random() < 0.4:
        material = (
            db.query(Material)
            .filter(Material.proyecto_id == proyecto.id, Material.fecha_eliminacion.is_(None))
            .first()
        )
        if material:
            material.fecha_eliminacion = AHORA - timedelta(days=rng.randint(3, 40))

    # Una tarea dada de baja (soft delete)
    if rng.random() < 0.4:
        tarea = (
            db.query(Tarea)
            .filter(Tarea.proyecto_id == proyecto.id, Tarea.fecha_eliminacion.is_(None))
            .first()
        )
        if tarea:
            tarea.fecha_eliminacion = AHORA - timedelta(days=rng.randint(2, 30))

    db.commit()
    return conteo
def _kardex_de_un_material(db, material, rng, usuarios_del_proyecto) -> None:
    """Genera un kardex coherente para un material y deja el stock en su valor real."""
    total_entradas = 0.0
    total_salidas = 0.0
    movimientos = []

    for _ in range(rng.randint(1, 2)):
        cantidad = float(rng.choice([20, 30, 50, 80, 100]))
        movimientos.append(("Entrada", cantidad))
        total_entradas += cantidad
    for _ in range(rng.randint(1, 3)):
        cantidad = float(rng.choice([2, 5, 10, 15, 25]))
        if cantidad > (material.cantidad_inicial + total_entradas - total_salidas):
            continue
        movimientos.append(("Salida", cantidad))
        total_salidas += cantidad
    if rng.random() < 0.35:
        ajuste = float(rng.choice([1, 2, 5]))
        movimientos.append(("Ajuste", ajuste))
        total_entradas += ajuste

    # El inventario debe existir antes que el movimiento: el trigger de
    # PostgreSQL valida el stock de las salidas en ese momento. Se fija en el
    # saldo mas alto que puede alcanzar la linea de tiempo para que ninguna
    # salida quede sin cobertura; al final se deja el saldo real.
    saldo_maximo = material.cantidad_inicial + total_entradas + total_salidas
    inventario = (
        db.query(InventarioObra)
        .filter(
            InventarioObra.proyecto_id == material.proyecto_id,
            InventarioObra.material_id == material.id,
        )
        .first()
    )
    if inventario is None:
        inventario = InventarioObra(
            proyecto_id=material.proyecto_id,
            material_id=material.id,
            cantidad_disponible=saldo_maximo,
        )
        db.add(inventario)
    else:
        inventario.cantidad_disponible = saldo_maximo
    db.flush()

    for tipo, cantidad in movimientos:
        db.add(
            HistorialMovimiento(
                proyecto_id=material.proyecto_id,
                material_id=material.id,
                usuario_id=rng.choice(usuarios_del_proyecto).id_usuario,
                tipo_movimiento=tipo,
                cantidad=cantidad,
                fecha_movimiento=AHORA - timedelta(days=rng.randint(1, 200), hours=rng.randint(0, 9)),
            )
        )
    db.flush()

    inventario.cantidad_disponible = material.cantidad_inicial + total_entradas - total_salidas


def reparar_datos_previos(db, usuarios: list) -> None:
    """Deja coherentes los datos que ya existian en la base antes de la siembra.

    - materiales sin fila de inventario
    - materiales cuyo stock no cuadra con el kardex (se regenera el kardex)
    - proyectos sin colaboradores
    - tareas asignadas a alguien que no es colaborador del proyecto
    - evidencias cuyo archivo no esta en disco (esta maquina no los traia)
    """
    rng = random.Random(777)

    # Materiales sin inventario o con el stock descuadrado
    for material in db.query(Material).all():
        if material.proyecto_id is None:
            continue
        movimientos = (
            db.query(HistorialMovimiento)
            .filter(
                HistorialMovimiento.proyecto_id == material.proyecto_id,
                HistorialMovimiento.material_id == material.id,
            )
            .count()
        )
        inventario = (
            db.query(InventarioObra)
            .filter(
                InventarioObra.proyecto_id == material.proyecto_id,
                InventarioObra.material_id == material.id,
            )
            .first()
        )

        if movimientos == 0:
            if material.fecha_eliminacion is not None:
                # Material dado de baja sin kardex: el stock solo puede ser el inicial
                if inventario is None:
                    db.add(
                        InventarioObra(
                            proyecto_id=material.proyecto_id,
                            material_id=material.id,
                            cantidad_disponible=material.cantidad_inicial or 0,
                        )
                    )
                else:
                    inventario.cantidad_disponible = material.cantidad_inicial or 0
                continue
            # Sin kardex no hay forma de explicar el stock: se genera uno
            colaboradores = [
                c.usuario
                for c in db.query(ProyectoColaborador)
                .filter(ProyectoColaborador.proyecto_id == material.proyecto_id)
                .all()
            ]
            autores = colaboradores or usuarios
            _kardex_de_un_material(db, material, rng, autores)
            print(f"  kardex generado para el material '{material.nombre_material}'")
            continue

        # Con kardex: el inventario es siempre la consecuencia de los movimientos
        entradas = (
            db.query(func.coalesce(func.sum(HistorialMovimiento.cantidad), 0))
            .filter(
                HistorialMovimiento.proyecto_id == material.proyecto_id,
                HistorialMovimiento.material_id == material.id,
                HistorialMovimiento.tipo_movimiento != "Salida",
            )
            .scalar()
            or 0
        )
        salidas = (
            db.query(func.coalesce(func.sum(HistorialMovimiento.cantidad), 0))
            .filter(
                HistorialMovimiento.proyecto_id == material.proyecto_id,
                HistorialMovimiento.material_id == material.id,
                HistorialMovimiento.tipo_movimiento == "Salida",
            )
            .scalar()
            or 0
        )
        stock_real = (material.cantidad_inicial or 0) + entradas - salidas
        if inventario is None:
            db.add(
                InventarioObra(
                    proyecto_id=material.proyecto_id,
                    material_id=material.id,
                    cantidad_disponible=stock_real,
                )
            )
            print(f"  inventario creado para el material '{material.nombre_material}'")
        elif abs(inventario.cantidad_disponible - stock_real) > 0.001:
            inventario.cantidad_disponible = stock_real
            print(f"  stock corregido para el material '{material.nombre_material}': {stock_real}")

    db.flush()

    # Proyectos sin colaboradores: se les asigna el equipo demo
    for proyecto in db.query(ProyectoObra).filter(ProyectoObra.fecha_eliminacion.is_(None)).all():
        cols = db.query(ProyectoColaborador).filter(ProyectoColaborador.proyecto_id == proyecto.id).count()
        if cols == 0:
            for usuario in usuarios[:4]:
                asegurar_colaborador(db, proyecto.id, usuario.id_usuario, RolProyecto.ARQUITECTO.value)
            for usuario in usuarios[4:9]:
                asegurar_colaborador(db, proyecto.id, usuario.id_usuario, RolProyecto.TRABAJADOR.value)
            print(f"  colaboradores asignados al proyecto '{proyecto.nombre_proyecto}'")

    db.flush()

    # Tareas asignadas a un usuario que no pertenece al proyecto
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
            arquitecto = (
                db.query(ProyectoColaborador)
                .filter(
                    ProyectoColaborador.proyecto_id == tarea.proyecto_id,
                    ProyectoColaborador.rol == RolProyecto.ARQUITECTO.value,
                )
                .first()
            )
            if arquitecto is not None:
                tarea.usuario_id = arquitecto.usuario_id
                print(f"  tarea {tarea.id} reasignada al Arquitecto del proyecto {tarea.proyecto_id}")

    # Evidencias sin archivo en disco
    for evidencia in db.query(EvidenciaMultimedia).all():
        nombre = evidencia.ruta_archivo.split("/")[-1]
        if not (CARPETA_EVIDENCIAS / nombre).exists():
            CARPETA_EVIDENCIAS.mkdir(parents=True, exist_ok=True)
            (CARPETA_EVIDENCIAS / nombre).write_bytes(
                _png_obra(640, 360, evidencia.id * 7919, evidencia.nombre_archivo)
            )
            print(f"  archivo generado para la evidencia {evidencia.id} ({nombre})")

    db.commit()


def main() -> int:
    parser = argparse.ArgumentParser(description="Siembra datos de demostración en Titan V.")
    parser.add_argument("--reset", action="store_true", help="Borra los datos demo anteriores antes de sembrar.")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if args.reset:
            print("Borrando datos de demostración anteriores...")
            borrar_datos_demo(db)

        ya_existe = db.query(Usuario).filter(Usuario.correo_electronico.like(f"%{DOMINIO_DEMO}")).count()
        if ya_existe and not args.reset:
            print(f"Ya existen {ya_existe} usuarios demo. Usa --reset para regenerar los proyectos.")
            print("Reparando datos previos...")
            usuarios = crear_usuarios(db)
            reparar_datos_previos(db, usuarios)
            return 0

        print("Creando equipo de obra...")
        usuarios = crear_usuarios(db)
        print(f"  {len(usuarios)} usuarios con rol global (Admin / Supervisor / Operario).")

        print("Reparando datos previos...")
        reparar_datos_previos(db, usuarios)

        total = {
            "materiales": 0, "movimientos": 0, "tareas": 0, "comentarios": 0,
            "evidencias": 0, "turnos": 0, "solicitudes": 0, "actas": 0,
            "enlaces": 0, "colaboradores": 0,
        }

        # --- Proyectos nuevos ---
        for indice, (nombre, ubicacion, estado, dias_inicio, dias_fin) in enumerate(PROYECTOS_NUEVOS):
            proyecto = obtener_o_crear_proyecto(
                db,
                nombre,
                ubicacion,
                estado,
                AHORA.date() + timedelta(days=dias_inicio),
                AHORA.date() + timedelta(days=dias_fin),
            )
            conteo = sembrar_proyecto(db, proyecto, usuarios, semilla=1000 + indice)
            for clave, valor in conteo.items():
                total[clave] += valor
            print(f"  proyecto '{nombre}': {conteo['colaboradores']} colaboradores, "
                  f"{conteo['materiales']} materiales, {conteo['tareas']} tareas, {conteo['turnos']} turnos")

        # --- Proyectos que ya existían en la base (del equipo) ---
        proyectos_previos = (
            db.query(ProyectoObra)
            .filter(ProyectoObra.nombre_proyecto.notin_([d[0] for d in PROYECTOS_NUEVOS]))
            .order_by(ProyectoObra.id)
            .all()
        )
        for indice, proyecto in enumerate(proyectos_previos):
            conteo = sembrar_proyecto(db, proyecto, usuarios, semilla=5000 + indice)
            for clave, valor in conteo.items():
                total[clave] += valor
            print(f"  proyecto existente '{proyecto.nombre_proyecto}': "
                  f"{conteo['colaboradores']} colaboradores, {conteo['materiales']} materiales, "
                  f"{conteo['tareas']} tareas, {conteo['turnos']} turnos")

        print()
        print("Resumen de lo sembrado:")
        for clave, valor in total.items():
            print(f"  {clave:15s} {valor}")
        print()
        print(f"Usuarios demo: correo *{DOMINIO_DEMO}  |  contraseña: {CONTRASENA_DEMO}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
