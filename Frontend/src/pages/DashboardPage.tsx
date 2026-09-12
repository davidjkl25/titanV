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

export interface ProyectoResumen {
  id: number;
  nombre_proyecto: string;
  ubicacion_direccion?: string;
  estado?: string;
  fecha_inicio?: string;
  fecha_fin_estimada?: string;
  mi_rol?: 'Arquitecto' | 'Trabajador' | 'Visualizador';
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

  const actualizarEstadoProyecto = async (proyectoId: number, estado: string) => {
    const respuesta = await fetchConToken(`/proyectos/${proyectoId}`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    });
    if (!respuesta.ok) {
      const data = await respuesta.json().catch(() => null);
      alert(data?.detail || 'No se pudo cambiar el estado del proyecto.');
      return;
    }
    setProyectos((prev) =>
      prev.map((p) => (p.id === proyectoId ? { ...p, estado } : p))
    );
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f6f9' }}>
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
            onActualizarEstado={actualizarEstadoProyecto}
          />
        )}
        {/* Proyectos siempre queda accesible: es la única forma de crear proyectos */}
        {tabActual === 'proyectos' && <ProyectosTab onProyectoCreado={verificarProyectos} />}

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