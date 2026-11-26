import { useState } from 'react';
import { fetchConToken } from '../api';
import logoImg from '../assets/logo.png';
import { BadgeBloqueado, Obligatorio } from './IndicadoresAcceso';

interface BitacoraReportesTabProps {
  proyectoId: number;
  proyectoNombre: string;
  rolProyecto: string;
}

type Preset = 'hoy' | 'semana' | 'mes' | 'todo' | 'personalizado';
type Formato = 'pdf' | 'excel';

interface ModulosSeleccion {
  tareas: boolean;
  evidencias: boolean;
  turnos: boolean;
  materiales: boolean;
}

interface ModuloOpcion {
  clave: keyof ModulosSeleccion;
  titulo: string;
  descripcion: string;
  icono: string;
}

const MODULOS: ModuloOpcion[] = [
  {
    clave: 'tareas',
    titulo: 'Tareas',
    descripcion: 'Completadas, en proceso y pendientes, con su bitácora de comentarios.',
    icono: 'fa-list-check',
  },
  {
    clave: 'evidencias',
    titulo: 'Registro fotográfico / Evidencias',
    descripcion: 'Fotos con fecha, hora, descripción y usuario que las registró.',
    icono: 'fa-camera',
  },
  {
    clave: 'turnos',
    titulo: 'Turnos y asistencia del personal',
    descripcion: 'Horarios y estado de asistencia de la cuadrilla (solo Arquitecto).',
    icono: 'fa-clock',
  },
  {
    clave: 'materiales',
    titulo: 'Consumo de materiales e insumos',
    descripcion: 'Kardex del periodo e inventario actual (solo Arquitecto).',
    icono: 'fa-boxes-stacked',
  },
];

const PRESETS: { clave: Exclude<Preset, 'personalizado'>; etiqueta: string; icono: string }[] = [
  { clave: 'hoy', etiqueta: 'Hoy', icono: 'fa-sun' },
  { clave: 'semana', etiqueta: 'Esta semana', icono: 'fa-calendar-week' },
  { clave: 'mes', etiqueta: 'Este mes', icono: 'fa-calendar-days' },
  { clave: 'todo', etiqueta: 'Todo el proyecto', icono: 'fa-infinity' },
];

