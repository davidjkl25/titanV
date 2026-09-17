import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchConToken } from '../api';
import { Sidebar } from '../components/Sidebar';
import { InicioTab } from '../components/InicioTab';
import { ProyectosTab } from '../components/ProyectosTab';
import { ColaboradoresTab } from '../components/ColaboradoresTab';
import { MaterialesTab } from '../components/MaterialesTab';
import TareasTab from '../components/TareasTab';
import { TurnosTab } from '../components/TurnosTab';
import { EvidenciasTab } from '../components/EvidenciasTab';
import Usuarios from '../components/Usuarios';

import videoFondo from '../assets/video_landing.mp4';

export interface ProyectoResumen {
  id: number;
  nombre_proyecto: string;
  ubicacion_direccion?: string;
  estado?: string;
}

interface DashboardPageProps {
  onLogout: () => void;
}

const MODULOS_PROYECTO = ['colaboradores', 'materiales', 'tareas', 'turnos', 'evidencias'];

const DashboardPage = ({ onLogout }: DashboardPageProps) => {
  const navigate = useNavigate();
  const [tabActual, setTabActual] = useState('inicio');
  const [proyectos, setProyectos] = useState<ProyectoResumen[]>([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<ProyectoResumen | null>(null);
  const [cargandoProyectos, setCargandoProyectos] = useState(true);

  const rolStorage = localStorage.getItem('usuario_rol');
  const esAdmin = Number(rolStorage) === 1;

  const verificarProyectos = async () => {
    try {
      const respuesta = await fetchConToken('/proyectos/');
      const data = respuesta.ok ? await respuesta.json() : [];
      setProyectos(Array.isArray(data) ? data : []);
    } catch {
      setProyectos([]);
    } finally {
      setCargandoProyectos(false);
    }
  };

  useEffect(() => {
    verificarProyectos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    onLogout();
    alert('Sesión cerrada correctamente.');
    navigate('/');
  };

  const entrarProyecto = (proyecto: ProyectoResumen) => {
    setProyectoSeleccionado(proyecto);
    setTabActual('inicio');
  };

  const salirProyecto = () => {
    setProyectoSeleccionado(null);
    setTabActual('inicio');
  };

  const irA = (tab: string) => {
    if (MODULOS_PROYECTO.includes(tab) && !proyectoSeleccionado) {
      alert('Primero entra a un proyecto desde "Inicio" para desbloquear estas secciones.');
      return;
    }
    setTabActual(tab);
  };

  const crearProyecto = () => {
    setTabActual('proyectos');
  };

  return (
    <div className="dashboard-layout">
      {/* Video de construcción de fondo temático */}
      <div className="dashboard-bg-video-wrapper">
        <video autoPlay loop muted playsInline className="dashboard-bg-video">
          <source src={videoFondo} type="video/mp4" />
        </video>
        <div className="dashboard-bg-overlay"></div>
      </div>

      <Sidebar
        activeTab={tabActual}
        onSelectTab={irA}
        onLogout={handleLogout}
        proyecto={proyectoSeleccionado}
        onSalirProyecto={salirProyecto}
      />

      <div className="main-content">
        {tabActual === 'inicio' && (
          <InicioTab
            proyectos={proyectos}
            cargando={cargandoProyectos}
            proyectoSeleccionado={proyectoSeleccionado}
            onEntrarProyecto={entrarProyecto}
            onSalirProyecto={salirProyecto}
            onIrA={irA}
            onCrearProyecto={crearProyecto}
          />
        )}
        {/* Proyectos siempre queda accesible: es la única forma de crear proyectos */}
        {tabActual === 'proyectos' && <ProyectosTab onProyectoCreado={verificarProyectos} />}

        {/* Gestión de usuarios: solo Administrador del sistema */}
        {esAdmin && tabActual === 'usuarios' && <Usuarios />}

        {/* Módulos: solo visibles dentro de un proyecto */}
        {proyectoSeleccionado && tabActual === 'colaboradores' && (
          <ColaboradoresTab proyectoId={proyectoSeleccionado.id} />
        )}
        {proyectoSeleccionado && tabActual === 'materiales' && (
          <MaterialesTab proyectoId={proyectoSeleccionado.id} proyectoNombre={proyectoSeleccionado.nombre_proyecto} />
        )}
        {proyectoSeleccionado && tabActual === 'tareas' && (
          <TareasTab proyectoId={proyectoSeleccionado.id} />
        )}
        {proyectoSeleccionado && tabActual === 'turnos' && (
          <TurnosTab proyectoId={proyectoSeleccionado.id} />
        )}
        {proyectoSeleccionado && tabActual === 'evidencias' && (
          <EvidenciasTab proyectoId={proyectoSeleccionado.id} />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;