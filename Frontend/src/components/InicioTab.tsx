import videoHero from '../assets/video_landing.mp4';
import logoImg from '../assets/logo.png';

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
}

const MODULOS = [
  { tab: 'colaboradores', icono: 'fa-user-group', titulo: 'Colaboradores', texto: 'Invita por correo y gestiona los roles del equipo.' },
  { tab: 'materiales', icono: 'fa-boxes-stacked', titulo: 'Inventario Insumos', texto: 'Controla entradas y stock de material.' },
  { tab: 'tareas', icono: 'fa-tasks', titulo: 'Gestión de Tareas', texto: 'Crea tareas, supervisa su estado y gestiona comentarios técnicos.' },
  { tab: 'turnos', icono: 'fa-clock', titulo: 'Turnos y Asistencia', texto: 'Programa turnos y registra la asistencia del equipo.' },
  { tab: 'evidencias', icono: 'fa-camera', titulo: 'Evidencias de Obra', texto: 'Sube fotos y documentos del avance del proyecto.' },
];

const HERO = (
  <div className="panel-hero-banner">
    <video autoPlay loop muted playsInline className="panel-hero-video">
      <source src={videoHero} type="video/mp4" />
      Tu navegador no soporta video.
    </video>
    <div className="panel-hero-overlay"></div>
    <div className="panel-hero-content">
      <span className="panel-hero-badge">
        <i className="fas fa-diagram-project"></i> Control de obra en tiempo real
      </span>
      <h1 className="panel-hero-title">
        Gestión de obra <span className="highlight">Titan V</span>
      </h1>
      <p className="panel-hero-subtitle">
        Administra proyectos, equipos, inventario, tareas, turnos y evidencias de campo
        desde un solo lugar. El cliente contratante consulta el avance; la constructora lo opera.
      </p>
      <div className="panel-hero-tags">
        <span className="hero-tag tag-admin"><i className="fas fa-shield-alt"></i> Arquitecto</span>
        <span className="hero-tag tag-user"><i className="fas fa-hard-hat"></i> Trabajador</span>
        <span className="hero-tag tag-status"><i className="fas fa-eye"></i> Visualizador</span>
      </div>
    </div>
  </div>
);

export const InicioTab = ({
  proyectos,
  cargando,
  proyectoSeleccionado,
  onEntrarProyecto,
  onSalirProyecto,
  onIrA,
  onCrearProyecto,
}: InicioTabProps) => {
  if (cargando) {
    return (
      <div className="tab-content active animated-fadeIn">
        <div className="section-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#141414',
              border: '2px solid #ffd60a',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 0 10px rgba(255, 214, 10, 0.3)',
              flexShrink: 0
            }}>
              <img src={logoImg} alt="Titan V" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
            </div>
            <span>Bienvenido a Titan V</span>
          </h2>
        </div>
        <p style={{ color: '#94a3b8' }}>Cargando información del sistema...</p>
      </div>
    );
  }

  // Dentro de un proyecto: atajos a los módulos del proyecto activo.
  if (proyectoSeleccionado) {
    return (
      <div className="tab-content active animated-fadeIn">
        <div className="section-header">
          <h2><i className="fas fa-diagram-project"></i> {proyectoSeleccionado.nombre_proyecto}</h2>
          <p style={{ color: '#94a3b8' }}>
            {proyectoSeleccionado.ubicacion_direccion || 'Sin ubicación registrada.'}
          </p>
        </div>
        <div className="grid">
          {MODULOS.map((m) => (
            <div key={m.tab} className="card card-interactive" style={{ cursor: 'pointer' }} onClick={() => onIrA(m.tab)}>
              <div className="card-header">
                <h3><span className="card-icon-bubble"><i className={`fas ${m.icono}`}></i></span> {m.titulo}</h3>
              </div>
              <p style={{ padding: '20px 25px', color: '#94a3b8', fontSize: '14px' }}>{m.texto}</p>
              <div className="card-footer-action">
                <span>Entrar al módulo</span>
                <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onSalirProyecto}
          style={{
            marginTop: '20px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '10px 16px',
            fontWeight: 700,
            color: '#cbd5e1',
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
    <div className="tab-content active animated-fadeIn">
      {HERO}

      <div className="section-header">
        <h2><i className="fas fa-house"></i> Bienvenido a Titan V</h2>
        <p style={{ color: '#94a3b8' }}>Entra a un proyecto para trabajar en sus módulos, o crea uno nuevo.</p>
      </div>

      <div className="grid">
        <div
          className="card card-interactive"
          style={{ cursor: 'pointer', border: '2px dashed rgba(255,214,10,0.5)', textAlign: 'center' }}
          onClick={onCrearProyecto}
        >
          <div className="card-header" style={{ justifyContent: 'center' }}>
            <h3><i className="fas fa-plus-circle"></i> Crear proyecto</h3>
          </div>
          <p style={{ padding: '20px 25px', color: '#94a3b8', fontSize: '14px' }}>
            Registra una nueva obra para empezar a gestionar su equipo, inventario, tareas y evidencias.
          </p>
        </div>

        {proyectos.length === 0 ? (
          <div className="card">
            <div className="card-header">
              <h3><i className="fas fa-diagram-project"></i> Mis proyectos</h3>
            </div>
            <p className="empty-msg">Todavía no tienes ningún proyecto. Crea el primero para comenzar.</p>
          </div>
        ) : (
          proyectos.map((p) => (
            <div key={p.id} className="card card-interactive" style={{ cursor: 'pointer' }} onClick={() => onEntrarProyecto(p)}>
              <div className="card-header">
                <h3><i className="fas fa-diagram-project"></i> {p.nombre_proyecto}</h3>
              </div>
              <p style={{ padding: '20px 25px', color: '#94a3b8', fontSize: '14px' }}>
                {p.ubicacion_direccion ? p.ubicacion_direccion : 'Sin ubicación registrada.'}
              </p>
              <div className="card-footer-action">
                <span>Entrar al proyecto</span>
                <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};