function fechaInput(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export const BitacoraReportesTab = ({
  proyectoId,
  proyectoNombre,
  rolProyecto,
}: BitacoraReportesTabProps) => {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [preset, setPreset] = useState<Preset>('todo');
  const [modulos, setModulos] = useState<ModulosSeleccion>({
    tareas: true,
    evidencias: true,
    turnos: false,
    materiales: false,
  });
  const [formato, setFormato] = useState<Formato>('pdf');
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const esArquitecto = rolProyecto === 'Arquitecto';
  const formatoEfectivo: Formato = esArquitecto ? formato : 'pdf';
  const moduloDisponible = (clave: keyof ModulosSeleccion) =>
    clave === 'tareas' || clave === 'evidencias' || esArquitecto;

  if (rolProyecto === 'Trabajador') {
    return (
      <div className="tab-content active animated-fadeIn">
        <div className="section-header">
          <h2><i className="fas fa-file-lines"></i> Bitácora / Reportes de Obra</h2>
        </div>
        <div className="card reporte-acceso-denegado">
          <i className="fas fa-lock"></i>
          <h3>Acceso restringido</h3>
          <p>
            Tu rol de Trabajador no tiene acceso a la generación de reportes.
            Contacta al Arquitecto del proyecto si necesitas un corte de obra.
          </p>
        </div>
      </div>
    );
  }

  if (!rolProyecto) {
    return (
      <div className="tab-content active animated-fadeIn">
        <div className="section-header">
          <h2><i className="fas fa-file-lines"></i> Bitácora / Reportes de Obra</h2>
        </div>
        <p className="muted-text">Verificando tu rol en este proyecto...</p>
      </div>
    );
  }

  const aplicarPreset = (clave: Exclude<Preset, 'personalizado'>) => {
    const hoy = new Date();

    if (clave === 'hoy') {
      setFechaInicio(fechaInput(hoy));
      setFechaFin(fechaInput(hoy));
    } else if (clave === 'semana') {
      const diaSemana = hoy.getDay() || 7; // Lunes = 1, domingo = 7.
      const inicio = new Date(hoy);
      inicio.setDate(hoy.getDate() - diaSemana + 1);
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 6);
      setFechaInicio(fechaInput(inicio));
      setFechaFin(fechaInput(fin));
    } else if (clave === 'mes') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      setFechaInicio(fechaInput(inicio));
      setFechaFin(fechaInput(fin));
    } else {
      setFechaInicio('');
      setFechaFin('');
    }

    setPreset(clave);
    setError('');
    setMensaje('');
  };

  const cambiarFecha = (campo: 'inicio' | 'fin', valor: string) => {
    if (campo === 'inicio') setFechaInicio(valor);
    else setFechaFin(valor);
    setPreset('personalizado');
    setError('');
    setMensaje('');
  };

  const alternarModulo = (clave: keyof ModulosSeleccion) => {
    if (!moduloDisponible(clave)) return;
    setModulos((actuales) => ({ ...actuales, [clave]: !actuales[clave] }));
    setError('');
    setMensaje('');
  };

  const generarReporte = async () => {
    setError('');
    setMensaje('');

    const hayModulos = Object.values(modulos).some(Boolean);
    if (!hayModulos) {
      setError('Selecciona al menos un módulo para generar el reporte.');
      return;
    }
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    const parametros = new URLSearchParams();
    parametros.set('formato', formatoEfectivo);
    if (fechaInicio) parametros.set('fecha_inicio', fechaInicio);
    if (fechaFin) parametros.set('fecha_fin', fechaFin);
    (Object.keys(modulos) as (keyof ModulosSeleccion)[]).forEach((clave) => {
      parametros.set(`incluir_${clave}`, String(modulos[clave]));
    });

    setGenerando(true);
    try {
      const respuesta = await fetchConToken(
        `/proyectos/${proyectoId}/reportes/exportar?${parametros.toString()}`,
      );
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        throw new Error(datos?.detail || 'No se pudo generar el reporte.');
      }

      const archivo = await respuesta.blob();
      const disposicion = respuesta.headers.get('content-disposition') || '';
      const nombreRemoto = disposicion.match(/filename="?([^";]+)"?/i)?.[1];
      const extension = formatoEfectivo === 'pdf' ? 'pdf' : 'xlsx';
      const nombreArchivo = nombreRemoto || `reporte_obra_${proyectoId}.${extension}`;

      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setMensaje(
        formatoEfectivo === 'pdf'
          ? 'Reporte PDF ejecutivo generado correctamente.'
          : 'Reporte Excel (.xlsx) generado correctamente.',
      );
    } catch (err: any) {
      setError(err.message || 'No se pudo generar el reporte. Inténtalo nuevamente.');
    } finally {
      setGenerando(false);
    }
  };

  const textoPeriodo =
    fechaInicio && fechaFin
      ? `${fechaInicio} al ${fechaFin}`
      : fechaInicio
        ? `Desde ${fechaInicio}`
        : fechaFin
          ? `Hasta ${fechaFin}`
          : 'Todo el proyecto';

  const modulosActivos = MODULOS.filter((modulo) => modulos[modulo.clave]);

  return (
    <div className="tab-content active animated-fadeIn">
      <div className="section-header">
        <h2><i className="fas fa-file-lines"></i> Bitácora / Reportes de Obra</h2>
        <p className="muted-text">
          Configura el corte de obra, elige los módulos y exporta el reporte corporativo.
        </p>
      </div>

      <div className="card reporte-hero">
        <div className="reporte-hero-contenido">
          <div className="panel-hero-badge"><img src={logoImg} alt="" /> Proyecto activo</div>
          <h3 className="reporte-hero-titulo">{proyectoNombre}</h3>
          <p className="reporte-hero-detalle">
            Periodo: <strong>{textoPeriodo}</strong> · Rol en el proyecto: <strong>{rolProyecto}</strong>
          </p>
        </div>
        <div className="reporte-hero-icono"><i className="fas fa-file-lines"></i></div>
      </div>

      <div className="grid reporte-grid">
        <div className="card">
          <div className="card-header">
            <h3>
              <span className="card-icon-bubble"><i className="fas fa-calendar-day"></i></span>
              Rango de tiempo
            </h3>
          </div>
          <div className="reporte-cuerpo">
            <div className="reporte-presets">
              {PRESETS.map((opcion) => (
                <button
                  key={opcion.clave}
                  type="button"
                  className={`reporte-preset ${preset === opcion.clave ? 'activo' : ''}`}
                  onClick={() => aplicarPreset(opcion.clave)}
                >
                  <i className={`fas ${opcion.icono}`}></i> {opcion.etiqueta}
                </button>
              ))}
            </div>
            <div className="reporte-fechas">
              <div className="input-group">
                <label htmlFor="reporte-fecha-inicio">Fecha de inicio</label>
                <input
                  id="reporte-fecha-inicio"
                  type="date"
                  value={fechaInicio}
                  max={fechaFin || undefined}
                  onChange={(evento) => cambiarFecha('inicio', evento.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="reporte-fecha-fin">Fecha de fin</label>
                <input
                  id="reporte-fecha-fin"
                  type="date"
                  value={fechaFin}
                  min={fechaInicio || undefined}
                  onChange={(evento) => cambiarFecha('fin', evento.target.value)}
                />
              </div>
            </div>
            <p className="reporte-nota">
              Los campos personalizados permiten cortes exactos para actas y entregas.
              Dejar ambos vacíos exporta todo el historial del proyecto.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>
              <span className="card-icon-bubble"><i className="fas fa-list-check"></i></span>
              Contenido del reporte <Obligatorio />
            </h3>
          </div>
          <div className="reporte-cuerpo">
            {MODULOS.map((modulo) => {
              const disponible = moduloDisponible(modulo.clave);
              return (
                <label
                  key={modulo.clave}
                  className={`reporte-check ${disponible ? '' : 'bloqueado'}`}
                  title={disponible ? undefined : 'Disponible solo para el Arquitecto del proyecto'}
                >
                  <input
                    type="checkbox"
                    checked={modulos[modulo.clave]}
                    disabled={!disponible}
                    onChange={() => alternarModulo(modulo.clave)}
                  />
                  <span className="reporte-check-texto">
                    <strong>{modulo.titulo}</strong>
                    <small>{modulo.descripcion}</small>
                  </span>
                  <i className={`fas ${modulo.icono}`}></i>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid reporte-grid">
        <div className="card">
          <div className="card-header">
            <h3>
              <span className="card-icon-bubble"><i className="fas fa-file-export"></i></span>
              Formato de exportación
            </h3>
          </div>
          <div className="reporte-cuerpo reporte-formatos">
            <label className={`reporte-formato ${formatoEfectivo === 'pdf' ? 'activo' : ''}`}>
              <input
                type="radio"
                name="formato-reporte"
                value="pdf"
                checked={formatoEfectivo === 'pdf'}
                onChange={() => {
                  setFormato('pdf');
                  setMensaje('');
                }}
              />
              <span className="reporte-check-texto">
                <strong>PDF Ejecutivo</strong>
                <small>Diseño corporativo con logo, datos del proyecto, usuario y evidencias en cuadrícula.</small>
              </span>
              <i className="fas fa-file-pdf"></i>
            </label>

            <label
              className={`reporte-formato ${formatoEfectivo === 'excel' ? 'activo' : ''} ${
                esArquitecto ? '' : 'bloqueado'
              }`}
              title={esArquitecto ? undefined : 'El rol Visualizador solo puede exportar en PDF'}
            >
              <input
                type="radio"
                name="formato-reporte"
                value="excel"
                checked={formatoEfectivo === 'excel'}
                disabled={!esArquitecto}
                onChange={() => {
                  setFormato('excel');
                  setMensaje('');
                }}
              />
              <span className="reporte-check-texto">
                <strong>Excel (.xlsx)</strong>
                <small>Una pestaña independiente por cada módulo seleccionado.</small>
              </span>
              <i className="fas fa-file-excel"></i>
              {!esArquitecto && <BadgeBloqueado texto="Solo Arquitecto" titulo="El rol Visualizador solo puede exportar en PDF" />}
            </label>

            {!esArquitecto && (
              <p className="reporte-nota">
                Como Visualizador, tu acceso se limita a avance y evidencias en PDF.
                Los datos de asistencia e inventario no están disponibles para tu rol.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>
              <span className="card-icon-bubble"><i className="fas fa-clipboard-check"></i></span>
              Resumen y generación
            </h3>
          </div>
          <div className="reporte-cuerpo">
            <div className="reporte-resumen">
              <div className="reporte-resumen-fila">
                <span>Proyecto</span><span>{proyectoNombre}</span>
              </div>
              <div className="reporte-resumen-fila">
                <span>Periodo</span><span>{textoPeriodo}</span>
              </div>
              <div className="reporte-resumen-fila">
                <span>Módulos ({modulosActivos.length})</span>
                <span>{modulosActivos.map((modulo) => modulo.titulo).join(', ') || 'Ninguno'}</span>
              </div>
              <div className="reporte-resumen-fila">
                <span>Formato</span>
                <span>{formatoEfectivo === 'pdf' ? 'PDF Ejecutivo' : 'Excel (.xlsx)'}</span>
              </div>
            </div>

            <div className="reporte-accion">
              <button
                type="button"
                className="btn-save"
                disabled={generando}
                onClick={() => void generarReporte()}
              >
                <i className={`fas ${generando ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                {generando ? ' Generando...' : ' Generar reporte'}
              </button>
              <span className="reporte-nota">El archivo se descarga automáticamente.</span>
            </div>

            {error && <div className="reporte-error"><i className="fas fa-circle-exclamation"></i> {error}</div>}
            {mensaje && <div className="reporte-exito"><i className="fas fa-circle-check"></i> {mensaje}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
