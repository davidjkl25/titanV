import { useEffect, useState } from 'react';
import { fetchConToken } from '../api';

interface Evidencia {
  id: number;
  tarea_id: number;
  usuario_id: number;
  nombre_archivo: string;
  ruta_archivo: string;
  descripcion?: string;
  fecha_subida: string;
}

interface Tarea {
  id: number;
  nombre_tarea: string;
  proyecto_id: number;
}

interface EvidenciasTabProps {
  proyectoId?: number;
  rolProyecto?: string;
}

export const EvidenciasTab = ({ proyectoId: proyectoFijo, rolProyecto }: EvidenciasTabProps) => {
  const esArquitecto = rolProyecto === 'Arquitecto';
  const puedeEscribir = ['Arquitecto', 'Trabajador'].includes(rolProyecto || '');
  const esVisualizador = !puedeEscribir;

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [tareaId, setTareaId] = useState<number | ''>('');
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [descripcion, setDescripcion] = useState('');

  const cargarTareas = async () => {
    const query = proyectoFijo ? `/?proyecto_id=${proyectoFijo}` : '';
    const respuesta = await fetchConToken(`/tareas${query}`);
    if (respuesta.ok) {
      const data = await respuesta.json();
      setTareas(data);
      if (data.length > 0) setTareaId(data[0].id);
    }
  };

  const cargarEvidencias = async (id: number) => {
    setCargando(true);
    setError('');
    try {
      const respuesta = await fetchConToken(`/tareas/${id}/evidencias/`);
      if (!respuesta.ok) throw new Error('No se pudieron cargar las evidencias.');
      setEvidencias(await respuesta.json());
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar las evidencias.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTareas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tareaId) cargarEvidencias(Number(tareaId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo || !tareaId) return;

    setSubiendo(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      if (descripcion) formData.append('descripcion', descripcion);

      const respuesta = await fetchConToken(`/tareas/${tareaId}/evidencias/`, {
        method: 'POST',
        body: formData,
      });
      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => null);
        throw new Error(data?.detail || 'No se pudo subir el archivo.');
      }

      setArchivo(null);
      setDescripcion('');
      const input = document.getElementById('input-archivo-evidencia') as HTMLInputElement | null;
      if (input) input.value = '';
      await cargarEvidencias(Number(tareaId));
    } catch (err: any) {
      alert(err.message || 'No se pudo subir el archivo.');
    } finally {
      setSubiendo(false);
    }
  };

  const abrirEvidencia = async (evidencia: Evidencia) => {
    if (!tareaId) return;
    try {
      const respuesta = await fetchConToken(`/tareas/${tareaId}/evidencias/${evidencia.id}/descargar`);
      if (!respuesta.ok) throw new Error('No se pudo abrir la evidencia.');
      const url = URL.createObjectURL(await respuesta.blob());
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      alert(err.message || 'No se pudo abrir la evidencia.');
    }
  };

  const eliminarEvidencia = async (id: number) => {
    if (!window.confirm('¿Eliminar esta evidencia?')) return;
    try {
      const respuesta = await fetchConToken(`/tareas/${tareaId}/evidencias/${id}`, { method: 'DELETE' });
      if (!respuesta.ok && respuesta.status !== 204) throw new Error('No se pudo eliminar.');
      await cargarEvidencias(Number(tareaId));
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar la evidencia.');
    }
  };

  return (
    <div className="tab-content active">
      <div className="section-header">
        <h2><i className="fas fa-camera"></i> Evidencias de Tareas</h2>
      </div>

      {esVisualizador && (
        <div style={{ backgroundColor: 'rgba(74,222,128,.12)', border: '1px solid rgba(74,222,128,.35)', color: '#4ade80', padding: '12px 18px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px' }}>
          Modo Visualizador: puedes consultar las evidencias, pero no subirlas ni eliminarlas.
        </div>
      )}

      <div className="input-group" style={{ maxWidth: '360px', marginBottom: '20px' }}>
        <label>Tarea</label>
        <select value={tareaId} onChange={(e) => setTareaId(e.target.value ? Number(e.target.value) : '')}>
          {tareas.length === 0 && <option value="">No hay tareas creadas</option>}
          {tareas.map((t) => <option key={t.id} value={t.id}>{t.nombre_tarea}</option>)}
        </select>
      </div>

      <div className="grid" style={{ gridTemplateColumns: esVisualizador ? '1fr' : undefined }}>
        {puedeEscribir && (
          <div className="card">
            <div className="card-header"><h3><i className="fas fa-upload"></i> Subir evidencia</h3></div>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Archivo (foto, PDF o video, máx. 15 MB)</label>
                <input id="input-archivo-evidencia" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.mp4" onChange={(e) => setArchivo(e.target.files?.[0] || null)} required />
              </div>
              <div className="input-group">
                <label>Descripción (opcional)</label>
                <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={300} />
              </div>
              <button type="submit" className="btn-save" disabled={subiendo || !tareaId}>
                {subiendo ? 'Subiendo...' : 'Subir evidencia'}
              </button>
            </form>
          </div>
        )}

        <div className="card">
          <div className="card-header"><h3><i className="fas fa-images"></i> Evidencias de la tarea</h3></div>
          <div className="project-container">
            {error && <div className="empty-msg" style={{ color: '#dc2626' }}>{error}</div>}
            {cargando && <div className="empty-msg">Cargando evidencias...</div>}
            {!cargando && !error && evidencias.length === 0 && <div className="empty-msg">Todavía no hay evidencias para esta tarea.</div>}
            {!cargando && evidencias.map((ev) => (
              <div key={ev.id} className="project-item" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f1f1', borderRadius: '6px' }}>
                    <i className="fas fa-file" style={{ fontSize: '20px', color: '#888' }}></i>
                  </div>
                  <div>
                    <button type="button" onClick={() => abrirEvidencia(ev)} style={{ background: 'none', border: 'none', color: '#ffd60a', cursor: 'pointer', padding: 0, fontWeight: 700 }}>
                      {ev.nombre_archivo}
                    </button>
                    {ev.descripcion && <div style={{ fontSize: '12px', color: '#666' }}>{ev.descripcion}</div>}
                    <div style={{ fontSize: '11px', color: '#999' }}>{new Date(ev.fecha_subida).toLocaleString()}</div>
                  </div>
                </div>
                {puedeEscribir && (
                  <button onClick={() => eliminarEvidencia(ev.id)} className="btn-delete" title={esArquitecto ? 'Eliminar evidencia' : 'Eliminar evidencia propia'}>
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
