interface ProyectoResumen {
  id: number;
  nombre_proyecto: string;
  ubicacion_direccion?: string;
  estado?: string;
}

interface InicioTabProps {
  proyectos: ProyectoResumen[];
  cargando: boolean;
  proyectoSeleccionado: ProyectoResumen | null;
  onEntrarProyecto: (proyecto: ProyectoResumen) => void;
  onSalirProyecto: () => void;
  onIrA: (tab: string) => void;
  onCrearProyecto: () => void;
  puedeCrearProyecto: boolean;
  puedeVerModulo: (tab: string) => boolean;
}

const MODULOS = [
  { tab: 'colaboradores', icono: 'fa-user-group', titulo: 'Colaboradores', texto: 'Invita por correo y gestiona los roles del equipo.' },
  { tab: 'materiales', icono: 'fa-boxes-stacked', titulo: 'Inventario Insumos', texto: 'Controla entradas y stock de material.' },
  { tab: 'inventario', icono: 'fa-warehouse', titulo: 'Inventario', texto: 'Consulta el stock y el historial de movimientos de materiales.' },
  { tab: 'tareas', icono: 'fa-tasks', titulo: 'Gestión de Tareas', texto: 'Crea tareas, supervisa su estado y gestiona comentarios técnicos.' },
  { tab: 'turnos', icono: 'fa-clock', titulo: 'Turnos y Asistencia', texto: 'Programa turnos y registra la asistencia del equipo.' },
  { tab: 'evidencias', icono: 'fa-camera', titulo: 'Evidencias de Obra', texto: 'Sube fotos y documentos del avance del proyecto.' },
];

export const InicioTab = ({
  proyectos,
  cargando,
  proyectoSeleccionado,
  onEntrarProyecto,
  onSalirProyecto,
  onIrA,
  onCrearProyecto,
  puedeCrearProyecto,
  puedeVerModulo,
}: InicioTabProps) => {
  if (cargando) {
    return (
      <div className="tab-content active">
        <div className="section-header">
          <h2><i className="fas fa-house"></i> Bienvenido a Titan V</h2>
        </div>
        <p style={{ color: '#666' }}>Cargando...</p>
      </div>
    );
  }

  // Dentro de un proyecto: atajos a los módulos del proyecto activo.
  if (proyectoSeleccionado) {
    return (
      <div className="tab-content active">
        <div className="section-header">
          <h2><i className="fas fa-diagram-project"></i> {proyectoSeleccionado.nombre_proyecto}</h2>
        </div>
        <div className="grid">
          {MODULOS.filter((m) => puedeVerModulo(m.tab)).map((m) => (
            <div key={m.tab} className="card" style={{ cursor: 'pointer' }} onClick={() => onIrA(m.tab)}>
              <div className="card-header">
                <h3><i className={`fas ${m.icono}`}></i> {m.titulo}</h3>
              </div>
              <p style={{ padding: '20px 25px', color: '#666', fontSize: '14px' }}>{m.texto}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onSalirProyecto}
          style={{
            marginTop: '20px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '10px 16px',
            fontWeight: 700,
            color: '#475569',
            cursor: 'pointer',
          }}
        >
          <i className="fas fa-arrow-left"></i> Cambiar de proyecto
        </button>
      </div>
    );
  }

  // Sin proyecto activo: listar proyectos para entrar o crear uno.
  return (
    <div className="tab-content active">
      <div className="section-header">
        <h2><i className="fas fa-house"></i> Bienvenido a Titan V</h2>
        <p style={{ color: '#666' }}>Entra a un proyecto para trabajar en sus módulos, o crea uno nuevo.</p>
      </div>

      <div className="grid">
        {puedeCrearProyecto && <div
          className="card"
          style={{ cursor: 'pointer', border: '2px dashed #cbd5e1', textAlign: 'center' }}
          onClick={onCrearProyecto}
        >
          <div className="card-header" style={{ justifyContent: 'center' }}>
            <h3><i className="fas fa-plus-circle"></i> Crear proyecto</h3>
          </div>
          <p style={{ padding: '20px 25px', color: '#666', fontSize: '14px' }}>
            Registra una nueva obra para empezar a gestionar su equipo, inventario, tareas y evidencias.
          </p>
        </div>}

        {proyectos.length === 0 ? (
          <div className="card">
            <div className="card-header">
              <h3><i className="fas fa-diagram-project"></i> Mis proyectos</h3>
            </div>
            <p className="empty-msg">Todavía no tienes ningún proyecto. Crea el primero para comenzar.</p>
          </div>
        ) : (
          proyectos.map((p) => (
            <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => onEntrarProyecto(p)}>
              <div className="card-header">
                <h3><i className="fas fa-diagram-project"></i> {p.nombre_proyecto}</h3>
              </div>
              <p style={{ padding: '20px 25px', color: '#666', fontSize: '14px' }}>
                {p.ubicacion_direccion ? p.ubicacion_direccion : 'Sin ubicación registrada.'}
              </p>
              <div style={{ padding: '0 25px 20px' }}>
                <span
                  className="btn-save"
                  style={{ display: 'inline-block', cursor: 'pointer', padding: '8px 14px', fontSize: '13px' }}
                >
                  Entrar al proyecto
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
