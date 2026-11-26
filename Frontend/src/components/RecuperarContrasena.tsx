import React, { useState } from 'react';
import { API_URL } from '../api';

interface RecuperarContrasenaProps {
  onClose: () => void;
  tokenInicial?: string;
  emailInicial?: string;
}

const validarFormatoContrasena = (pwd: string): string | null => {
  if (pwd.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Z]/.test(pwd)) return 'La contraseña debe tener al menos una letra mayúscula.';
  if (!/[0-9]/.test(pwd)) return 'La contraseña debe tener al menos un número.';
  return null;
};

const estiloInput: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  borderRadius: '6px',
  border: '1px solid #444',
  backgroundColor: '#1e1e1e',
  color: '#fff',
  boxSizing: 'border-box',
  fontSize: '13px',
};

const estiloBoton: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: '#ffcc00',
  color: '#000',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '12px',
};

const RecuperarContrasena: React.FC<RecuperarContrasenaProps> = ({
  onClose,
  tokenInicial = '',
  emailInicial = '',
}) => {
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(tokenInicial ? 2 : 1);
  const [resetEmail, setResetEmail] = useState(emailInicial);
  const [tokenRecuperacion, setTokenRecuperacion] = useState(tokenInicial);
  const [tokenSesion, setTokenSesion] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setResetStep(1);
    setResetEmail('');
    setTokenRecuperacion('');
    setTokenSesion('');
    setNewPassword('');
    setResetMessage('');
    setIsSubmitting(false);
    onClose();
  };

  const handleSolicitarEnlace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResetMessage('');
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'No se pudo procesar la solicitud.');
      setResetMessage(data.message || 'Si el correo está registrado, recibirás las instrucciones.');
    } catch (error: any) {
      setResetMessage(error.message || 'Error al conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificarToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenRecuperacion.trim() || !resetEmail.trim()) {
      setResetMessage('Ingresa el correo y el token recibidos.');
      return;
    }
    setIsSubmitting(true);
    setResetMessage('');
    try {
      const response = await fetch(`${API_URL}/auth/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim(), token: tokenRecuperacion.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'El enlace no es válido o expiró.');
      setTokenSesion(data.token);
      setResetStep(3);
      setResetMessage(data.message || 'Token verificado. Ingresa tu nueva contraseña.');
    } catch (error: any) {
      setResetMessage(error.message || 'Error al conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorContrasena = validarFormatoContrasena(newPassword);
    if (errorContrasena) {
      setResetMessage(errorContrasena);
      return;
    }
    setIsSubmitting(true);
    setResetMessage('');
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          token: tokenSesion,
          newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'No se pudo actualizar la contraseña.');
      handleClose();
    } catch (error: any) {
      setResetMessage(error.message || 'Error al conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
      <div style={{ backgroundColor: 'rgba(30,30,30,.95)', border: '1px solid #333', borderRadius: '14px', padding: '24px', width: '360px', maxWidth: '90vw', color: '#fff' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>Restablecer contraseña</h3>

        {resetStep === 1 && (
          <form onSubmit={handleSolicitarEnlace}>
            <p style={{ fontSize: '12px', color: '#aaa' }}>
              Ingresa tu correo para recibir un enlace de recuperación de un solo uso.
            </p>
            <input type="email" required placeholder="correo@ejemplo.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} style={estiloInput} />
            {resetMessage && <p style={{ fontSize: '12px', color: '#ffcc00' }}>{resetMessage}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button type="button" onClick={handleClose} style={{ ...estiloBoton, backgroundColor: '#333', color: '#fff' }}>Cancelar</button>
              <button type="submit" disabled={isSubmitting} style={{ ...estiloBoton, opacity: isSubmitting ? 0.6 : 1 }}>{isSubmitting ? 'Enviando...' : 'Enviar enlace'}</button>
            </div>
          </form>
        )}

        {resetStep === 2 && (
          <form onSubmit={handleVerificarToken}>
            <p style={{ fontSize: '12px', color: '#aaa' }}>Pega el token del correo para continuar.</p>
            <input type="email" required placeholder="Correo" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} style={{ ...estiloInput, marginBottom: '10px' }} />
            <input type="text" required placeholder="Token de recuperación" value={tokenRecuperacion} onChange={(e) => setTokenRecuperacion(e.target.value)} style={estiloInput} />
            {resetMessage && <p style={{ fontSize: '12px', color: '#ffcc00' }}>{resetMessage}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '16px' }}>
              <button type="button" onClick={() => setResetStep(1)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '12px' }}>Cambiar correo</button>
              <button type="submit" disabled={isSubmitting} style={{ ...estiloBoton, opacity: isSubmitting ? 0.6 : 1 }}>{isSubmitting ? 'Verificando...' : 'Verificar token'}</button>
            </div>
          </form>
        )}

        {resetStep === 3 && (
          <form onSubmit={handleResetPassword}>
            <p style={{ fontSize: '12px', color: '#aaa' }}>Ingresa tu nueva contraseña.</p>
            <input type="password" required placeholder="Nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={estiloInput} />
            {resetMessage && <p style={{ fontSize: '12px', color: '#ffcc00' }}>{resetMessage}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button type="button" onClick={handleClose} style={{ ...estiloBoton, backgroundColor: '#333', color: '#fff' }}>Cancelar</button>
              <button type="submit" disabled={isSubmitting} style={{ ...estiloBoton, opacity: isSubmitting ? 0.6 : 1 }}>{isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RecuperarContrasena;
