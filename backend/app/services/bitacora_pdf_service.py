"""Generación del PDF ejecutivo de la bitácora de obra con ReportLab.

Se eligió ReportLab sobre WeasyPrint porque es pure-Python y no exige librerías
nativas (GTK/Pango) en las instalaciones Windows de Titan V. El resultado es un
documento apto para imprimir: cabecera corporativa negra/dorada, tablas limpias
y cuadrícula fotográfica con pie de foto.
"""

from collections import defaultdict
from io import BytesIO
from typing import Any, List, Sequence

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from app.services.bitacora_datos_service import DatosReporteObra, TareaReporte
from app.services.bitacora_utils import (
    RUTA_LOGO,
    escapar_xml,
    es_imagen,
    formatear_fecha,
    nombre_completo,
    recortar,
    resolver_ruta_evidencia,
)

DORADO = colors.HexColor("#FFD60A")
DORADO_OSCURO = colors.HexColor("#FFC300")
NEGRO = colors.HexColor("#080B11")
GRIS_OSCURO = colors.HexColor("#1F2937")
GRIS_TEXTO = colors.HexColor("#334155")
GRIS_CLARO = colors.HexColor("#F8FAFC")
BORDE = colors.HexColor("#D6DEE8")
BLANCO = colors.white

ANCHO_UTIL = A4[0] - 30 * mm

ESTILO_ETIQUETA = ParagraphStyle(
    "TitanEyebrow", fontName="Helvetica-Bold", fontSize=8.5, textColor=DORADO_OSCURO,
    spaceAfter=4, leading=11,
)
ESTILO_TITULO = ParagraphStyle(
    "TitanTitulo", fontName="Helvetica-Bold", fontSize=21, textColor=NEGRO,
    spaceAfter=2, leading=25,
)
ESTILO_PROYECTO = ParagraphStyle(
    "TitanProyecto", fontName="Helvetica", fontSize=12, textColor=GRIS_TEXTO,
    spaceAfter=12, leading=16,
)
ESTILO_SECCION = ParagraphStyle(
    "TitanSeccion", fontName="Helvetica-Bold", fontSize=12, textColor=NEGRO,
    spaceBefore=12, spaceAfter=6, leading=15,
)
ESTILO_CABECERA = ParagraphStyle(
    "TitanCabeceraTabla", fontName="Helvetica-Bold", fontSize=7.6, textColor=DORADO,
    leading=9.5,
)
ESTILO_CELDA = ParagraphStyle(
    "TitanCelda", fontName="Helvetica", fontSize=7.6, textColor=GRIS_TEXTO,
    leading=9.5,
)
ESTILO_PIE_FOTO = ParagraphStyle(
    "TitanPieFoto", fontName="Helvetica", fontSize=7, textColor=GRIS_TEXTO,
    leading=9,
)
ESTILO_VACIO = ParagraphStyle(
    "TitanVacio", fontName="Helvetica-Oblique", fontSize=8.5,
    textColor=GRIS_TEXTO, spaceBefore=2, spaceAfter=4,
)


def _celda(valor: Any):
    """Los strings se escapan; los flowables (imágenes, listas) pasan tal cual."""
    if isinstance(valor, str):
        return Paragraph(escapar_xml(valor), ESTILO_CELDA)
    return valor


