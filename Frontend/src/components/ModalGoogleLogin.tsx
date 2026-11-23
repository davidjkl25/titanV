import React, { useState } from 'react';

interface ModalGoogleLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (email: string, name: string) => void;
}

const CUENTAS_PREDETERMINADAS = [
  {
    name: 'David Castro',
    email: 'davidcastro060407@gmail.com',
    role: 'Administrador (Rol 1)',
    color: '#1a73e8',
    avatar: 'D',
  },
  {
    name: 'Marcela Sofía',
    email: 'smarcelasofia2709@gmail.com',
    role: 'Supervisor (Rol 2)',
    color: '#0d9488',
    avatar: 'M',
  },
];

export const ModalGoogleLogin: React.FC<ModalGoogleLoginProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
}) => {
  const [usarOtraCuenta, setUsarOtraCuenta] = useState(false);
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCorreo.trim()) {
      alert('Por favor ingresa un correo de Google.');
      return;
    }
    const email = nuevoCorreo.trim();
    const name = nuevoNombre.trim() || email.split('@')[0];
    onSelectAccount(email, name);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          color: '#1f2937',
          width: '100%',
          maxWidth: '430px',
          borderRadius: '16px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          fontFamily: "'Google Sans', Roboto, -apple-system, sans-serif",
          animation: 'titan-fade-in 0.25s ease-out',
        }}
      >
        {/* Cabecera estilo Google */}
        <div style={{ padding: '28px 28px 16px', textAlign: 'center', borderBottom: '1px solid #f1f3f4' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <svg width="34" height="34" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 6px', color: '#202124' }}>
            Elige una cuenta de Google
          </h2>
          <p style={{ fontSize: '13px', color: '#5f6368', margin: 0 }}>
            para acceder a <strong style={{ color: '#202124' }}>Titan V</strong>
          </p>
        </div>

        {/* Lista de cuentas */}
        <div style={{ padding: '8px 0' }}>
          {!usarOtraCuenta ? (
            <>
              {CUENTAS_PREDETERMINADAS.map((cuenta) => (
                <button
                  key={cuenta.email}
                  type="button"
                  onClick={() => onSelectAccount(cuenta.email, cuenta.name)}
                  style={{
                    width: '100%',
                    padding: '14px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: cuenta.color,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {cuenta.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#202124' }}>
                      {cuenta.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#5f6368' }}>{cuenta.email}</div>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '3px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: cuenta.color,
                      }}
                    >
                      {cuenta.role}
                    </span>
                  </div>
                  <i className="fas fa-chevron-right" style={{ color: '#dadce0', fontSize: '12px' }} />
                </button>
              ))}

              <button
                type="button"
                onClick={() => setUsarOtraCuenta(true)}
                style={{
                  width: '100%',
                  padding: '14px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderTop: '1px solid #f1f3f4',
                  marginTop: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#e8eaed',
                    color: '#5f6368',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    flexShrink: 0,
                  }}
                >
                  <i className="fas fa-user-plus" />
                </div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#1a73e8' }}>
                  Usar otra cuenta de Google...
                </div>
              </button>
            </>
          ) : (
            <form onSubmit={handleCustomSubmit} style={{ padding: '16px 28px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3c4043', marginBottom: '6px' }}>
                  Correo electrónico de Google
                </label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@gmail.com"
                  value={nuevoCorreo}
                  onChange={(e) => setNuevoCorreo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #dadce0',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3c4043', marginBottom: '6px' }}>
                  Nombre completo (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Tu Nombre"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #dadce0',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setUsarOtraCuenta(false)}
                  style={{
                    padding: '9px 16px',
                    background: 'none',
                    border: '1px solid #dadce0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#5f6368',
                  }}
                >
                  Volver a la lista
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    backgroundColor: '#1a73e8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  Continuar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Pie con botón de cerrar */}
        <div
          style={{
            padding: '14px 28px',
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #f1f3f4',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '11px', color: '#70757a' }}>
            Acceso seguro con Google
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#5f6368',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
