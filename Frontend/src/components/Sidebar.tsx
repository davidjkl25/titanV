import logoImg from '../assets/logo.png';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  proyecto: { id: number; nombre_proyecto: string } | null;
  onSalirProyecto: () => void;
}

const ITEMS_MODULO = ['colaboradores', 'materiales', 'tareas', 'turnos', 'evidencias'];

export const Sidebar = ({ activeTab, onSelectTab, onLogout, proyecto, onSalirProyecto }: SidebarProps) => {
  const sinProyecto = !proyecto;
  const rolStorage = localStorage.getItem('usuario_rol');
  const rol = Number(rolStorage !== null ? rolStorage : '3');
  const esAdmin = rol === 1;

  const correoUsuario = localStorage.getItem('usuario_correo') || 'usuario@titanv.com';
  const nombreUsuario = localStorage.getItem('usuario_nombre') || 'Usuario';

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
      {/* CABECERA: LOGO + TITAN V */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo-circle">
            <img src={logoImg} alt="Titan V Logo" className="sidebar-logo-img" />
          </div>
          <div className="logo-title">
            TITAN <span>V</span>
          </div>
        </div>

        {/* INDICADOR DE ROL */}
        <div className="sidebar-role-wrapper">
          <div className={`sidebar-role-badge ${esAdmin ? 'role-admin' : 'role-user'}`}>
            <i className={esAdmin ? 'fas fa-shield-alt' : 'fas fa-hard-hat'}></i>
            <span>{esAdmin ? 'Rol: Administrador' : 'Rol: Usuario (Obra)'}</span>
          </div>
        </div>
      </div>

      {/* PROYECTO ACTIVO */}
      {proyecto && (
        <div
          style={{
            margin: '0 0 14px',
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

      {/* MENÚ DE NAVEGACIÓN */}
      <div className="sidebar-menu">
        <a style={{ cursor: 'pointer' }} className={claseItem('inicio')} onClick={() => manejarClick('inicio')}>
          <i className="fas fa-home" style={{ width: '18px' }}></i>
          <span>Inicio</span>
        </a>

        <a style={{ cursor: 'pointer' }} className={claseItem('proyectos')} onClick={() => manejarClick('proyectos')}>
          <i className="fas fa-diagram-project" style={{ width: '18px' }}></i>
          <span>Proyectos de Obra</span>
        </a>

        {esAdmin && (
          <a style={{ cursor: 'pointer' }} className={claseItem('usuarios')} onClick={() => manejarClick('usuarios')}>
            <i className="fas fa-users" style={{ width: '18px' }}></i>
            <span>Gestión Usuarios</span>
          </a>
        )}

        <a style={{ cursor: 'pointer' }} className={claseItem('colaboradores')} onClick={() => manejarClick('colaboradores')}>
          <i className="fas fa-user-group" style={{ width: '18px' }}></i>
          <span>Colaboradores {icono('colaboradores')}</span>
        </a>

        <a style={{ cursor: 'pointer' }} className={claseItem('materiales')} onClick={() => manejarClick('materiales')}>
          <i className="fas fa-boxes-stacked" style={{ width: '18px' }}></i>
          <span>Inventario Insumos {icono('materiales')}</span>
        </a>

        <a style={{ cursor: 'pointer' }} className={claseItem('tareas')} onClick={() => manejarClick('tareas')}>
          <i className="fas fa-tasks" style={{ width: '18px' }}></i>
          <span>Gestión de Tareas {icono('tareas')}</span>
        </a>

        <a style={{ cursor: 'pointer' }} className={claseItem('turnos')} onClick={() => manejarClick('turnos')}>
          <i className="fas fa-clock" style={{ width: '18px' }}></i>
          <span>Turnos y Asistencia {icono('turnos')}</span>
        </a>

        <a style={{ cursor: 'pointer' }} className={claseItem('evidencias')} onClick={() => manejarClick('evidencias')}>
          <i className="fas fa-camera" style={{ width: '18px' }}></i>
          <span>Evidencias de Obra {icono('evidencias')}</span>
        </a>
      </div>

      {/* PIE DEL SIDEBAR: SESIÓN ACTIVA + CERRAR SESIÓN */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="user-icon-circle">
            <i className="fas fa-user-circle"></i>
          </div>
          <div className="user-text-info">
            <span className="user-session-label">Sesión iniciada como:</span>
            <span className="user-session-name" title={nombreUsuario}>{nombreUsuario}</span>
            <span className="user-session-email" title={correoUsuario}>{correoUsuario}</span>
          </div>
        </div>

        <button onClick={onLogout} className="sidebar-logout-btn">
          <i className="fas fa-sign-out-alt"></i>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};