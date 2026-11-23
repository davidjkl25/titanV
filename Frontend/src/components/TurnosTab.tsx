import { useEffect, useState } from 'react';
import { fetchConToken } from '../api';
import { AvisoSoloLectura, BadgeBloqueado, Obligatorio } from './IndicadoresAcceso';
import NotaCamposObligatorios from './ui/NotaCamposObligatorios';

interface Turno {
  id: number;
  proyecto_id: number;
  usuario_id: number;
  fecha_turno: string;
  hora_inicio: string;
  hora_fin: string;
  estado_asistencia: string;
}

interface Proyecto {
  id: number;
  nombre_proyecto: string;
}

interface Usuario {
  id: number;
  nombre_completo: string;
}

const ESTADOS = ['Programado', 'Presente', 'Ausente'];

interface TurnosTabProps {
  proyectoId?: number;
  rolProyecto?: string;
}

export const TurnosTab = ({ proyectoId: proyectoFijo, rolProyecto }: TurnosTabProps) => {
  const soloLectura = rolProyecto === 'Visualizador';
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string,string>>({});

  const [proyectoId, setProyectoId] = useState<number | ''>('');
  const [usuarioId, setUsuarioId] = useState<number | ''>('');
  const [fechaTurno, setFechaTurno] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [estadoAsistencia, setEstadoAsistencia] = useState('Programado');

  const cargarTodo = async () => {
    setCargando(true);
    setError('');
    try {
      const queryTurnos = proyectoFijo ? `?proyecto_id=${proyectoFijo}` : '';
      const [rTurnos, rProyectos, rUsuarios] = await Promise.all([
        fetchConToken(`/turnos/${queryTurnos}`),
        fetchConToken('/proyectos/'),
        fetchConToken('/usuarios/'),
      ]);
      if (!rTurnos.ok) throw new Error('No se pudieron cargar los turnos.');
      setTurnos(await rTurnos.json());
      const dataProyectos = rProyectos.ok ? await rProyectos.json() : [];
      setProyectos(proyectoFijo ? dataProyectos.filter((p: Proyecto) => p.id === proyectoFijo) : dataProyectos);
      setUsuarios(rUsuarios.ok ? await rUsuarios.json() : []);
      if (proyectoFijo) setProyectoId(proyectoFijo);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los turnos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const nombreProyecto = (id: number) => proyectos.find((p) => p.id === id)?.nombre_proyecto || `Proyecto #${id}`;
  const nombreUsuario = (id: number) => usuarios.find((u) => u.id === id)?.nombre_completo || `Usuario #${id}`;

  // Los turnos se muestran del más reciente al más antiguo para que un turno
  // recién agendado aparezca primero en la lista.
  const turnosOrdenados = [...turnos].sort((a, b) => {
    const fechaA = `${a.fecha_turno || ''} ${a.hora_inicio || ''}`;
    const fechaB = `${b.fecha_turno || ''} ${b.hora_inicio || ''}`;
    return fechaB.localeCompare(fechaA);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (soloLectura) return;
    const next: Record<string,string> = {};
    if (!proyectoId) next.proyectoId = 'Selecciona un proyecto.';
    if (!usuarioId) next.usuarioId = 'Selecciona un operario.';
    if (!fechaTurno) next.fechaTurno = 'La fecha del turno es obligatoria.';
    if (!horaInicio) next.horaInicio = 'La hora de inicio es obligatoria.';
    if (!horaFin) next.horaFin = 'La hora de fin es obligatoria.';
    if (horaInicio && horaFin && horaFin <= horaInicio) next.horaFin = 'La hora de fin debe ser posterior a la hora de inicio.';
    setErrores(next);
    if (Object.keys(next).length) return;

    setGuardando(true);
    try {
      const respuesta = await fetchConToken('/turnos/', {
        method: 'POST',
        body: JSON.stringify({
          proyecto_id: Number(proyectoId),
          usuario_id: Number(usuarioId),
          fecha_turno: fechaTurno,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          estado_asistencia: estadoAsistencia,
        }),
      });
      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => null);
        throw new Error(data?.detail || 'No se pudo crear el turno.');
      }
      setFechaTurno('');
      setHoraInicio('');
      setHoraFin('');
      setEstadoAsistencia('Programado');
      await cargarTodo();
    } catch (err: any) {
      alert(err.message || 'No se pudo crear el turno.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (id: number, nuevoEstado: string) => {
    if (soloLectura) return;
    try {
      const respuesta = await fetchConToken(`/turnos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado_asistencia: nuevoEstado }),
      });
      if (!respuesta.ok) throw new Error('No se pudo actualizar la asistencia.');
      await cargarTodo();
    } catch (err: any) {
      alert(err.message || 'No se pudo actualizar la asistencia.');
    }
  };

  const eliminarTurno = async (id: number) => {
    if (soloLectura) return;
    if (!window.confirm('¿Eliminar este turno?')) return;
    try {
      const respuesta = await fetchConToken(`/turnos/${id}`, { method: 'DELETE' });
      if (!respuesta.ok && respuesta.status !== 204) throw new Error('No se pudo eliminar el turno.');
      await cargarTodo();
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar el turno.');
    }
  };

  return (
    <div className="tab-content active">
      <div className="section-header">
        <h2><i className="fas fa-clock"></i> Turnos y Asistencia</h2>
      </div>
      {soloLectura && <AvisoSoloLectura texto="Tu rol Visualizador solo permite consultar turnos. No puedes programarlos ni cambiar la asistencia." />}
      <div className="grid">
        <div className="card">
          <div className="card-header"><h3><i className="fas fa-plus-circle"></i> Programar Turno</h3></div>
          <form onSubmit={handleSubmit} noValidate>
            <NotaCamposObligatorios />
            <div className="input-group">
              <label htmlFor="turno-proyecto">Proyecto <Obligatorio /></label>
              <select id="turno-proyecto" value={proyectoId} onChange={(e) => { setProyectoId(e.target.value ? Number(e.target.value) : ''); setErrores(p=>({...p,proyectoId:''})); }} required aria-required="true" aria-invalid={!!errores.proyectoId} disabled={soloLectura}>
                <option value="">Selecciona un proyecto</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre_proyecto}</option>)}
              </select>
              {errores.proyectoId && <span className="field-error" role="alert">{errores.proyectoId}</span>}
            </div>
            <div className="input-group">
              <label htmlFor="turno-usuario">Operario <Obligatorio /></label>
              <select id="turno-usuario" value={usuarioId} onChange={(e) => { setUsuarioId(e.target.value ? Number(e.target.value) : ''); setErrores(p=>({...p,usuarioId:''})); }} required aria-required="true" aria-invalid={!!errores.usuarioId} disabled={soloLectura}>
                <option value="">Selecciona un operario</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre_completo}</option>)}
              </select>
              {errores.usuarioId && <span className="field-error" role="alert">{errores.usuarioId}</span>}
            </div>
            <div className="input-group">
              <label htmlFor="turno-fecha">Fecha del turno <Obligatorio /></label>
              <input id="turno-fecha" type="date" value={fechaTurno} onChange={(e) => { setFechaTurno(e.target.value); setErrores(p=>({...p,fechaTurno:''})); }} required aria-required="true" aria-invalid={!!errores.fechaTurno} disabled={soloLectura} />
              {errores.fechaTurno && <span className="field-error" role="alert">{errores.fechaTurno}</span>}
            </div>
            <div className="date-row">
              <div className="input-group">
                <label htmlFor="turno-inicio">Hora inicio <Obligatorio /></label>
                <input id="turno-inicio" type="time" value={horaInicio} onChange={(e) => { setHoraInicio(e.target.value); setErrores(p=>({...p,horaInicio:''})); }} required aria-required="true" aria-invalid={!!errores.horaInicio} disabled={soloLectura} />
                {errores.horaInicio && <span className="field-error" role="alert">{errores.horaInicio}</span>}
              </div>
              <div className="input-group">
                <label htmlFor="turno-fin">Hora fin <Obligatorio /></label>
                <input id="turno-fin" type="time" value={horaFin} onChange={(e) => { setHoraFin(e.target.value); setErrores(p=>({...p,horaFin:''})); }} required aria-required="true" aria-invalid={!!errores.horaFin} disabled={soloLectura} />
                {errores.horaFin && <span className="field-error" role="alert">{errores.horaFin}</span>}
              </div>
            </div>
            <div className="input-group">
              <label>Asistencia</label>
              <select value={estadoAsistencia} onChange={(e) => setEstadoAsistencia(e.target.value)} disabled={soloLectura}>
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="ui-tooltip-wrap" data-tooltip={soloLectura ? 'Tu rol (Visualizador) solo permite consultar' : undefined} style={{ width: '100%' }}>
              <button type="submit" className="btn-save" disabled={guardando || soloLectura} aria-disabled={guardando || soloLectura} style={{ width: '100%' }}>
                {soloLectura ? <><i className="fas fa-lock"></i> Solo lectura</> : guardando ? 'Guardando...' : 'Programar turno'}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header"><h3><i className="fas fa-list"></i> Turnos registrados</h3></div>
          <div className="project-container">
            {error && <div className="empty-msg" style={{ color: '#fca5a5' }}>{error}</div>}
            {cargando && <div className="empty-msg">Cargando turnos...</div>}
            {!cargando && !error && turnos.length === 0 && (
              <div className="empty-msg">No hay turnos registrados todavía.</div>
            )}
            {!cargando && turnosOrdenados.map((t) => (
              <div key={t.id} className="project-item">
                <div>
                  <h4>{nombreUsuario(t.usuario_id)}</h4>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    #{t.id} · {nombreProyecto(t.proyecto_id)} — {t.fecha_turno} · {t.hora_inicio}–{t.hora_fin}
                  </span>
                  <div style={{ marginTop: '6px' }}>
                    <span className={`estado-badge ${t.estado_asistencia === 'Presente' ? 'badge-activo' : t.estado_asistencia === 'Ausente' ? 'badge-cancelado' : 'badge-pausado'}`} style={{ marginRight: '8px' }}>{t.estado_asistencia}</span>
                    <select
                      value={t.estado_asistencia}
                      onChange={(e) => cambiarEstado(t.id, e.target.value)}
                      disabled={soloLectura}
                      aria-label={`Cambiar asistencia de turno ${t.id}`}
                      title={soloLectura ? 'Tu rol (Visualizador) solo permite consultar' : undefined}
                      style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: 'rgba(8, 11, 17, .85)', color: '#fff', border: '1px solid rgba(255, 214, 10, .45)', borderRadius: '6px' }}
                    >
                      {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
                {soloLectura && <BadgeBloqueado texto="Solo lectura" />}
                <button
                  onClick={() => eliminarTurno(t.id)}
                  className="btn-delete"
                  disabled={soloLectura}
                  title={soloLectura ? 'Tu rol no puede eliminar turnos' : undefined}
                >
                  <i className={soloLectura ? 'fas fa-lock' : 'fas fa-trash'}></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
