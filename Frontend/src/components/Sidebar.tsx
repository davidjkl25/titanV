interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar = ({ activeTab, onSelectTab, onLogout }: SidebarProps) => {
  return (
    <div className="sidebar">
      <div className="logo">
        TITAN <span>V</span>
      </div>
      <div className="sidebar-menu">
        <a
          style={{ cursor: 'pointer' }}
          className={activeTab === 'inicio' ? 'active' : ''}
          onClick={() => onSelectTab('inicio')}
        >
          Inicio
        </a>
        <a 
          style={{ cursor: 'pointer' }}
          className={activeTab === 'proyectos' ? 'active' : ''} 
          onClick={() => onSelectTab('proyectos')}
        >
          Proyectos de Obra
        </a>
        <a 
          style={{ cursor: 'pointer' }}
          className={activeTab === 'materiales' ? 'active' : ''} 
          onClick={() => onSelectTab('materiales')}
        >
          Inventario Insumos
        </a>
        <a 
          style={{ cursor: 'pointer' }}
          className={activeTab === 'usuarios' ? 'active' : ''} 
          onClick={() => onSelectTab('usuarios')}
        >
          Gestión de Usuarios
        </a>
        <a 
          style={{ cursor: 'pointer' }}
          className={activeTab === 'productos' ? 'active' : ''} 
          onClick={() => onSelectTab('productos')}
        >
          Catálogo / Productos
        </a>
        
        {/* Aquí está el botón de Tareas que faltaba */}
        <a 
          style={{ cursor: 'pointer' }}
          className={activeTab === 'tareas' ? 'active' : ''} 
          onClick={() => onSelectTab('tareas')}
        >
          Gestión de Tareas
        </a>

        <a onClick={onLogout} style={{ marginTop: '20px', color: '#ff4757', cursor: 'pointer' }}>
          Cerrar Sesión
        </a>
      </div>
    </div>
  );
};