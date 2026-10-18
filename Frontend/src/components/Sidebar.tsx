interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
<<<<<<< HEAD
  bloqueado?: boolean;
}

const ITEMS_LIBRES = ['inicio', 'proyectos'];

export const Sidebar = ({ activeTab, onSelectTab, onLogout, bloqueado = false }: SidebarProps) => {
  const manejarClick = (tab: string) => {
    if (bloqueado && !ITEMS_LIBRES.includes(tab)) {
      alert('Primero crea tu primer proyecto en "Proyectos de Obra" para desbloquear esta sección.');
=======
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
>>>>>>> test
      return;
    }
    onSelectTab(tab);
  };
<<<<<<< HEAD

  const claseItem = (tab: string) => {
    let clase = activeTab === tab ? 'active' : '';
    if (bloqueado && !ITEMS_LIBRES.includes(tab)) clase += ' bloqueado';
=======
  

  const claseItem = (tab: string) => {
    let clase = activeTab === tab ? 'active' : '';
    if (sinProyecto && ITEMS_MODULO.includes(tab)) clase += ' bloqueado';
>>>>>>> test
    return clase.trim();
  };

  const icono = (tab: string) =>
<<<<<<< HEAD
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
        <a style={{ cursor: 'pointer' }} className={claseItem('tareas')} onClick={() => manejarClick('tareas')}>
          Gestión de Tareas {icono('tareas')}
        </a>
        <a style={{ cursor: 'pointer' }} className={claseItem('turnos')} onClick={() => manejarClick('turnos')}>
          Turnos y Asistencia {icono('turnos')}
        </a>
        <a style={{ cursor: 'pointer' }} className={claseItem('evidencias')} onClick={() => manejarClick('evidencias')}>
          Evidencias {icono('evidencias')}
        </a>

        <a onClick={onLogout} style={{ marginTop: '20px', color: '#ff4757', cursor: 'pointer' }}>
          Cerrar Sesión
        </a>
=======
    sinProyecto && ITEMS_MODULO.includes(tab) ? (
      <i className="fas fa-lock" style={{ fontSize: '11px', marginLeft: '6px' }}></i>
    ) : null;

  const nombreUsuario = localStorage.getItem('usuario_nombre') || 'Usuario';
  const correoUsuario = localStorage.getItem('usuario_correo') || '';

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo-circle">
            <img src={logoImg} alt="Logo de Titan V" className="sidebar-logo-img" />
          </div>
          <div className="logo-title">TITAN <span>V</span></div>
        </div>
        <p className="sidebar-caption">Control de obra</p>
      </div>

      {proyecto && (
        <div
          className="sidebar-project-card"
        >
          <div className="sidebar-project-label">
            Proyecto activo
          </div>
          <div className="sidebar-project-name">
            <i className="fas fa-diagram-project" style={{ marginRight: '6px' }}></i>
            {proyecto.nombre_proyecto}
          </div>
          <button
            onClick={onSalirProyecto}
            className="sidebar-change-project"
          >
            Cambiar de proyecto
          </button>
        </div>
      )}

      <div className="sidebar-menu">
        <a className={claseItem('inicio')} onClick={() => manejarClick('inicio')}>
          <i className="fas fa-house"></i><span>Inicio</span>
        </a>
        <a className={claseItem('proyectos')} onClick={() => manejarClick('proyectos')}>
          <i className="fas fa-diagram-project"></i><span>Proyectos de Obra</span>
        </a>
        {puedeVer('colaboradores') && <a className={claseItem('colaboradores')} onClick={() => manejarClick('colaboradores')}>
          <i className="fas fa-user-group"></i><span>Colaboradores {icono('colaboradores')}</span>
        </a>}
        {puedeVer('materiales') && <a className={claseItem('materiales')} onClick={() => manejarClick('materiales')}>
          <i className="fas fa-boxes-stacked"></i><span>Materiales {icono('materiales')}</span>
        </a>}
        {puedeVer('inventario') && <a className={claseItem('inventario')} onClick={() => manejarClick('inventario')}>
          <i className="fas fa-warehouse"></i><span>Inventario Insumos {icono('inventario')}</span>
        </a>}
        {puedeVer('tareas') && <a className={claseItem('tareas')} onClick={() => manejarClick('tareas')}>
          <i className="fas fa-list-check"></i><span>Gestión de Tareas {icono('tareas')}</span>
        </a>}
        {puedeVer('turnos') && <a className={claseItem('turnos')} onClick={() => manejarClick('turnos')}>
          <i className="fas fa-clock"></i><span>Turnos y Asistencia {icono('turnos')}</span>
        </a>}
        {puedeVer('evidencias') && <a className={claseItem('evidencias')} onClick={() => manejarClick('evidencias')}>
          <i className="fas fa-camera"></i><span>Evidencias {icono('evidencias')}</span>
        </a>}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <i className="fas fa-user-circle user-icon-circle"></i>
          <div className="user-text-info">
            <span className="user-session-label">Sesión iniciada como</span>
            <span className="user-session-name" title={nombreUsuario}>{nombreUsuario}</span>
            {correoUsuario && <span className="user-session-email" title={correoUsuario}>{correoUsuario}</span>}
          </div>
        </div>
        <button type="button" onClick={onLogout} className="sidebar-logout-btn">
          <i className="fas fa-arrow-right-from-bracket"></i> Cerrar sesión
        </button>
>>>>>>> test
      </div>
    </div>
  );
};
<<<<<<< HEAD
=======
import logoImg from '../assets/logo.png';
>>>>>>> test
