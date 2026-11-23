interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  proyecto: { id: number; nombre_proyecto: string } | null;
  onSalirProyecto: () => void;
  rolProyecto?: string;
}

const ITEMS_MODULO = ['colaboradores', 'materiales', 'inventario', 'tareas', 'turnos', 'evidencias', 'bitacora'];

export const Sidebar = ({ activeTab, onSelectTab, onLogout, proyecto, onSalirProyecto, rolProyecto }: SidebarProps) => {
  const sinProyecto = !proyecto;
  const puedeVer = (tab: string) => !(tab === 'bitacora' && rolProyecto === 'Trabajador');

  const manejarClick = (tab: string) => {
    if (sinProyecto && ITEMS_MODULO.includes(tab)) {
      alert('Selecciona un proyecto para usar este módulo.');
      return;
    }
    onSelectTab(tab);
  };

  const claseItem = (tab: string) => {
    let clase = activeTab === tab ? 'active' : '';
    if (sinProyecto && ITEMS_MODULO.includes(tab)) clase += ' bloqueado';
    return clase.trim();
  };

  const bloqueado = (tab: string) => sinProyecto && ITEMS_MODULO.includes(tab);

  const icono = (tab: string) =>
    bloqueado(tab) ? (
      <i className="fas fa-lock" aria-hidden="true" style={{ fontSize: '11px', marginLeft: '6px' }}></i>
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
        <a className={claseItem('inicio')} onClick={() => manejarClick('inicio')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); manejarClick('inicio'); } }}>
          <i className="fas fa-house"></i><span>Inicio</span>
        </a>
        <a className={claseItem('proyectos')} onClick={() => manejarClick('proyectos')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); manejarClick('proyectos'); } }}>
          <i className="fas fa-diagram-project"></i><span>Proyectos de Obra</span>
        </a>
        {puedeVer('colaboradores') && <a className={claseItem('colaboradores')} onClick={() => manejarClick('colaboradores')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); manejarClick('colaboradores'); } }} aria-disabled={bloqueado('colaboradores')} title={bloqueado('colaboradores') ? 'Selecciona un proyecto para usar este módulo' : undefined}>
          <i className="fas fa-user-group"></i><span>Colaboradores {icono('colaboradores')}</span>
        </a>}
        {puedeVer('materiales') && <a className={claseItem('materiales')} onClick={() => manejarClick('materiales')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); manejarClick('materiales'); } }} aria-disabled={bloqueado('materiales')} title={bloqueado('materiales') ? 'Selecciona un proyecto para usar este módulo' : undefined}>
          <i className="fas fa-boxes-stacked"></i><span>Materiales {icono('materiales')}</span>
        </a>}
        {puedeVer('inventario') && <a className={claseItem('inventario')} onClick={() => manejarClick('inventario')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); manejarClick('inventario'); } }} aria-disabled={bloqueado('inventario')} title={bloqueado('inventario') ? 'Selecciona un proyecto para usar este módulo' : undefined}>
          <i className="fas fa-warehouse"></i><span>Inventario Insumos {icono('inventario')}</span>
        </a>}
        {puedeVer('tareas') && <a className={claseItem('tareas')} onClick={() => manejarClick('tareas')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); manejarClick('tareas'); } }} aria-disabled={bloqueado('tareas')} title={bloqueado('tareas') ? 'Selecciona un proyecto para usar este módulo' : undefined}>
          <i className="fas fa-list-check"></i><span>Gestión de Tareas {icono('tareas')}</span>
        </a>}
        {puedeVer('turnos') && <a className={claseItem('turnos')} onClick={() => manejarClick('turnos')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); manejarClick('turnos'); } }} aria-disabled={bloqueado('turnos')} title={bloqueado('turnos') ? 'Selecciona un proyecto para usar este módulo' : undefined}>
          <i className="fas fa-clock"></i><span>Turnos y Asistencia {icono('turnos')}</span>
        </a>}
        {puedeVer('evidencias') && <a className={claseItem('evidencias')} onClick={() => manejarClick('evidencias')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); manejarClick('evidencias'); } }} aria-disabled={bloqueado('evidencias')} title={bloqueado('evidencias') ? 'Selecciona un proyecto para usar este módulo' : undefined}>
          <i className="fas fa-camera"></i><span>Evidencias {icono('evidencias')}</span>
        </a>}
        {puedeVer('bitacora') && <a className={claseItem('bitacora')} onClick={() => manejarClick('bitacora')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); manejarClick('bitacora'); } }} aria-disabled={bloqueado('bitacora')} title={bloqueado('bitacora') ? 'Selecciona un proyecto para usar este módulo' : undefined}>
          <i className="fas fa-file-lines"></i><span>Bitácora / Reportes {icono('bitacora')}</span>
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
      </div>
    </div>
  );
};
import logoImg from '../assets/logo.png';
