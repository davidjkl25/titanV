import React, { useEffect, useState } from 'react';
import { fetchConToken } from '../api';
import { obtenerSesion } from '../auth';

export interface Comentario {
  id: number;
  tarea_id?: number;
  usuario_id: number;
  contenido: string;
  fecha_comentario: string;
}

interface ComentariosProps {
  tareaId: number;
  tareaNombre?: string;
  rolProyecto?: string;
  onCerrar?: () => void;
}

const Comentarios: React.FC<ComentariosProps> = ({ tareaId, tareaNombre, rolProyecto, onCerrar }) => {
  const sesion = obtenerSesion();
  const puedeEscribir = ['Arquitecto', 'Trabajador'].includes(rolProyecto || '');
  const puedeBorrar = (comentario: Comentario) =>
    puedeEscribir && (comentario.usuario_id === sesion?.usuarioId || rolProyecto === 'Arquitecto');

  const [listaComentarios, setListaComentarios] = useState<Comentario[]>([]);
  const [cargando, setCargando] = useState(false);
  const [contenido, setContenido] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const obtenerComentarios = async () => {
    try {
      setCargando(true);
      setMensajeError(null);
      const respuesta = await fetchConToken(`/tareas/${tareaId}/comentarios`);
      if (!respuesta.ok) throw new Error('No se pudieron cargar los comentarios.');
      setListaComentarios(await respuesta.json());
    } catch (error: any) {
      setMensajeError(error.message || 'No se pudieron cargar los comentarios de esta tarea.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (tareaId) obtenerComentarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareaId]);

  const manejarEnvioComentario = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!contenido.trim() || contenido.length > 300) return;

    try {
      setEnviando(true);
      setMensajeError(null);
      const respuesta = await fetchConToken(`/tareas/${tareaId}/comentarios`, {
        method: 'POST',
        body: JSON.stringify({ contenido: contenido.trim(), tarea_id: tareaId }),
      });
      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => null);
        throw new Error(data?.detail || 'No se pudo guardar el comentario.');
      }
      const creado = await respuesta.json();
      setListaComentarios((prev) => [...prev, creado]);
      setContenido('');
    } catch (error: any) {
      setMensajeError(error.message || 'Ocurrió un error al registrar el comentario.');
    } finally {
      setEnviando(false);
    }
  };

  const manejarEliminarComentario = async (idComentario: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este comentario?')) return;
    try {
      const respuesta = await fetchConToken(`/tareas/comentarios/${idComentario}`, { method: 'DELETE' });
      if (!respuesta.ok && respuesta.status !== 204) throw new Error('No se pudo eliminar el comentario.');
      setListaComentarios((prev) => prev.filter((c) => c.id !== idComentario));
    } catch (error: any) {
      alert(error.message || 'No se pudo eliminar el comentario.');
    }
  };

  const formatearFecha = (fechaStr: string) => {
    try {
      return new Date(fechaStr).toLocaleString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return fechaStr;
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}><i className="fas fa-comments"></i> Comentarios</h3>
          <span style={{ backgroundColor: '#ffd60a', color: '#000', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
            TAREA #{tareaId}
          </span>
          {tareaNombre && <span className="muted-text" style={{ fontSize: '13px' }}>{tareaNombre}</span>}
        </div>
        {onCerrar && <button onClick={onCerrar} className="btn-delete">Cerrar</button>}
      </div>

      <div style={{ padding: '20px 24px 24px' }}>
        {mensajeError && <div className="empty-msg" style={{ color: '#fca5a5' }}>{mensajeError}</div>}

        {puedeEscribir && (
          <form onSubmit={manejarEnvioComentario} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              required
              maxLength={300}
              placeholder="Escribe tu comentario o nota técnica aquí (máx. 300 caracteres)..."
              rows={3}
              style={{ resize: 'vertical', fontSize: '13px', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{contenido.length} / 300</div>
            <button type="submit" className="btn-save" disabled={enviando || !contenido.trim()}>
              {enviando ? 'Guardando...' : 'Publicar comentario'}
            </button>
          </form>
        )}

        <h3 style={{ color: '#fff', fontSize: '15px', margin: '0 0 12px 0' }}>
          Historial de Comentarios ({listaComentarios.length})
        </h3>

        {cargando ? (
          <div className="empty-msg">Cargando comentarios...</div>
        ) : listaComentarios.length === 0 ? (
          <div className="empty-msg">No hay comentarios aún para esta tarea.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
            {listaComentarios.map((c) => (
              <div key={c.id} style={{ padding: '12px', backgroundColor: 'rgba(8,11,17,.72)', border: '1px solid rgba(255,255,255,.12)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffd60a' }}>Usuario #{c.usuario_id}</span>
                    {c.fecha_comentario && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatearFecha(c.fecha_comentario)}</span>}
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>{c.contenido}</p>
                </div>
                {puedeBorrar(c) && (
                  <button onClick={() => manejarEliminarComentario(c.id)} className="btn-delete">Eliminar</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Comentarios;
