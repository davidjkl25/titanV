import { useEffect, useMemo, useState } from 'react';
import { fetchConToken } from '../api';
import { AvisoSoloLectura, BadgeBloqueado, Obligatorio } from './IndicadoresAcceso';
import NotaCamposObligatorios from './ui/NotaCamposObligatorios';

interface Material {
  id: number;
  nombre_material: string;
  unidad_medida: string;
  proyecto_id: number;
  cantidad_inicial: number;
  cantidad_disponible: number;
}

interface Solicitud {
  id: number;
  proyecto_id: number;
  material_id: number;
  usuario_id: number;
  cantidad: number;
  estado: 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Entregada';
  fecha_solicitud: string;
  fecha_actualizacion?: string;
  material_nombre?: string;
  unidad_medida?: string;
  usuario_nombre?: string;
  proyecto_nombre?: string;
}

interface MaterialesTabProps {
  proyectoId: number;
  proyectoNombre?: string;
  rolProyecto?: string;
}

const UNIDADES_MEDIDA = [
  'Unidad', 'Bulto', 'Saco', 'Caja', 'Rollo', 'Varilla',
  'Kilogramo (kg)', 'Gramo (g)', 'Tonelada (t)',
  'Litro (L)', 'Galón',
  'Metro (m)', 'Metro cuadrado (m²)', 'Metro cúbico (m³)',
];

