import { useEffect, useState } from 'react';
import { fetchConToken } from '../api';
import { AvisoSoloLectura, BadgeBloqueado, Obligatorio } from './IndicadoresAcceso';
import NotaCamposObligatorios from './ui/NotaCamposObligatorios';

interface Material { id: number; nombre_material: string; unidad_medida: string; proyecto_id: number; }
interface Inventario { proyecto_id: number; material_id: number; cantidad_disponible: number; material_nombre?: string; unidad_medida?: string; }
interface Movimiento { id: number; proyecto_id: number; material_id: number; usuario_id: number; tipo_movimiento: string; cantidad: number; fecha_movimiento: string; material_nombre?: string; unidad_medida?: string; usuario_nombre?: string; proyecto_nombre?: string; }

export const InventarioTab = ({ proyectoId, proyectoNombre, rolProyecto }: { proyectoId: number; proyectoNombre?: string; rolProyecto?: string }) => {
  const puedeRegistrar = rolProyecto === 'Arquitecto' || rolProyecto === 'Trabajador';
  const soloLectura = rolProyecto === 'Visualizador';
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [materialId, setMaterialId] = useState('');
  const [tipo, setTipo] = useState<'Entrada' | 'Salida'>('Entrada');
  const [cantidad, setCantidad] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [erroresForm, setErroresForm] = useState<Record<string, string>>({});

  const cargar = async () => {
    setCargando(true); setError('');
    try {
      const [m, i, k] = await Promise.all([
        fetchConToken(`/materiales/?proyecto_id=${proyectoId}`),
        fetchConToken(`/movimientos/inventario/${proyectoId}`),
        fetchConToken(`/movimientos/?proyecto_id=${proyectoId}`),
      ]);
      if (!m.ok || !i.ok || !k.ok) throw new Error('No se pudo cargar el inventario.');
      setMateriales(await m.json()); setInventario(await i.json()); setMovimientos(await k.json());
    } catch (err: any) { setError(err.message || 'No se pudo cargar el inventario.'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [proyectoId]);

  const stockDisponible = (id: number) => inventario.find((i) => i.material_id === id)?.cantidad_disponible ?? 0;
  const materialSeleccionado = materiales.find((m) => m.id === Number(materialId));
  const stockSel = materialId ? stockDisponible(Number(materialId)) : 0;

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeRegistrar) return;
    const next: Record<string, string> = {};
    const valor = Number(cantidad);
    if (!materialId) next.materialId = 'Selecciona un material.';
    if (!cantidad || !Number.isFinite(valor) || valor <= 0) next.cantidad = 'Ingresa una cantidad mayor a 0.';
    if (tipo === 'Salida' && materialId && Number.isFinite(valor) && valor > stockSel) next.cantidad = `Stock insuficiente. Disponible: ${stockSel} ${materialSeleccionado?.unidad_medida || ''}`.trim();
    setErroresForm(next);
    if (Object.keys(next).length) return;
    setGuardando(true);
    try {
      const resp = await fetchConToken('/movimientos/', { method: 'POST', body: JSON.stringify({ proyecto_id: proyectoId, material_id: Number(materialId), tipo_movimiento: tipo, cantidad: valor }) });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.detail || 'No se pudo registrar el movimiento.');
      setMaterialId(''); setCantidad(''); setErroresForm({}); await cargar();
    } catch (err: any) { setError(err.message || 'No se pudo registrar el movimiento.'); }
    finally { setGuardando(false); }
  };

  const nombreMaterial = (id: number) => materiales.find((m) => m.id === id)?.nombre_material || `#${id}`;
  const unidadMaterial = (id: number) => materiales.find((m) => m.id === id)?.unidad_medida || '';
  const salidaBloqueada = tipo === 'Salida' && !!materialId && Number(cantidad) > stockSel;

  return <div className="tab-content active">
    <div className="section-header"><h2><i className="fas fa-warehouse"></i> Inventario</h2>{proyectoNombre && <p style={{ color: '#cbd5e1' }}>Obra: <strong style={{ color: '#ffd60a' }}>{proyectoNombre}</strong></p>}</div>
    {error && <div className="empty-msg" role="alert" style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, .12)', border: '1px solid rgba(252, 165, 165, .4)', borderRadius: 10, marginBottom: 20 }}>{error}</div>}
    {soloLectura && <AvisoSoloLectura texto="Tu rol (Visualizador) solo permite consultar el inventario. No puedes registrar movimientos." />}

    <div className="card">
      <div className="card-header"><h3><i className="fas fa-warehouse"></i> Inventario por obra</h3></div>
      {cargando ? <div className="loading-state"><span className="loading-spinner" aria-hidden="true"></span>Cargando stock...</div> : <div className="table-card" style={{ marginTop: 0 }}><table><thead><tr><th>ID</th><th>Proyecto</th><th>Material</th><th>Stock actual</th></tr></thead><tbody>
        {inventario.length === 0 ? <tr><td colSpan={4}><div className="empty-state"><i className="fas fa-box-open"></i><p>No hay stock registrado todavía.</p></div></td></tr> : inventario.map((i) => <tr key={`${i.proyecto_id}-${i.material_id}`}><td>#{i.material_id}</td><td>{proyectoNombre || `#${i.proyecto_id}`}</td><td>{i.material_nombre || nombreMaterial(i.material_id)}</td><td><strong style={{ color: '#86efac' }}>{i.cantidad_disponible}</strong> {i.unidad_medida || unidadMaterial(i.material_id)}</td></tr>)}
      </tbody></table></div>}
    </div>

    {puedeRegistrar && <div className="card" style={{ marginTop: 30 }}>
      <div className="card-header"><h3><i className="fas fa-right-left"></i> Movimientos</h3></div>
      <form onSubmit={registrar} className="form-horizontal request-form" noValidate>
        <div style={{ gridColumn: '1 / -1' }}><NotaCamposObligatorios /></div>
        <div className="input-group"><label htmlFor="mov-material">Material <Obligatorio /></label><select id="mov-material" value={materialId} onChange={(e) => { setMaterialId(e.target.value); setErroresForm((p)=>({...p, materialId:''})); }} required aria-required="true" aria-invalid={!!erroresForm.materialId}><option value="">Selecciona un material</option>{materiales.map((m) => <option key={m.id} value={m.id}>{m.nombre_material}</option>)}</select>{erroresForm.materialId && <span className="field-error" role="alert">{erroresForm.materialId}</span>}</div>
        <div className="input-group"><label htmlFor="mov-tipo">Tipo <Obligatorio /></label><select id="mov-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as 'Entrada' | 'Salida')}><option value="Entrada">Entrada</option><option value="Salida">Salida</option></select></div>
        <div className="input-group"><label htmlFor="mov-cantidad">Cantidad <Obligatorio /></label><input id="mov-cantidad" type="number" min="0.01" step="0.01" value={cantidad} onChange={(e) => { setCantidad(e.target.value); setErroresForm((p)=>({...p, cantidad:''})); }} required aria-required="true" aria-invalid={!!erroresForm.cantidad} />{tipo === 'Salida' && materialId && <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Disponible: {stockSel} {materialSeleccionado?.unidad_medida || ''}</span>}{erroresForm.cantidad && <span className="field-error" role="alert">{erroresForm.cantidad}</span>}</div>
        <div className="ui-tooltip-wrap" data-tooltip={salidaBloqueada ? `Stock insuficiente. Disponible: ${stockSel}` : undefined}>
          <button className="btn-save" type="submit" disabled={guardando || salidaBloqueada} aria-disabled={guardando || salidaBloqueada}>{guardando ? 'Registrando...' : `Registrar ${tipo.toLowerCase()}`}</button>
        </div>
      </form>
    </div>}

    <div className="card" style={{ marginTop: 30 }}>
      <div className="card-header"><h3><i className="fas fa-clock-rotate-left"></i> Kardex</h3>{soloLectura && <BadgeBloqueado texto="Solo lectura" />}</div>
      <div className="table-card" style={{ marginTop: 0 }}><table><thead><tr><th>ID</th><th>Fecha</th><th>Material</th><th>Proyecto</th><th>Usuario</th><th>Tipo</th><th>Cantidad</th></tr></thead><tbody>
        {movimientos.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><i className="fas fa-clock-rotate-left"></i><p>No hay movimientos registrados.</p></div></td></tr> : movimientos.map((m) => <tr key={m.id}><td>#{m.id}</td><td>{new Date(m.fecha_movimiento).toLocaleString()}</td><td>{m.material_nombre || nombreMaterial(m.material_id)}</td><td>{m.proyecto_nombre || proyectoNombre || `#${m.proyecto_id}`}</td><td>{m.usuario_nombre || `#${m.usuario_id}`}</td><td><span className={`estado-badge ${m.tipo_movimiento === 'Entrada' ? 'badge-activo' : 'badge-cancelado'}`}><i className={`fas ${m.tipo_movimiento === 'Entrada' ? 'fa-arrow-down' : 'fa-arrow-up'}`} aria-hidden="true"></i> {m.tipo_movimiento}</span></td><td>{m.cantidad} {m.unidad_medida || unidadMaterial(m.material_id)}</td></tr>)}
      </tbody></table></div>
    </div>
  </div>;
};
