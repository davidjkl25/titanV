import { useState, useEffect } from 'react';

interface Material {
  id: number;
  nombre_material: string;
  unidad_medida: string;
  cantidad_disponible: number;
}

const API_URL = 'http://localhost:8000';

export const MaterialesTab = () => {
  // ==========================================
  // INVENTARIO
  // ==========================================

  const [proyectoId] = useState<number>(1);
  const [usuarioId] = useState<number>(1);

  const [inventario, setInventario] = useState<Material[]>([]);
  const [cargando, setCargando] = useState(true);

  // ==========================================
  // FORMULARIO DE MATERIAL
  // ==========================================

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nombreMaterial, setNombreMaterial] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('');

  const [guardando, setGuardando] = useState(false);

  // ==========================================
  // MENSAJES
  // ==========================================

  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // ==========================================
  // MOVIMIENTOS
  // ==========================================

  const [materialId, setMaterialId] = useState<number>(0);
  const [tipoMovimiento, setTipoMovimiento] =
    useState<string>('Salida');

  const [cantidad, setCantidad] = useState<string>('');

  // ==========================================
  // CARGAR MATERIALES
  // ==========================================

  const cargarMateriales = async () => {
    try {
      setCargando(true);

      const response = await fetch(`${API_URL}/materiales/`);

      if (!response.ok) {
        throw new Error('No se pudieron obtener los materiales');
      }

      const data = await response.json();

      const materiales: Material[] = data.map((item: any) => ({
        id: item.id,
        nombre_material: item.nombre_material,
        unidad_medida: item.unidad_medida,
        cantidad_disponible: item.cantidad_disponible ?? 0,
      }));

      setInventario(materiales);

      if (materiales.length > 0) {
        setMaterialId(materiales[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Error al cargar los materiales');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMateriales();
  }, []);

  // ==========================================
  // LIMPIAR FORMULARIO
  // ==========================================

  const limpiarFormulario = () => {
    setNombreMaterial('');
    setUnidadMedida('');
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  // ==========================================
  // NUEVO MATERIAL
  // ==========================================

  const nuevoMaterial = () => {
    setNombreMaterial('');
    setUnidadMedida('');
    setEditandoId(null);

    setError(null);
    setExito(null);

    setMostrarFormulario(true);
  };

  // ==========================================
  // EDITAR MATERIAL
  // ==========================================

  const editarMaterial = (material: Material) => {
    setNombreMaterial(material.nombre_material);
    setUnidadMedida(material.unidad_medida);

    setEditandoId(material.id);

    setError(null);
    setExito(null);

    setMostrarFormulario(true);
  };

  // ==========================================
  // GUARDAR / ACTUALIZAR MATERIAL
  // ==========================================

  const guardarMaterial = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError(null);
    setExito(null);

    if (!nombreMaterial.trim() || !unidadMedida.trim()) {
      setError('Completa todos los campos.');
      return;
    }

    try {
      setGuardando(true);

      let response;

      // ========================================
      // CREAR
      // ========================================

      if (editandoId === null) {
        response = await fetch(`${API_URL}/materiales/`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre_material: nombreMaterial,
            unidad_medida: unidadMedida,
          }),
        });
      }

      // ========================================
      // ACTUALIZAR
      // ========================================

      else {
        response = await fetch(
          `${API_URL}/materiales/${editandoId}`,
          {
            method: 'PUT',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nombre_material: nombreMaterial,
              unidad_medida: unidadMedida,
            }),
          }
        );
      }

      const textoRespuesta = await response.text();

      let datos: any = {};

      if (textoRespuesta) {
        try {
          datos = JSON.parse(textoRespuesta);
        } catch {
          datos = {};
        }
      }

      console.log('Respuesta materiales:', datos);

      if (!response.ok) {
        let mensaje = 'No se pudo guardar el material';

        if (datos.detail) {
          if (typeof datos.detail === 'string') {
            mensaje = datos.detail;
          } else {
            mensaje = JSON.stringify(datos.detail);
          }
        }

        throw new Error(mensaje);
      }

      if (editandoId === null) {
        setExito('Material creado correctamente.');
      } else {
        setExito('Material actualizado correctamente.');
      }

      limpiarFormulario();

      await cargarMateriales();

    } catch (err) {
      console.error('Error guardando material:', err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo guardar el material.');
      }
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINAR MATERIAL
  // ==========================================

  const eliminarMaterial = async (id: number) => {
    const confirmar = window.confirm(
      '¿Estás seguro de que deseas eliminar este material?'
    );

    if (!confirmar) {
      return;
    }

    setError(null);
    setExito(null);

    try {
      const response = await fetch(
        `${API_URL}/materiales/${id}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        const texto = await response.text();

        let datos: any = {};

        try {
          datos = JSON.parse(texto);
        } catch {
          datos = {};
        }

        let mensaje = 'No se pudo eliminar el material';

        if (datos.detail) {
          if (typeof datos.detail === 'string') {
            mensaje = datos.detail;
          } else {
            mensaje = JSON.stringify(datos.detail);
          }
        }

        throw new Error(mensaje);
      }

      setExito('Material eliminado correctamente.');

      await cargarMateriales();

    } catch (err) {
      console.error('Error eliminando material:', err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo eliminar el material.');
      }
    }
  };

  // ==========================================
  // REGISTRAR MOVIMIENTO
  // ==========================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!materialId || !cantidad) {
      setError('Selecciona un material e ingresa una cantidad.');
      return;
    }

    setError(null);
    setExito(null);

    try {
      const response = await fetch(
        `${API_URL}/movimientos/?usuario_id=${usuarioId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            proyecto_id: proyectoId,
            material_id: Number(materialId),
            tipo_movimiento: tipoMovimiento,
            cantidad: Number(cantidad),
          }),
        }
      );

      const texto = await response.text();

      let data: any = {};

      try {
        data = texto ? JSON.parse(texto) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        let mensaje = 'Error al procesar el movimiento';

        if (data.detail) {
          mensaje =
            typeof data.detail === 'string'
              ? data.detail
              : JSON.stringify(data.detail);
        }

        throw new Error(mensaje);
      }

      setExito(
        '¡Movimiento registrado correctamente!'
      );

      setCantidad('');

      await cargarMateriales();

    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al registrar el movimiento');
      }
    }
  };

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="tab-content active">

      {/* ======================================
          ENCABEZADO
      ====================================== */}

      <div
        className="section-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <h2>
          <i className="fas fa-boxes-stacked"></i>{' '}
          Gestión de Materiales
        </h2>

        <button
          onClick={nuevoMaterial}
          style={{
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 18px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          + Nuevo material
        </button>
      </div>

      {/* ======================================
          MENSAJE ERROR
      ====================================== */}

      {error && (
        <div
          style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px 20px',
            borderRadius: '6px',
            marginBottom: '20px',
            border: '1px solid #f5c6cb',
          }}
        >
          <strong>Error: </strong>
          {error}
        </div>
      )}

      {/* ======================================
          MENSAJE ÉXITO
      ====================================== */}

      {exito && (
        <div
          style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '12px 20px',
            borderRadius: '6px',
            marginBottom: '20px',
            border: '1px solid #c3e6cb',
          }}
        >
          {exito}
        </div>
      )}

      {/* ======================================
          FORMULARIO MATERIAL
      ====================================== */}

      {mostrarFormulario && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: 0 }}>
              {editandoId === null
                ? 'Registrar nuevo material'
                : 'Editar material'}
            </h3>

            <button
              type="button"
              onClick={limpiarFormulario}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '22px',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={guardarMaterial}>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '15px',
              }}
            >

              {/* NOMBRE */}

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 'bold',
                  }}
                >
                  Nombre del material
                </label>

                <input
                  type="text"
                  value={nombreMaterial}
                  onChange={(e) =>
                    setNombreMaterial(e.target.value)
                  }
                  placeholder="Ej: Cemento Gris ARGOS"
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* UNIDAD */}

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 'bold',
                  }}
                >
                  Unidad de medida
                </label>

                <input
                  type="text"
                  value={unidadMedida}
                  onChange={(e) =>
                    setUnidadMedida(e.target.value)
                  }
                  placeholder="Ej: Bultos"
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                  }}
                />
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
                  backgroundColor: guardando
                    ? '#94a3b8'
                    : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  cursor: guardando
                    ? 'not-allowed'
                    : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {guardando
                  ? 'Guardando...'
                  : editandoId === null
                  ? 'Guardar material'
                  : 'Actualizar material'}
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#334155',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

            </div>
          </form>
        </div>
      )}

      {/* ======================================
          MOVIMIENTOS
      ====================================== */}

      <div
        className="card"
        style={{ marginBottom: '20px' }}
      >
        <div className="card-header">
          <h3>
            <i className="fas fa-plus"></i>{' '}
            Registrar Movimiento de Material
          </h3>
        </div>

        <form
          onSubmit={handleSubmit}
          className="form-horizontal"
          style={{
            padding: '20px',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >

          <select
            value={materialId}
            onChange={(e) =>
              setMaterialId(Number(e.target.value))
            }
            required
            style={{
              padding: '8px',
              borderRadius: '4px',
              minWidth: '200px',
            }}
          >
            {inventario.length === 0 ? (
              <option value="">
                No hay materiales
              </option>
            ) : (
              inventario.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.nombre_material}
                </option>
              ))
            )}
          </select>

          <select
            value={tipoMovimiento}
            onChange={(e) =>
              setTipoMovimiento(e.target.value)
            }
            style={{
              padding: '8px',
              borderRadius: '4px',
            }}
          >
            <option value="Salida">
              Salida (-)
            </option>

            <option value="Entrada">
              Entrada (+)
            </option>
          </select>

          <input
            type="number"
            min="1"
            value={cantidad}
            onChange={(e) =>
              setCantidad(e.target.value)
            }
            placeholder="Cantidad"
            required
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
            }}
          />

          <button
            type="submit"
            className="btn-save"
            style={{ marginTop: 0 }}
          >
            Registrar Movimiento
          </button>

        </form>
      </div>

      {/* ======================================
          TABLA
      ====================================== */}

      <div className="card table-card">

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '15px',
          }}
        >
          <h3 style={{ margin: 0 }}>
            Materiales registrados
          </h3>

          <button
            onClick={cargarMateriales}
            style={{
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '5px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
          >
            ↻ Actualizar
          </button>
        </div>

        {cargando ? (
          <p style={{ padding: '20px' }}>
            Cargando materiales...
          </p>
        ) : inventario.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              color: '#999',
              padding: '30px',
            }}
          >
            No hay materiales registrados.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Material</th>
                  <th>Stock Disponible</th>
                  <th>Unidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>

                {inventario.map((material) => (
                  <tr key={material.id}>

                    <td>
                      {material.id}
                    </td>

                    <td>
                      {material.nombre_material}
                    </td>

                    <td>
                      <strong>
                        {material.cantidad_disponible}
                      </strong>
                    </td>

                    <td>
                      {material.unidad_medida}
                    </td>

                    <td>

                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                        }}
                      >

                        {/* EDITAR */}

                        <button
                          onClick={() =>
                            editarMaterial(material)
                          }
                          style={{
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '7px 12px',
                            cursor: 'pointer',
                          }}
                        >
                          Editar
                        </button>

                        {/* ELIMINAR */}

                        <button
                          onClick={() =>
                            eliminarMaterial(material.id)
                          }
                          style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            padding: '7px 12px',
                            cursor: 'pointer',
                          }}
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

    </div>
  );
};

export default MaterialesTab;