export const MaterialesTab = ({ proyectoId, proyectoNombre, rolProyecto }: MaterialesTabProps) => {
  const esAdministrador = rolProyecto === 'Arquitecto';
  const puedeCrearSolicitud = esAdministrador || rolProyecto === 'Trabajador';
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Material | null>(null);
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('');
  const [cantidadInicial, setCantidadInicial] = useState('');
  const [materialSolicitud, setMaterialSolicitud] = useState('');
  const [cantidadSolicitud, setCantidadSolicitud] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardandoSolicitud, setGuardandoSolicitud] = useState(false);
  const [erroresMat, setErroresMat] = useState<Record<string,string>>({});
  const [erroresSol, setErroresSol] = useState<Record<string,string>>({});

  const cargarDatos = async () => {
    setCargando(true);
    setError('');
    try {
      const [materialesResp, solicitudesResp] = await Promise.all([
        fetchConToken(`/materiales/?proyecto_id=${proyectoId}`),
        fetchConToken(`/solicitudes/?proyecto_id=${proyectoId}`),
      ]);
      if (!materialesResp.ok) throw new Error('No se pudieron cargar los materiales.');
      if (!solicitudesResp.ok) throw new Error('No se pudieron cargar las solicitudes.');
      setMateriales(await materialesResp.json());
      setSolicitudes(await solicitudesResp.json());
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los datos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId]);

  const materialesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return materiales;
    return materiales.filter((m) => `${m.nombre_material} ${m.unidad_medida}`.toLowerCase().includes(termino));
  }, [materiales, busqueda]);

  const limpiarFormulario = () => {
    setNombre('');
    setUnidad('');
    setCantidadInicial('');
    setEditando(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esAdministrador) return;
    const next: Record<string,string> = {};
    if (!nombre.trim()) next.nombre = 'El nombre del material es obligatorio.';
    if (!unidad.trim()) next.unidad = 'La unidad de medida es obligatoria.';
    const cantidad = Number(cantidadInicial);
    if (!editando && (cantidadInicial === '' || !Number.isFinite(cantidad) || cantidad < 0)) next.cantidadInicial = 'Ingresa una cantidad inicial válida (0 o mayor).';
    setErroresMat(next);
    if (Object.keys(next).length) return;
    setGuardando(true);
    try {
      const respuesta = editando
        ? await fetchConToken(`/materiales/${editando.id}`, {
            method: 'PUT',
            body: JSON.stringify({ nombre_material: nombre.trim(), unidad_medida: unidad.trim() }),
          })
        : await fetchConToken('/materiales/', {
            method: 'POST',
            body: JSON.stringify({
              nombre_material: nombre.trim(),
              unidad_medida: unidad.trim(),
              cantidad_inicial: cantidad,
              proyecto_id: proyectoId,
            }),
          });
      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => null);
        throw new Error(data?.detail || 'No se pudo guardar el material.');
      }
      limpiarFormulario();
      await cargarDatos();
    } catch (err: any) {
      alert(err.message || 'No se pudo guardar el material.');
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (material: Material) => {
    if (!esAdministrador) return;
    setEditando(material);
    setNombre(material.nombre_material);
    setUnidad(material.unidad_medida);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarMaterial = async (id: number, nombreMaterial: string) => {
    if (!esAdministrador) return;
    if (!window.confirm(`¿Eliminar "${nombreMaterial}" del catálogo?`)) return;
    try {
      const respuesta = await fetchConToken(`/materiales/${id}`, { method: 'DELETE' });
      if (!respuesta.ok && respuesta.status !== 204) {
        const data = await respuesta.json().catch(() => null);
        throw new Error(data?.detail || 'No se pudo eliminar el material.');
      }
      await cargarDatos();
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar el material.');
    }
  };

  const crearSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeCrearSolicitud) return;
    const next: Record<string,string> = {};
    const cantidad = Number(cantidadSolicitud);
    if (!materialSolicitud) next.materialSolicitud = 'Selecciona un material.';
    if (!cantidadSolicitud || !Number.isFinite(cantidad) || cantidad <= 0) next.cantidadSolicitud = 'Ingresa una cantidad mayor a 0.';
    setErroresSol(next);
    if (Object.keys(next).length) return;
    setGuardandoSolicitud(true);
    try {
      const respuesta = await fetchConToken('/solicitudes/', {
        method: 'POST',
        body: JSON.stringify({ proyecto_id: proyectoId, material_id: Number(materialSolicitud), cantidad }),
      });
      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => null);
        throw new Error(data?.detail || 'No se pudo crear la solicitud.');
      }
      setMaterialSolicitud('');
      setCantidadSolicitud('');
      await cargarDatos();
    } catch (err: any) {
      alert(err.message || 'No se pudo crear la solicitud.');
    } finally {
      setGuardandoSolicitud(false);
    }
  };

  const cambiarEstado = async (solicitud: Solicitud, estado: Solicitud['estado']) => {
    if (!esAdministrador) return;
    try {
      const respuesta = await fetchConToken(`/solicitudes/${solicitud.id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado }),
      });
      const data = await respuesta.json().catch(() => null);
      if (!respuesta.ok) throw new Error(data?.detail || 'No se pudo actualizar la solicitud.');
      await cargarDatos();
    } catch (err: any) {
      alert(err.message || 'No se pudo actualizar la solicitud.');
    }
  };

  
  return (
    <div className="tab-content active materiales-page">
      <div className="section-header">
        <h2><i className="fas fa-boxes-stacked"></i> Materiales</h2>
        {proyectoNombre && <p style={{ color: '#cbd5e1' }}>Proyecto activo: <strong style={{ color: '#ffd60a' }}>{proyectoNombre}</strong></p>}
      </div>

      {error && <div className="empty-msg" style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, .12)', border: '1px solid rgba(252, 165, 165, .4)', borderRadius: 10, marginBottom: 20 }}>{error}</div>}
      {rolProyecto === 'Visualizador' && <AvisoSoloLectura texto="Tu rol Visualizador solo permite consultar materiales y solicitudes. No puedes crear, editar ni solicitar insumos." />}

      <div className="grid">
        {esAdministrador && <div className="card">
          <div className="card-header"><h3><i className={editando ? 'fas fa-pen' : 'fas fa-plus-circle'}></i> {editando ? 'Editar material' : 'Crear material'}</h3></div>
          <form onSubmit={handleSubmit} noValidate>
            <NotaCamposObligatorios />
            <div className="input-group">
              <label htmlFor="mat-nombre">Nombre del material <Obligatorio /></label>
              <input id="mat-nombre" value={nombre} onChange={(e) => { setNombre(e.target.value); setErroresMat(p=>({...p,nombre:''})); }} placeholder="Ej: Cemento Gris ARGOS" required aria-required="true" aria-invalid={!!erroresMat.nombre} />
              {erroresMat.nombre && <span className="field-error" role="alert">{erroresMat.nombre}</span>}
            </div>
            <div className="input-group">
              <label htmlFor="mat-unidad">Unidad de medida <Obligatorio /></label>
              <select id="mat-unidad" value={unidad} onChange={(e) => { setUnidad(e.target.value); setErroresMat(p=>({...p,unidad:''})); }} required aria-required="true" aria-invalid={!!erroresMat.unidad}>
                <option value="">Selecciona una unidad</option>
                {editando && unidad && !UNIDADES_MEDIDA.includes(unidad) && <option value={unidad}>{unidad}</option>}
                {UNIDADES_MEDIDA.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
              </select>
            </div>
            {!editando && <div className="input-group">
              <label>Cantidad inicial <Obligatorio /></label>
              <input type="number" min="0" step="0.01" value={cantidadInicial} onChange={(e) => setCantidadInicial(e.target.value)} placeholder="Ej: 50" required />
              <small style={{ color: '#94a3b8' }}>La cantidad se registra en el inventario usando la unidad indicada.</small>
            </div>}
            <button type="submit" className="btn-save" disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear material'}
            </button>
            {editando && <button type="button" className="btn-secondary" onClick={limpiarFormulario}>Cancelar edición</button>}
          </form>
        </div>}

        <div className="card">
          <div className="card-header"><h3><i className="fas fa-search"></i> Buscar en catálogo</h3>{rolProyecto === 'Visualizador' && <BadgeBloqueado texto="Solo lectura" />}</div>
          <div style={{ padding: 20 }}>
            <input className="search-input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por material o unidad..." />
          </div>
          {cargando ? <div className="empty-msg">Cargando catálogo...</div> : materialesFiltrados.length === 0 ? <div className="empty-msg">No hay materiales que coincidan.</div> : (
            <div className="table-card" style={{ marginTop: 0 }}>
              <table>
                <thead><tr><th>Material</th><th>Cantidad inicial</th><th>Disponible</th><th>Unidad</th>{esAdministrador && <th>Acciones</th>}</tr></thead>
                <tbody>{materialesFiltrados.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.nombre_material}</strong></td>
                    <td>{m.cantidad_inicial}</td>
                    <td><strong style={{ color: '#86efac' }}>{m.cantidad_disponible}</strong></td>
                    <td>{m.unidad_medida}</td>
                    {esAdministrador && <td className="actions-cell">
                      <button className="btn-edit" onClick={() => iniciarEdicion(m)}><i className="fas fa-pen"></i></button>
                      <button className="btn-delete" onClick={() => eliminarMaterial(m.id, m.nombre_material)}><i className="fas fa-trash"></i></button>
                    </td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 30 }}>
        <div className="card-header"><h3><i className="fas fa-file-circle-plus"></i> Solicitudes de materiales</h3></div>
        {puedeCrearSolicitud && <form onSubmit={crearSolicitud} className="form-horizontal request-form" noValidate>
          <div style={{ gridColumn: '1 / -1' }}><NotaCamposObligatorios /></div>
          <div className="input-group"><label htmlFor="sol-material">Material <Obligatorio /></label><select id="sol-material" value={materialSolicitud} onChange={(e) => { setMaterialSolicitud(e.target.value); setErroresSol(p=>({...p,materialSolicitud:''})); }} required aria-required="true" aria-invalid={!!erroresSol.materialSolicitud}><option value="">Selecciona un material</option>{materiales.map((m) => <option key={m.id} value={m.id}>{m.nombre_material} ({m.unidad_medida})</option>)}</select>{erroresSol.materialSolicitud && <span className="field-error" role="alert">{erroresSol.materialSolicitud}</span>}</div>
          <div className="input-group"><label htmlFor="sol-cantidad">Cantidad <Obligatorio /></label><input id="sol-cantidad" type="number" min="0.01" step="0.01" value={cantidadSolicitud} onChange={(e) => { setCantidadSolicitud(e.target.value); setErroresSol(p=>({...p,cantidadSolicitud:''})); }} required aria-required="true" aria-invalid={!!erroresSol.cantidadSolicitud} />{erroresSol.cantidadSolicitud && <span className="field-error" role="alert">{erroresSol.cantidadSolicitud}</span>}</div>
          <button type="submit" className="btn-save" disabled={guardandoSolicitud}>{guardandoSolicitud ? 'Enviando...' : 'Crear solicitud'}</button>
        </form>}

        <div className="table-card" style={{ marginTop: 0 }}>
          {solicitudes.length === 0 ? <div className="empty-msg">Todavía no hay solicitudes registradas.</div> : (
            <table>
              <thead><tr><th>Proyecto</th><th>Material</th><th>Cantidad</th><th>Estado</th><th>Solicitante</th><th>Historial / fecha</th>{esAdministrador && <th>Acciones</th>}</tr></thead>
              <tbody>{solicitudes.map((s) => (
                <tr key={s.id}>
                  <td>{s.proyecto_nombre || proyectoNombre || `#${s.proyecto_id}`}</td>
                  <td>{s.material_nombre || `#${s.material_id}`}</td>
                  <td>{s.cantidad} {s.unidad_medida || ''}</td>
                  <td><span className={`estado-badge ${s.estado === 'Aprobada' ? 'badge-completado' : s.estado === 'Entregada' ? 'badge-activo' : s.estado === 'Rechazada' ? 'badge-cancelado' : 'badge-pausado'}`}>{s.estado}</span></td>
                  <td>{s.usuario_nombre || `#${s.usuario_id}`}</td>
                  <td>
                    Solicitud: {new Date(s.fecha_solicitud).toLocaleString()}
                    {s.fecha_actualizacion && <><br />Actualización: {new Date(s.fecha_actualizacion).toLocaleString()}</>}
                  </td>
                  {esAdministrador && <td className="actions-cell">
                    {s.estado === 'Pendiente' && <><button className="btn-small" onClick={() => cambiarEstado(s, 'Aprobada')}>Aprobar</button><button className="btn-small danger" onClick={() => cambiarEstado(s, 'Rechazada')}>Rechazar</button></>}
                    {s.estado === 'Aprobada' && <button className="btn-small" onClick={() => cambiarEstado(s, 'Entregada')}>Entregar</button>}
                  </td>}
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
