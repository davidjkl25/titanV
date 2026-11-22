"""Generación del Excel (.xlsx) de la bitácora de obra con openpyxl.

Cada módulo seleccionado se exporta en una pestaña independiente. Los colores
replican la identidad de Titan V: cabecera oscura, texto dorado y filas
alternas sobre fondo claro para facilitar la lectura en Excel.
"""

from io import BytesIO
from typing import Any, List, Sequence

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from app.services.bitacora_datos_service import DatosReporteObra

DORADO = "FFD60A"
OSCURO = "0B1220"
GRIS_OSCURO = "1F2937"
GRIS_CLARO = "F8FAFC"
GRIS_TEXTO = "334155"
BLANCO = "FFFFFF"
BORDE = "D6DEE8"

BORDE_CELDA = Border(
    left=Side(style="thin", color=BORDE),
    right=Side(style="thin", color=BORDE),
    top=Side(style="thin", color=BORDE),
    bottom=Side(style="thin", color=BORDE),
)


def _preparar_hoja(hoja, titulo: str, columnas: Sequence[str], anchos: Sequence[int]) -> None:
    hoja.sheet_view.showGridLines = False
    ultima_columna = get_column_letter(len(columnas))

    hoja.merge_cells(f"A1:{ultima_columna}1")
    celda_titulo = hoja["A1"]
    celda_titulo.value = titulo
    celda_titulo.fill = PatternFill("solid", fgColor=OSCURO)
    celda_titulo.font = Font(name="Calibri", size=14, bold=True, color=DORADO)
    celda_titulo.alignment = Alignment(vertical="center", horizontal="left")
    hoja.row_dimensions[1].height = 28

    for indice, (nombre, ancho) in enumerate(zip(columnas, anchos), start=1):
        celda = hoja.cell(row=3, column=indice, value=nombre)
        celda.fill = PatternFill("solid", fgColor=GRIS_OSCURO)
        celda.font = Font(name="Calibri", size=10, bold=True, color=DORADO)
        celda.alignment = Alignment(vertical="center", horizontal="left", wrap_text=True)
        celda.border = BORDE_CELDA
        hoja.column_dimensions[get_column_letter(indice)].width = ancho
    hoja.row_dimensions[3].height = 22
    hoja.freeze_panes = "A4"


def _escribir_filas(hoja, filas: Sequence[Sequence[Any]], fila_inicio: int = 4) -> int:
    for numero_fila, fila in enumerate(filas, start=fila_inicio):
        color_fondo = BLANCO if numero_fila % 2 == 0 else GRIS_CLARO
        for numero_columna, valor in enumerate(fila, start=1):
            celda = hoja.cell(row=numero_fila, column=numero_columna, value=valor)
            celda.font = Font(name="Calibri", size=10, color=GRIS_TEXTO)
            celda.fill = PatternFill("solid", fgColor=color_fondo)
            celda.alignment = Alignment(vertical="top", horizontal="left", wrap_text=True)
            celda.border = BORDE_CELDA
    return fila_inicio + len(filas) - 1


def _aplicar_filtro(hoja, cantidad_columnas: int, ultima_fila: int) -> None:
    if ultima_fila >= 4:
        hoja.auto_filter.ref = f"A3:{get_column_letter(cantidad_columnas)}{ultima_fila}"


def _hoja_resumen(libro: Workbook, datos: DatosReporteObra) -> None:
    hoja = libro.active
    hoja.title = "Resumen"
    hoja.sheet_view.showGridLines = False
    hoja.column_dimensions["A"].width = 26
    hoja.column_dimensions["B"].width = 88

    hoja.merge_cells("A1:B1")
    titulo = hoja["A1"]
    titulo.value = "BITÁCORA / REPORTE DE OBRA — TITÁN V"
    titulo.fill = PatternFill("solid", fgColor=OSCURO)
    titulo.font = Font(name="Calibri", size=15, bold=True, color=DORADO)
    titulo.alignment = Alignment(vertical="center")
    hoja.row_dimensions[1].height = 30

    modulos_seleccionados = ", ".join(
        etiqueta for clave, etiqueta in datos.etiquetas_modulos.items() if datos.modulos.get(clave)
    )
    filas = [
        ("Proyecto", datos.proyecto.nombre_proyecto),
        ("Ubicación", datos.proyecto.ubicacion_direccion or "—"),
        ("Estado", datos.proyecto.estado or "—"),
        ("Periodo", datos.periodo),
        ("Emitido por", " ".join([datos.usuario.nombres, datos.usuario.apellidos]).strip()),
        ("Correo", datos.usuario.correo_electronico),
        ("Rol en el proyecto", datos.rol.value),
        ("Fecha de emisión", datos.generado_en.strftime("%d/%m/%Y %H:%M")),
        ("Formato", "Excel (.xlsx)"),
        ("Módulos incluidos", modulos_seleccionados),
        ("Tareas", len(datos.tareas)),
        ("Evidencias", len(datos.evidencias)),
        ("Turnos", len(datos.turnos)),
        ("Movimientos de materiales", len(datos.movimientos)),
    ]

    for numero_fila, (etiqueta, valor) in enumerate(filas, start=3):
        celda_etiqueta = hoja.cell(row=numero_fila, column=1, value=etiqueta)
        celda_etiqueta.fill = PatternFill("solid", fgColor=GRIS_OSCURO)
        celda_etiqueta.font = Font(name="Calibri", size=10, bold=True, color=DORADO)
        celda_etiqueta.alignment = Alignment(vertical="center")
        celda_etiqueta.border = BORDE_CELDA

        celda_valor = hoja.cell(row=numero_fila, column=2, value=valor)
        celda_valor.fill = PatternFill("solid", fgColor=BLANCO if numero_fila % 2 else GRIS_CLARO)
        celda_valor.font = Font(name="Calibri", size=10, color=GRIS_TEXTO)
        celda_valor.alignment = Alignment(vertical="center", wrap_text=True)
        celda_valor.border = BORDE_CELDA


