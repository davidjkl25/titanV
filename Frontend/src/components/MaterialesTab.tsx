import { useEffect, useState } from 'react';
import { fetchConToken } from '../api';

interface Material {
  id: number;
  nombre_material: string;
  unidad_medida: string;
}

export const MaterialesTab = () => {
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
      const respuesta = await fetchConToken('/materiales/');
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !unidad) return;

    setGuardando(true);
    try {
      const respuesta = await fetchConToken('/materiales/', {
        method: 'POST',
        body: JSON.stringify({ nombre_material: nombre, unidad_medida: unidad }),
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
        <h2><i className="fas fa-boxes-stacked"></i> Catálogo de Materiales</h2>
      </div>
      <div className="grid">
        <div className="card">
          <div className="card-header"><h3><i className="fas fa-plus-circle"></i> Nuevo Material</h3></div>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Nombre del material</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Cemento Gris ARGOS" required />
            </div>
            <div className="input-group">
              <label>Unidad de medida</label>
              <input type="text" value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="Ej: Bultos" required />
            </div>
            <button type="submit" className="btn-save" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Agregar al catálogo'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header"><h3><i className="fas fa-list"></i> Materiales registrados</h3></div>
          <div className="project-container">
            {error && <div className="empty-msg" style={{ color: '#dc2626' }}>{error}</div>}
            {cargando && <div className="empty-msg">Cargando materiales...</div>}
            {!cargando && !error && materiales.length === 0 && (
              <div className="empty-msg">Todavía no hay materiales en el catálogo.</div>
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
        Nota: este catálogo guarda los <em>tipos</em> de material (nombre + unidad). El stock disponible
        por proyecto y el registro de entradas/salidas se maneja aparte, en el módulo de Inventario.
      </p>
    </div>
  );
};
