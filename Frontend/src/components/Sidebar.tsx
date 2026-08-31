interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  bloqueado?: boolean;
}

const ITEMS_LIBRES = ['inicio', 'proyectos'];

export const Sidebar = ({ activeTab, onSelectTab, onLogout, bloqueado = false }: SidebarProps) => {
  const manejarClick = (tab: string) => {
    if (bloqueado && !ITEMS_LIBRES.includes(tab)) {
      alert('Primero crea tu primer proyecto en "Proyectos de Obra" para desbloquear esta sección.');
      return;
    }
    onSelectTab(tab);
  };

  const claseItem = (tab: string) => {
    let clase = activeTab === tab ? 'active' : '';
    if (bloqueado && !ITEMS_LIBRES.includes(tab)) clase += ' bloqueado';
    return clase.trim();
  };

  const icono = (tab: string) =>
    bloqueado && !ITEMS_LIBRES.includes(tab) ? (
      <i className="fas fa-lock" style={{ fontSize: '11px', marginLeft: '6px' }}></i>
    ) : null;

  return (
    <div className="sidebar">
      <div className="logo">
        TITAN <span>V</span>
      </div>
      <div className="sidebar-menu">
        <a style={{ cursor: 'pointer' }} className={claseItem('inicio')} onClick={() => manejarClick('inicio')}>
          Inicio
        </a>
        <a style={{ cursor: 'pointer' }} className={claseItem('proyectos')} onClick={() => manejarClick('proyectos')}>
          Proyectos de Obra
        </a>
        <a style={{ cursor: 'pointer' }} className={claseItem('materiales')} onClick={() => manejarClick('materiales')}>
          Inventario Insumos {icono('materiales')}
        </a>
        <a style={{ cursor: 'pointer' }} className={claseItem('usuarios')} onClick={() => manejarClick('usuarios')}>
          Gestión de Usuarios {icono('usuarios')}
        </a>
        <a style={{ cursor: 'pointer' }} className={claseItem('productos')} onClick={() => manejarClick('productos')}>
          Catálogo / Productos {icono('productos')}
        </a>
        <a style={{ cursor: 'pointer' }} className={claseItem('tareas')} onClick={() => manejarClick('tareas')}>
          Gestión de Tareas {icono('tareas')}
        </a>

        <a onClick={onLogout} style={{ marginTop: '20px', color: '#ff4757', cursor: 'pointer' }}>
          Cerrar Sesión
        </a>
      </div>
    </div>
  );
};