def _hoja_tareas(libro: Workbook, datos: DatosReporteObra) -> None:
    columnas = ["ID", "Tarea", "Descripción", "Estado", "Responsable", "Asignación", "Inicio", "Fin estimado", "Comentarios"]
    anchos = [7, 30, 45, 16, 24, 14, 14, 14, 50]
    hoja = libro.create_sheet("Tareas")
    _preparar_hoja(hoja, "Tareas del proyecto", columnas, anchos)

    filas = [
        (
            tarea.id,
            tarea.nombre,
            tarea.descripcion,
            tarea.estado,
            tarea.responsable,
            tarea.fecha_asignacion,
            tarea.fecha_inicio,
            tarea.fecha_fin_estimada,
            " | ".join(f"{c.fecha} - {c.autor}: {c.contenido}" for c in tarea.comentarios),
        )
        for tarea in datos.tareas
    ]
    ultima_fila = _escribir_filas(hoja, filas)
    _aplicar_filtro(hoja, len(columnas), ultima_fila)


def _hoja_evidencias(libro: Workbook, datos: DatosReporteObra) -> None:
    columnas = ["ID", "Tarea", "Descripción", "Fecha y hora", "Registrado por", "Archivo", "Ruta"]
    anchos = [7, 30, 45, 19, 24, 34, 42]
    hoja = libro.create_sheet("Evidencias")
    _preparar_hoja(hoja, "Registro fotográfico / Evidencias", columnas, anchos)

    filas = [
        (
            evidencia.id,
            evidencia.tarea,
            evidencia.descripcion,
            evidencia.fecha_subida,
            evidencia.usuario,
            evidencia.nombre_archivo,
            evidencia.ruta_archivo,
        )
        for evidencia in datos.evidencias
    ]
    ultima_fila = _escribir_filas(hoja, filas)
    _aplicar_filtro(hoja, len(columnas), ultima_fila)


def _hoja_turnos(libro: Workbook, datos: DatosReporteObra) -> None:
    columnas = ["ID", "Fecha", "Personal", "Hora inicio", "Hora fin", "Asistencia"]
    anchos = [7, 16, 30, 14, 14, 22]
    hoja = libro.create_sheet("Turnos")
    _preparar_hoja(hoja, "Turnos y asistencia del personal", columnas, anchos)

    filas = [
        (turno.id, turno.fecha, turno.usuario, turno.hora_inicio, turno.hora_fin, turno.estado_asistencia)
        for turno in datos.turnos
    ]
    ultima_fila = _escribir_filas(hoja, filas)
    _aplicar_filtro(hoja, len(columnas), ultima_fila)


def _hoja_materiales(libro: Workbook, datos: DatosReporteObra) -> None:
    columnas = ["ID", "Fecha", "Material", "Unidad", "Tipo de movimiento", "Cantidad", "Responsable"]
    anchos = [7, 19, 32, 12, 22, 14, 26]
    hoja = libro.create_sheet("Materiales")
    _preparar_hoja(hoja, "Consumo de materiales e insumos — Kardex del periodo", columnas, anchos)

    filas = [
        (
            movimiento.id,
            movimiento.fecha,
            movimiento.material,
            movimiento.unidad_medida,
            movimiento.tipo_movimiento,
            movimiento.cantidad,
            movimiento.usuario,
        )
        for movimiento in datos.movimientos
    ]
    ultima_fila = _escribir_filas(hoja, filas)
    _aplicar_filtro(hoja, len(columnas), ultima_fila)

    # En la misma pestaña se añade el saldo actual para que el corte de obra
    # pueda confrontar consumos del periodo contra el inventario vigente.
    fila_inicio = max(ultima_fila + 3, 5)
    hoja.cell(row=fila_inicio, column=1, value="Inventario actual de la obra").font = Font(
        name="Calibri", size=12, bold=True, color=DORADO
    )
    hoja.cell(row=fila_inicio, column=1).fill = PatternFill("solid", fgColor=OSCURO)

    columnas_inventario = ["Material", "Unidad", "Cantidad inicial", "Saldo disponible"]
    for indice, nombre in enumerate(columnas_inventario, start=1):
        celda = hoja.cell(row=fila_inicio + 1, column=indice, value=nombre)
        celda.fill = PatternFill("solid", fgColor=GRIS_OSCURO)
        celda.font = Font(name="Calibri", size=10, bold=True, color=DORADO)
        celda.border = BORDE_CELDA

    filas_inventario = [
        (item.material, item.unidad_medida, item.cantidad_inicial, item.cantidad_disponible)
        for item in datos.inventario
    ]
    _escribir_filas(hoja, filas_inventario, fila_inicio=fila_inicio + 2)


def generar_excel(datos: DatosReporteObra) -> bytes:
    """Devuelve el libro Excel completo en memoria."""
    libro = Workbook()
    _hoja_resumen(libro, datos)

    if datos.modulos["tareas"]:
        _hoja_tareas(libro, datos)
    if datos.modulos["evidencias"]:
        _hoja_evidencias(libro, datos)
    if datos.modulos["turnos"]:
        _hoja_turnos(libro, datos)
    if datos.modulos["materiales"]:
        _hoja_materiales(libro, datos)

    buffer = BytesIO()
    libro.save(buffer)
    libro.close()
    return buffer.getvalue()
