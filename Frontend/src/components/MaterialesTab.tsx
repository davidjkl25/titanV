import { useEffect, useState } from 'react';
import { fetchConToken } from '../api';

interface Material {
  id: number;
  nombre_material: string;
  unidad_medida: string;
  proyecto_id: number;
}

interface MaterialesTabProps {
  proyectoId: number;
  proyectoNombre?: string;
}

export const MaterialesTab = ({ proyectoId, proyectoNombre }: MaterialesTabProps) => {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarMateriales = async () => {
    setCargando(true);
    setError('');
    try {
      const respuesta = await fetchConToken(`/materiales/?proyecto_id=${proyectoId}`);
      if (!respuesta.ok) throw new Error('No se pudieron cargar los materiales.');
      setMateriales(await respuesta.json());
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los materiales.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMateriales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !unidad) return;

    setGuardando(true);
    try {
      const respuesta = await fetchConToken('/materiales/', {
        method: 'POST',
        body: JSON.stringify({ nombre_material: nombre, unidad_medida: unidad, proyecto_id: proyectoId }),
      });
      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => null);
        throw new Error(data?.detail || 'No se pudo crear el material.');
      }
      setNombre('');
      setUnidad('');
      await cargarMateriales();
    } catch (err: any) {
      alert(err.message || 'No se pudo crear el material.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarMaterial = async (id: number, nombreMaterial: string) => {
    if (!window.confirm(`¿Eliminar "${nombreMaterial}" del catálogo?`)) return;
    try {
      const respuesta = await fetchConToken(`/materiales/${id}`, { method: 'DELETE' });
      if (!respuesta.ok && respuesta.status !== 204) {
        const data = await respuesta.json().catch(() => null);
        throw new Error(data?.detail || 'No se pudo eliminar el material.');
      }
      await cargarMateriales();
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar el material.');
    }
  };

  return (
    <div className="tab-content active">
      <div className="section-header">
        <h2><i className="fas fa-boxes-stacked"></i> Inventario de Insumos</h2>
        {proyectoNombre && (
          <p style={{ color: '#666' }}>
            Insumos exclusivos del proyecto: <strong>{proyectoNombre}</strong>
          </p>
        )}
      </div>
      <div className="grid">
        <div className="card">
          <div className="card-header"><h3><i className="fas fa-plus-circle"></i> Nuevo Insumo</h3></div>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Nombre del insumo</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Cemento Gris ARGOS" required />
            </div>
            <div className="input-group">
              <label>Unidad de medida</label>
              <input type="text" value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="Ej: Bultos" required />
            </div>
            <button type="submit" className="btn-save" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Agregar al proyecto'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header"><h3><i className="fas fa-list"></i> Insumos del proyecto</h3></div>
          <div className="project-container">
            {error && <div className="empty-msg" style={{ color: '#dc2626' }}>{error}</div>}
            {cargando && <div className="empty-msg">Cargando insumos...</div>}
            {!cargando && !error && materiales.length === 0 && (
              <div className="empty-msg">Este proyecto todavía no tiene insumos registrados.</div>
            )}
            {!cargando && materiales.map((m) => (
              <div key={m.id} className="project-item">
                <div>
                  <h4>{m.nombre_material}</h4>
                  <span style={{ fontSize: '12px', color: '#666' }}>Unidad: {m.unidad_medida}</span>
                </div>
                <button onClick={() => eliminarMaterial(m.id, m.nombre_material)} className="btn-delete">
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: '#888', marginTop: '14px' }}>
        Cada proyecto tiene su propio listado de insumos (no se comparte entre proyectos).
        Las entradas y salidas de stock se registran por proyecto en el kardex.
      </p>
    </div>
  );
};
