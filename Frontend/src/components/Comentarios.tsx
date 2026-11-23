import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BadgeBloqueado, Obligatorio } from './IndicadoresAcceso';
import NotaCamposObligatorios from './ui/NotaCamposObligatorios';

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
  onCerrar?: () => void;
  soloLectura?: boolean;
}

const API_URL = 'http://127.0.0.1:8000';

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
});

const Comentarios: React.FC<ComentariosProps> = ({ tareaId, tareaNombre, onCerrar, soloLectura = false }) => {
  const [listaComentarios, setListaComentarios] = useState<Comentario[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [contenido, setContenido] = useState<string>('');
  const [usuarioId, setUsuarioId] = useState<number>(1);
  const [enviando, setEnviando] = useState<boolean>(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [errorContenido, setErrorContenido] = useState<string | null>(null);

  useEffect(() => {
    if (tareaId) {
      obtenerComentarios();
    }
  }, [tareaId]);

  const obtenerComentarios = async () => {
    try {
      setCargando(true);
      setMensajeError(null);
      const respuesta = await axios.get<Comentario[]>(`${API_URL}/tareas/${tareaId}/comentarios`);
      setListaComentarios(respuesta.data);
    } catch (error) {
      console.error('Error al obtener los comentarios:', error);
      setMensajeError('No se pudieron cargar los comentarios de esta tarea.');
    } finally {
      setCargando(false);
    }
  };

  const manejarEnvioComentario = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (soloLectura) return;
    if (!contenido.trim()) { setErrorContenido('El comentario es obligatorio.'); return; }
    if (contenido.length > 300) { setErrorContenido('El comentario no puede superar los 300 caracteres.'); return; }
    setErrorContenido(null);

    try {
      setEnviando(true);
      setMensajeError(null);
      // El backend recibe usuario_id como query param y el contenido en el cuerpo del request
      const respuesta = await axios.post<Comentario>(
        `${API_URL}/tareas/${tareaId}/comentarios?usuario_id=${usuarioId}`,
        {
          contenido: contenido.trim(),
          tarea_id: tareaId,
        },
        authHeaders()
      );

      setListaComentarios((prev) => [...prev, respuesta.data]);
      setContenido('');
    } catch (error: any) {
      console.error('Error al guardar el comentario:', error);
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
        setMensajeError('⚠️ Error de Red: No se pudo conectar con el backend (http://127.0.0.1:8000). Revisa que uvicorn esté corriendo.');
      } else {
        const detalle = error.response?.data?.detail || error.message || 'Ocurrió un error al registrar el comentario en la base de datos.';
        setMensajeError(detalle);
      }
    } finally {
      setEnviando(false);
    }
  };

  const manejarEliminarComentario = async (idComentario: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este comentario?')) return;

    try {
      // Endpoint según tarea_router.py: DELETE /tareas/comentarios/{comentario_id}
      await axios.delete(`${API_URL}/tareas/comentarios/${idComentario}`, authHeaders());
      setListaComentarios((prev) => prev.filter((c) => c.id !== idComentario));
    } catch (error) {
      console.error('Error al eliminar el comentario:', error);
      alert('No se pudo eliminar el comentario.');
    }
  };

  const formatearFecha = (fechaStr: string) => {
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleString('es-CO', {
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
      <div
        className="card-header"
        style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}><i className="fas fa-comments"></i> Comentarios</h3>
          <span
            style={{
              backgroundColor: '#ffd60a',
              color: '#000',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            TAREA #{tareaId}
          </span>
          {tareaNombre && (
            <span className="muted-text" style={{ fontSize: '13px' }}>
              {tareaNombre}
            </span>
          )}
          {soloLectura && <BadgeBloqueado texto="Solo lectura" />}
        </div>

        {onCerrar && (
          <button
            onClick={onCerrar}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, .22)',
              borderRadius: '6px',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: '12px',
              color: '#cbd5e1',
              fontWeight: 'bold',
            }}
            title="Cerrar panel de comentarios"
          >
            ✕ Cerrar
          </button>
        )}
      </div>

      <div style={{ padding: '20px 24px 24px' }}>
        {mensajeError && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, .14)',
              color: '#fca5a5',
              border: '1px solid rgba(252, 165, 165, .4)',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '14px',
            }}
          >
            {mensajeError}
          </div>
        )}

        {/* Formulario de creación de comentario */}
        <NotaCamposObligatorios />
        <form
          onSubmit={manejarEnvioComentario}
          noValidate
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: 0,
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <label
              style={{
                color: '#ffd60a',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Publicar como usuario <Obligatorio />
            </label>
            <input
              type="number"
              min="1"
              value={usuarioId}
              onChange={(e) => setUsuarioId(Number(e.target.value) || 1)}
              disabled={soloLectura}
              style={{
                width: '80px',
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '13px',
                textAlign: 'center',
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#ffd60a', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
              Comentario <Obligatorio />
            </label>
            <textarea
              value={contenido}
              onChange={(e) => { setContenido(e.target.value); if (errorContenido) setErrorContenido(null); }}
              disabled={soloLectura}
              required
              aria-required="true"
              aria-invalid={!!errorContenido}
              maxLength={300}
              placeholder="Escribe tu comentario o nota técnica aquí (máx. 300 caracteres)..."
              rows={3}
              style={{
                display: 'block',
                resize: 'vertical',
                fontSize: '13px',
                fontFamily: 'inherit',
                width: '100%',
                borderColor: errorContenido ? '#ef4444' : undefined,
              }}
            />
            {errorContenido && <span className="field-error" role="alert">{errorContenido}</span>}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '4px',
                fontSize: '11px',
                color: contenido.length > 280 ? '#f87171' : '#94a3b8',
              }}
            >
              <span>Máximo 300 caracteres</span>
              <span>{contenido.length} / 300</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn-save"
            disabled={enviando || !contenido.trim() || soloLectura}
            style={{
              padding: '12px',
              marginTop: 0,
              cursor: enviando || !contenido.trim() || soloLectura ? 'not-allowed' : 'pointer',
              opacity: enviando || !contenido.trim() || soloLectura ? 0.6 : 1,
            }}
            title={soloLectura ? 'Tu rol no puede publicar comentarios' : undefined}
          >
            {soloLectura ? '🔒 Solo lectura' : enviando ? 'Guardando...' : '➕ Publicar Comentario'}
          </button>
        </form>

        {/* Historial de Comentarios */}
        <h3 style={{ color: '#fff', fontSize: '15px', margin: '0 0 12px 0' }}>
          Historial de Comentarios ({listaComentarios.length})
        </h3>

        {cargando ? (
          <div className="empty-msg" style={{ padding: '20px', fontSize: '13px' }}>
            Cargando comentarios desde la base de datos...
          </div>
        ) : listaComentarios.length === 0 ? (
          <div
            className="empty-msg"
            style={{
              padding: '20px',
              backgroundColor: 'rgba(8, 11, 17, .6)',
              borderRadius: '8px',
              border: '1px dashed rgba(255, 255, 255, .18)',
              color: '#94a3b8',
              fontSize: '13px',
            }}
          >
            No hay comentarios aún para esta tarea. Sé el primero en comentar.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '380px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {listaComentarios.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(8, 11, 17, .72)',
                  border: '1px solid rgba(255, 255, 255, .12)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#ffd60a',
                        backgroundColor: 'rgba(255, 214, 10, .12)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      Usuario #{c.usuario_id}
                    </span>
                    {c.fecha_comentario && (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {formatearFecha(c.fecha_comentario)}
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {c.contenido}
                  </p>
                </div>

                <button
                  onClick={() => manejarEliminarComentario(c.id)}
                  className="btn-delete"
                  style={{
                    borderRadius: '4px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                  title="Eliminar comentario"
                >
                  🗑 Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Comentarios;
