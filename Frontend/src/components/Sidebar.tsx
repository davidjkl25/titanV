interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  proyecto: { id: number; nombre_proyecto: string } | null;
  onSalirProyecto: () => void;
}

const ITEMS_MODULO = ['colaboradores', 'materiales', 'inventario', 'tareas', 'turnos', 'evidencias'];

export const Sidebar = ({ activeTab, onSelectTab, onLogout, proyecto, onSalirProyecto }: SidebarProps) => {
  const sinProyecto = !proyecto;
  const puedeVer = (_tab: string) => true;

  const manejarClick = (tab: string) => {
    if (sinProyecto && ITEMS_MODULO.includes(tab)) {
      alert('Primero entra a un proyecto desde "Inicio" para desbloquear estas secciones.');
      return;
    }
    onSelectTab(tab);
  };
  

  const claseItem = (tab: string) => {
    let clase = activeTab === tab ? 'active' : '';
    if (sinProyecto && ITEMS_MODULO.includes(tab)) clase += ' bloqueado';
    return clase.trim();
  };

  const icono = (tab: string) =>
    sinProyecto && ITEMS_MODULO.includes(tab) ? (
      <i className="fas fa-lock" style={{ fontSize: '11px', marginLeft: '6px' }}></i>
    ) : null;

  return (
    <div className="sidebar">
      <div className="logo">
        TITAN <span>V</span>
      </div>

      {proyecto && (
        <div
          style={{
            margin: '0 12px 14px',
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 214, 10, 0.12)',
            border: '1px solid rgba(255, 214, 10, 0.4)',
          }}
        >
          <div style={{ fontSize: '11px', color: '#ffd60a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            Proyecto activo
          </div>
          <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '10px', wordBreak: 'break-word' }}>
            <i className="fas fa-diagram-project" style={{ marginRight: '6px' }}></i>
            {proyecto.nombre_proyecto}
          </div>
          <button
            onClick={onSalirProyecto}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              color: '#ffd60a',
              border: '1px solid #ffd60a',
              borderRadius: '6px',
              padding: '6px 10px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Cambiar de proyecto
          </button>
        </div>
      )}

      <div className="sidebar-menu">
        <a style={{ cursor: 'pointer' }} className={claseItem('inicio')} onClick={() => manejarClick('inicio')}>
          Inicio
        </a>
        <a style={{ cursor: 'pointer' }} className={claseItem('proyectos')} onClick={() => manejarClick('proyectos')}>
          Proyectos de Obra
        </a>
        {puedeVer('colaboradores') && <a style={{ cursor: 'pointer' }} className={claseItem('colaboradores')} onClick={() => manejarClick('colaboradores')}>
          Colaboradores {icono('colaboradores')}
        </a>}
        {puedeVer('materiales') && <a style={{ cursor: 'pointer' }} className={claseItem('materiales')} onClick={() => manejarClick('materiales')}>
          Materiales {icono('materiales')}
        </a>}
        {puedeVer('inventario') && <a style={{ cursor: 'pointer' }} className={claseItem('inventario')} onClick={() => manejarClick('inventario')}>
          Inventario Insumos {icono('inventario')}
        </a>}
        {puedeVer('tareas') && <a style={{ cursor: 'pointer' }} className={claseItem('tareas')} onClick={() => manejarClick('tareas')}>
          Gestión de Tareas {icono('tareas')}
        </a>}
        {puedeVer('turnos') && <a style={{ cursor: 'pointer' }} className={claseItem('turnos')} onClick={() => manejarClick('turnos')}>
          Turnos y Asistencia {icono('turnos')}
        </a>}
        {puedeVer('evidencias') && <a style={{ cursor: 'pointer' }} className={claseItem('evidencias')} onClick={() => manejarClick('evidencias')}>
          Evidencias {icono('evidencias')}
        </a>}

        <a onClick={onLogout} style={{ marginTop: '20px', color: '#ff4757', cursor: 'pointer' }}>
          Cerrar Sesión
        </a>
      </div>
    </div>
  );
};
