import { useEffect, useState } from 'react';

interface Usuario {
  id: number;
  nombre_completo: string;
  correo_electronico: string;
  rol: number;
  fecha_vencimiento_licencia: string;
  tiene_certificacion_maquinaria: boolean;
  activo: boolean;
}

const API_URL = 'http://127.0.0.1:8000';

const formularioInicial = {
  nombre_completo: '',
  correo_electronico: '',
  rol: 1,
  fecha_vencimiento_licencia: '',
  tiene_certificacion_maquinaria: false,
  contrasena: '',
};

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [mensaje, setMensaje] = useState('');

  const [formulario, setFormulario] = useState(formularioInicial);

  // =========================
  // OBTENER USUARIOS
  // =========================
  const cargarUsuarios = async () => {
    try {
      setCargando(true);

      const respuesta = await fetch(`${API_URL}/usuarios/`);

      if (!respuesta.ok) {
        throw new Error('No se pudieron obtener los usuarios');
      }

      const datos = await respuesta.json();

      setUsuarios(datos);
    } catch (error) {
      console.error(error);
      setMensaje('Error al cargar los usuarios');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // =========================
  // CAMBIAR CAMPOS
  // =========================
  const manejarCambio = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : name === 'rol'
          ? Number(value)
          : value,
    }));
  };

  // =========================
  // NUEVO USUARIO
  // =========================
  const nuevoUsuario = () => {
    setEditandoId(null);
    setFormulario(formularioInicial);
    setMensaje('');
    setMostrarFormulario(true);
  };

  // =========================
  // EDITAR USUARIO
  // =========================
  const editarUsuario = (usuario: Usuario) => {
    setEditandoId(usuario.id);

    setFormulario({
      nombre_completo: usuario.nombre_completo,
      correo_electronico: usuario.correo_electronico,
      rol: usuario.rol,
      fecha_vencimiento_licencia:
        usuario.fecha_vencimiento_licencia,
      tiene_certificacion_maquinaria:
        usuario.tiene_certificacion_maquinaria,
      contrasena: '',
    });

    setMensaje('');
    setMostrarFormulario(true);
  };

  // =========================
  // GUARDAR / ACTUALIZAR
  // =========================
  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();

    setMensaje('');

    if (
      !formulario.nombre_completo ||
      !formulario.correo_electronico ||
      !formulario.fecha_vencimiento_licencia
    ) {
      setMensaje('Completa todos los campos obligatorios.');
      return;
    }

    if (!editandoId && !formulario.contrasena) {
      setMensaje('La contraseña es obligatoria para un usuario nuevo.');
      return;
    }

    try {
      setGuardando(true);

      const datosEnviar: any = {
        nombre_completo: formulario.nombre_completo,
        correo_electronico: formulario.correo_electronico,
        rol: formulario.rol,
        fecha_vencimiento_licencia:
          formulario.fecha_vencimiento_licencia,
        tiene_certificacion_maquinaria:
          formulario.tiene_certificacion_maquinaria,
      };

      // La contraseña se manda solamente cuando se escribe.
      if (formulario.contrasena) {
        datosEnviar.contrasena = formulario.contrasena;
      }

      const url = editandoId
        ? `${API_URL}/usuarios/${editandoId}`
        : `${API_URL}/usuarios/`;

      const respuesta = await fetch(url, {
        method: editandoId ? 'PUT' : 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosEnviar),
      });

      const texto = await respuesta.text();

      let datos: any = null;

      try {
        datos = texto ? JSON.parse(texto) : null;
      } catch {
        datos = null;
      }

      console.log('Respuesta:', datos);

      if (!respuesta.ok) {
        let mensajeError = 'No se pudo guardar el usuario.';

        if (datos?.detail) {
          if (Array.isArray(datos.detail)) {
            mensajeError = datos.detail
              .map((error: any) => error.msg || JSON.stringify(error))
              .join(', ');
          } else {
            mensajeError = String(datos.detail);
          }
        }

        throw new Error(mensajeError);
      }

      setMensaje(
        editandoId
          ? 'Usuario actualizado correctamente.'
          : 'Usuario creado correctamente.'
      );

      setFormulario(formularioInicial);
      setEditandoId(null);

      await cargarUsuarios();

      setMostrarFormulario(false);
    } catch (error) {
      console.error('Error:', error);

      if (error instanceof Error) {
        setMensaje(error.message);
      } else {
        setMensaje('Ocurrió un error al guardar el usuario.');
      }
    } finally {
      setGuardando(false);
    }
  };

  // =========================
  // ELIMINAR USUARIO
  // =========================
  const eliminarUsuario = async (id: number) => {
    const confirmar = window.confirm(
      '¿Estás segura de que quieres eliminar este usuario?'
    );

    if (!confirmar) {
      return;
    }

    try {
      setMensaje('');

      const respuesta = await fetch(
        `${API_URL}/usuarios/${id}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!respuesta.ok) {
        const texto = await respuesta.text();

        let datos: any = null;

        try {
          datos = texto ? JSON.parse(texto) : null;
        } catch {
          datos = null;
        }

        let mensajeError = 'No se pudo eliminar el usuario.';

        if (datos?.detail) {
          if (Array.isArray(datos.detail)) {
            mensajeError = datos.detail
              .map((error: any) => error.msg || JSON.stringify(error))
              .join(', ');
          } else {
            mensajeError = String(datos.detail);
          }
        }

        throw new Error(mensajeError);
      }

      setMensaje('Usuario eliminado correctamente.');

      await cargarUsuarios();
    } catch (error) {
      console.error('Error eliminando usuario:', error);

      if (error instanceof Error) {
        setMensaje(error.message);
      } else {
        setMensaje('Ocurrió un error al eliminar el usuario.');
      }
    }
  };

  // =========================
  // CANCELAR
  // =========================
  const cancelarFormulario = () => {
    setMostrarFormulario(false);
    setEditandoId(null);
    setFormulario(formularioInicial);
    setMensaje('');
  };

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* ENCABEZADO */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '15px',
        }}
      >
        <div>
          <h2 style={{ color: '#0f172a', margin: 0 }}>
            Gestión de Usuarios
          </h2>

          <p style={{ color: '#475569', marginBottom: 0 }}>
            Administra los usuarios registrados en el sistema Titan V.
          </p>
        </div>

        <button
          onClick={nuevoUsuario}
          style={botonNuevo}
        >
          + Nuevo usuario
        </button>
      </div>

      {/* MENSAJE */}
      {mensaje && (
        <div
          style={{
            padding: '12px',
            marginBottom: '20px',
            borderRadius: '6px',
            backgroundColor: mensaje.includes('correctamente')
              ? '#dcfce7'
              : '#fee2e2',
            color: mensaje.includes('correctamente')
              ? '#166534'
              : '#991b1b',
            fontWeight: 'bold',
          }}
        >
          {mensaje}
        </div>
      )}

      {/* FORMULARIO */}
      {mostrarFormulario && (
        <div
          style={{
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <h3 style={{ color: '#0f172a', marginTop: 0 }}>
            {editandoId
              ? 'Editar usuario'
              : 'Registrar nuevo usuario'}
          </h3>

          <form onSubmit={guardarUsuario}>
            <div style={gridFormulario}>

              <div>
                <label>Nombre completo</label>

                <input
                  type="text"
                  name="nombre_completo"
                  value={formulario.nombre_completo}
                  onChange={manejarCambio}
                  style={estiloInput}
                  required
                />
              </div>

              <div>
                <label>Correo electrónico</label>

                <input
                  type="email"
                  name="correo_electronico"
                  value={formulario.correo_electronico}
                  onChange={manejarCambio}
                  style={estiloInput}
                  required
                />
              </div>

              <div>
                <label>Rol</label>

                <select
                  name="rol"
                  value={formulario.rol}
                  onChange={manejarCambio}
                  style={estiloInput}
                >
                  <option value={1}>Administrador</option>
                  <option value={2}>Operario de Obra</option>
                  <option value={3}>Supervisor</option>
                </select>
              </div>

              <div>
                <label>Fecha vencimiento licencia</label>

                <input
                  type="date"
                  name="fecha_vencimiento_licencia"
                  value={
                    formulario.fecha_vencimiento_licencia
                  }
                  onChange={manejarCambio}
                  style={estiloInput}
                  required
                />
              </div>

              <div>
                <label>
                  {editandoId
                    ? 'Nueva contraseña (opcional)'
                    : 'Contraseña'}
                </label>

                <input
                  type="password"
                  name="contrasena"
                  value={formulario.contrasena}
                  onChange={manejarCambio}
                  style={estiloInput}
                  required={!editandoId}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '25px',
                }}
              >
                <input
                  type="checkbox"
                  name="tiene_certificacion_maquinaria"
                  checked={
                    formulario.tiene_certificacion_maquinaria
                  }
                  onChange={manejarCambio}
                />

                <label>
                  Tiene certificación de maquinaria
                </label>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              <button
                type="submit"
                disabled={guardando}
                style={{
                  ...botonGuardar,
                  opacity: guardando ? 0.6 : 1,
                }}
              >
                {guardando
                  ? 'Guardando...'
                  : editandoId
                  ? 'Actualizar usuario'
                  : 'Guardar usuario'}
              </button>

              <button
                type="button"
                onClick={cancelarFormulario}
                style={botonCancelar}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLA */}
      <h3
        style={{
          color: '#0f172a',
          marginBottom: '15px',
        }}
      >
        Usuarios registrados
      </h3>

      {cargando ? (
        <p>Cargando usuarios...</p>
      ) : usuarios.length === 0 ? (
        <p>No hay usuarios registrados.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#1e293b',
                }}
              >
                <th style={estiloTh}>ID</th>
                <th style={estiloTh}>Nombre</th>
                <th style={estiloTh}>Correo</th>
                <th style={estiloTh}>Rol</th>
                <th style={estiloTh}>Licencia</th>
                <th style={estiloTh}>Certificación</th>
                <th style={estiloTh}>Estado</th>
                <th style={estiloTh}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>

                  <td style={estiloTd}>
                    {usuario.id}
                  </td>

                  <td style={estiloTd}>
                    {usuario.nombre_completo}
                  </td>

                  <td style={estiloTd}>
                    {usuario.correo_electronico}
                  </td>

                  <td style={estiloTd}>
                    {usuario.rol === 1
                      ? 'Administrador'
                      : usuario.rol === 2
                      ? 'Operario de Obra'
                      : usuario.rol === 3
                      ? 'Supervisor'
                      : `Rol ${usuario.rol}`}
                  </td>

                  <td style={estiloTd}>
                    {usuario.fecha_vencimiento_licencia}
                  </td>

                  <td style={estiloTd}>
                    {usuario.tiene_certificacion_maquinaria
                      ? 'Sí'
                      : 'No'}
                  </td>

                  <td
                    style={{
                      ...estiloTd,
                      color: usuario.activo
                        ? '#16a34a'
                        : '#dc2626',
                      fontWeight: 'bold',
                    }}
                  >
                    {usuario.activo
                      ? 'Activo'
                      : 'Inactivo'}
                  </td>

                  <td style={estiloTd}>
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                      }}
                    >
                      <button
                        onClick={() =>
                          editarUsuario(usuario)
                        }
                        style={botonEditar}
                      >
                        Editar
                      </button>

                      <button
                        onClick={() =>
                          eliminarUsuario(usuario.id)
                        }
                        style={botonEliminar}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// =========================
// ESTILOS
// =========================

const gridFormulario: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '15px',
};

const estiloInput: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  marginTop: '6px',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  boxSizing: 'border-box',
};

const estiloTh: React.CSSProperties = {
  padding: '12px',
  borderBottom: '1px solid #cbd5e1',
};

const estiloTd: React.CSSProperties = {
  padding: '12px',
  borderBottom: '1px solid #f1f5f9',
};

const botonNuevo: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '11px 18px',
  cursor: 'pointer',
  fontWeight: 'bold',
};

const botonGuardar: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#16a34a',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
};

const botonCancelar: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#e2e8f0',
  color: '#334155',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

const botonEditar: React.CSSProperties = {
  padding: '7px 12px',
  backgroundColor: '#f59e0b',
  color: '#ffffff',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: 'bold',
};

const botonEliminar: React.CSSProperties = {
  padding: '7px 12px',
  backgroundColor: '#dc2626',
  color: '#ffffff',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: 'bold',
};

export default Usuarios;