import React, { useState } from 'react';
import { fetchConToken } from '../api';

interface CambiarContrasenaProps {
  onClose: () => void;
}

const CambiarContrasena: React.FC<CambiarContrasenaProps> = ({ onClose }) => {
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    if (nuevaContrasena !== confirmacion) {
      setMensaje('La confirmación de la contraseña no coincide.');
      return;
    }
    setEnviando(true);
    try {
      const respuesta = await fetchConToken('/usuarios/me/contrasena', {
        method: 'POST',
        body: JSON.stringify({ contrasena_actual: contrasenaActual, nueva_contrasena: nuevaContrasena }),
      });
      const data = await respuesta.json().catch(() => null);
      if (!respuesta.ok) throw new Error(data?.detail || 'No se pudo actualizar la contraseña.');
      onClose();
    } catch (error: any) {
      setMensaje(error.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
      <div style={{ backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '22px', width: '340px', maxWidth: '90vw', color: '#fff' }}>
        <h3 style={{ marginTop: 0 }}>Cambiar contraseña</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="password" required placeholder="Contraseña actual" value={contrasenaActual} onChange={(e) => setContrasenaActual(e.target.value)} />
          <input type="password" required minLength={8} placeholder="Nueva contraseña" value={nuevaContrasena} onChange={(e) => setNuevaContrasena(e.target.value)} />
          <input type="password" required minLength={8} placeholder="Confirmar nueva contraseña" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
          {mensaje && <p style={{ color: '#ffcc00', fontSize: '12px' }}>{mensaje}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose}>Cancelar</button>
            <button type="submit" disabled={enviando}>{enviando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CambiarContrasena;