def _tabla(cabeceras: Sequence[str], filas: Sequence[Sequence[Any]], anchos: Sequence[float]) -> Table:
    datos = [[Paragraph(escapar_xml(c), ESTILO_CABECERA) for c in cabeceras]]
    datos.extend([[_celda(celda) for celda in fila] for fila in filas])

    tabla = Table(datos, colWidths=list(anchos), repeatRows=1, hAlign="LEFT")
    tabla.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GRIS_OSCURO),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BLANCO, GRIS_CLARO]),
                ("GRID", (0, 0), (-1, -1), 0.35, BORDE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return tabla


def _linea_seccion(titulo: str) -> Paragraph:
    return Paragraph(f"<b>{escapar_xml(titulo)}</b>", ESTILO_SECCION)


def _sin_registros(mensaje: str) -> Paragraph:
    return Paragraph(f"<i>{escapar_xml(mensaje)}</i>", ESTILO_VACIO)


def _dibujar_pagina(canvas_pdf, documento, datos: DatosReporteObra) -> None:
    """Cabecera y pie en todas las páginas, con logo y datos del proyecto."""
    ancho, alto = A4
    canvas_pdf.saveState()

    canvas_pdf.setFillColor(NEGRO)
    canvas_pdf.rect(0, alto - 27 * mm, ancho, 27 * mm, stroke=0, fill=1)
    canvas_pdf.setFillColor(DORADO)
    canvas_pdf.rect(0, alto - 27 * mm, ancho, 1.6 * mm, stroke=0, fill=1)

    if RUTA_LOGO.is_file():
        try:
            canvas_pdf.drawImage(
                str(RUTA_LOGO), 14 * mm, alto - 22 * mm,
                width=17 * mm, height=17 * mm, mask="auto",
            )
        except Exception:
            pass  # Si el logo no es legible, la marca textual sigue presente.

    canvas_pdf.setFont("Helvetica-Bold", 14)
    canvas_pdf.setFillColor(BLANCO)
    canvas_pdf.drawString(35 * mm, alto - 13 * mm, "TITÁN V")
    canvas_pdf.setFont("Helvetica", 8)
    canvas_pdf.setFillColor(DORADO)
    canvas_pdf.drawString(35 * mm, alto - 19 * mm, "BITÁCORA / REPORTE DE OBRA")
    canvas_pdf.setFont("Helvetica-Bold", 9)
    canvas_pdf.setFillColor(BLANCO)
    canvas_pdf.drawRightString(ancho - 14 * mm, alto - 13 * mm, recortar(datos.proyecto.nombre_proyecto, 45))
    canvas_pdf.setFont("Helvetica", 7.5)
    canvas_pdf.setFillColor(colors.HexColor("#CBD5E1"))
    canvas_pdf.drawRightString(ancho - 14 * mm, alto - 19 * mm, f"Periodo: {recortar(datos.periodo, 40)}")

    canvas_pdf.setStrokeColor(BORDE)
    canvas_pdf.setLineWidth(0.5)
    canvas_pdf.line(14 * mm, 15 * mm, ancho - 14 * mm, 15 * mm)
    canvas_pdf.setFont("Helvetica", 7)
    canvas_pdf.setFillColor(GRIS_TEXTO)
    canvas_pdf.drawString(
        14 * mm, 10 * mm,
        f"Emitido por {recortar(nombre_completo(datos.usuario), 32)} · {datos.rol.value}",
    )
    canvas_pdf.drawRightString(ancho - 14 * mm, 10 * mm, f"Página {documento.page}")
    canvas_pdf.restoreState()


def _contar_estados(tareas: List[TareaReporte]) -> str:
    contador = defaultdict(int)
    for tarea in tareas:
        contador[tarea.estado or "Sin estado"] += 1
    return " · ".join(f"{estado}: {cantidad}" for estado, cantidad in sorted(contador.items()))


def _celda_evidencia(evidencia) -> List[Any]:
    """Devuelve los flowables de una celda de la cuadrícula fotográfica."""
    contenido = []
    ruta = resolver_ruta_evidencia(evidencia.ruta_archivo)
    max_ancho, max_alto = 80 * mm, 50 * mm

    if ruta and es_imagen(evidencia.ruta_archivo):
        try:
            imagen = Image(ruta)
            escala = min(max_ancho / imagen.imageWidth, max_alto / imagen.imageHeight)
            imagen.drawWidth = imagen.imageWidth * escala
            imagen.drawHeight = imagen.imageHeight * escala
            contenido.append(imagen)
        except Exception:
            contenido.append(Paragraph("Vista previa no disponible", ESTILO_PIE_FOTO))
    else:
        contenido.append(Paragraph("Archivo no image (PDF/video)", ESTILO_PIE_FOTO))

    contenido.append(Spacer(1, 3))
    pie = (
        f"<b>{escapar_xml(evidencia.fecha_subida)}</b><br/>"
        f"{escapar_xml(evidencia.descripcion)}<br/>"
        f"<font color='#64748B'>{escapar_xml(evidencia.usuario)} · "
        f"{escapar_xml(recortar(evidencia.nombre_archivo, 38))}</font>"
    )
    contenido.append(Paragraph(pie, ESTILO_PIE_FOTO))
    return contenido


def generar_pdf(datos: DatosReporteObra) -> bytes:
    """Devuelve el PDF completo en memoria."""
    buffer = BytesIO()
    documento = BaseDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=33 * mm,
        bottomMargin=20 * mm,
        title=f"Bitácora de obra - {datos.proyecto.nombre_proyecto}",
        author="Titán V",
        subject="Reporte ejecutivo de obra",
    )
    marco = Frame(
        documento.leftMargin, documento.bottomMargin,
        documento.width, documento.height, id="cuerpo",
    )
    documento.addPageTemplates(
        [PageTemplate(id="titan", frames=[marco], onPage=lambda c, d: _dibujar_pagina(c, d, datos))]
    )

    historia = [
        Paragraph("BITÁCORA DE OBRA", ESTILO_ETIQUETA),
        Paragraph("Reporte ejecutivo", ESTILO_TITULO),
        Paragraph(escapar_xml(datos.proyecto.nombre_proyecto), ESTILO_PROYECTO),
    ]

    historia.append(_linea_seccion("1. Datos generales"))
    historia.append(
        _tabla(
            ["Campo", "Detalle"],
            [
                ("Proyecto", datos.proyecto.nombre_proyecto),
                ("Ubicación", datos.proyecto.ubicacion_direccion or "—"),
                ("Estado", datos.proyecto.estado or "—"),
                ("Periodo del reporte", datos.periodo),
                ("Emitido por", nombre_completo(datos.usuario)),
                ("Correo", datos.usuario.correo_electronico),
                ("Rol en el proyecto", datos.rol.value),
                ("Fecha de emisión", formatear_fecha(datos.generado_en, con_hora=True)),
            ],
            [42 * mm, ANCHO_UTIL - 42 * mm],
        )
    )

    resumen = []
    if datos.modulos["tareas"]:
        resumen.append(("Tareas", str(len(datos.tareas)), _contar_estados(datos.tareas) or "Sin tareas"))
    if datos.modulos["evidencias"]:
        resumen.append(("Evidencias", str(len(datos.evidencias)), "Registros fotográficos y documentos"))
    if datos.modulos["turnos"]:
        resumen.append(("Turnos", str(len(datos.turnos)), "Registros de asistencia"))
    if datos.modulos["materiales"]:
        resumen.append(("Movimientos", str(len(datos.movimientos)), "Entradas, salidas y ajustes"))

    historia.append(_linea_seccion("2. Resumen del periodo"))
    historia.append(
        _tabla(["Módulo", "Registros", "Detalle"], resumen, [40 * mm, 22 * mm, ANCHO_UTIL - 62 * mm])
    )

    numero_seccion = 3
    if datos.modulos["tareas"]:
        historia.append(_linea_seccion(f"{numero_seccion}. Tareas del proyecto"))
        numero_seccion += 1
        if datos.tareas:
            filas = [
                (
                    f"{tarea.nombre}\n{tarea.descripcion}" if tarea.descripcion else tarea.nombre,
                    tarea.estado,
                    tarea.responsable,
                    f"Asig: {tarea.fecha_asignacion}\nIni: {tarea.fecha_inicio}\nFin: {tarea.fecha_fin_estimada}",
                    f"{len(tarea.comentarios)} comentario(s)",
                )
                for tarea in datos.tareas
            ]
            historia.append(
                _tabla(
                    ["Tarea", "Estado", "Responsable", "Fechas", "Bitácora"],
                    filas,
                    [51 * mm, 22 * mm, 34 * mm, 47 * mm, ANCHO_UTIL - 154 * mm],
                )
            )
        else:
            historia.append(_sin_registros("No hay tareas registradas en el periodo seleccionado."))

    if datos.modulos["evidencias"]:
        historia.append(_linea_seccion(f"{numero_seccion}. Registro fotográfico / Evidencias"))
        numero_seccion += 1
        if datos.evidencias:
            celdas = []
            for inicio in range(0, len(datos.evidencias), 2):
                fila = [_celda_evidencia(evidencia) for evidencia in datos.evidencias[inicio : inicio + 2]]
                if len(fila) == 1:
                    fila.append("")
                celdas.append(fila)

            grilla = Table(celdas, colWidths=[ANCHO_UTIL / 2, ANCHO_UTIL / 2], hAlign="LEFT")
            grilla.setStyle(
                TableStyle(
                    [
                        ("BOX", (0, 0), (-1, -1), 0.5, BORDE),
                        ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDE),
                        ("BACKGROUND", (0, 0), (-1, -1), GRIS_CLARO),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ]
                )
            )
            historia.append(grilla)
        else:
            historia.append(_sin_registros("No hay evidencias registradas en el periodo seleccionado."))

    if datos.modulos["turnos"]:
        historia.append(_linea_seccion(f"{numero_seccion}. Turnos y asistencia del personal"))
        numero_seccion += 1
        if datos.turnos:
            historia.append(
                _tabla(
                    ["Fecha", "Personal", "Horario", "Asistencia"],
                    [
                        (turno.fecha, turno.usuario, f"{turno.hora_inicio} - {turno.hora_fin}", turno.estado_asistencia)
                        for turno in datos.turnos
                    ],
                    [28 * mm, 62 * mm, 40 * mm, ANCHO_UTIL - 130 * mm],
                )
            )
        else:
            historia.append(_sin_registros("No hay turnos registrados en el periodo seleccionado."))

    if datos.modulos["materiales"]:
        historia.append(_linea_seccion(f"{numero_seccion}. Consumo de materiales e insumos"))
        if datos.movimientos:
            historia.append(
                _tabla(
                    ["Fecha", "Material", "Tipo", "Cantidad", "Responsable"],
                    [
                        (
                            movimiento.fecha,
                            movimiento.material,
                            movimiento.tipo_movimiento,
                            f"{movimiento.cantidad:g} {movimiento.unidad_medida}".strip(),
                            movimiento.usuario,
                        )
                        for movimiento in datos.movimientos
                    ],
                    [38 * mm, 52 * mm, 22 * mm, 28 * mm, ANCHO_UTIL - 140 * mm],
                )
            )
        else:
            historia.append(_sin_registros("No hay movimientos de materiales en el periodo seleccionado."))

        historia.append(Spacer(1, 6))
        historia.append(Paragraph("<b>Inventario actual de la obra</b>", ESTILO_SECCION))
        if datos.inventario:
            historia.append(
                _tabla(
                    ["Material", "Unidad", "Cantidad inicial", "Saldo disponible"],
                    [
                        (
                            item.material,
                            item.unidad_medida or "—",
                            f"{item.cantidad_inicial:g}",
                            f"{item.cantidad_disponible:g}",
                        )
                        for item in datos.inventario
                    ],
                    [ANCHO_UTIL - 90 * mm, 22 * mm, 34 * mm, 34 * mm],
                )
            )
        else:
            historia.append(_sin_registros("No hay inventario registrado para este proyecto."))

    documento.build(historia)
    return buffer.getvalue()
