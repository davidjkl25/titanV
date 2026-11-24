import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Login } from '../components/Login';
import { VentanaGoogleLogin } from '../components/VentanaGoogleLogin';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000';

const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [modalGoogleAbierto, setModalGoogleAbierto] = useState(false);

  const finalizarLoginExitoso = useCallback(() => {
    onLoginSuccess();
    navigate('/dashboard');
  }, [onLoginSuccess, navigate]);

  // Escuchar cuando la ventana emergente de Google finaliza el inicio de sesión
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        finalizarLoginExitoso();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'titanv_auth_sync' && localStorage.getItem('token')) {
        finalizarLoginExitoso();
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [finalizarLoginExitoso]);

  // Al hacer clic en "Continuar con Google": Despliega la otra ventana emergente de Google
  const handleAbrirVentanaGoogle = () => {
    const width = 480;
    const height = 620;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      '/google-auth',
      'google_auth_window',
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,scrollbars=yes,resizable=yes`
    );

    // Si el navegador bloqueó la ventana emergente, abrir modal de respaldo
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      setModalGoogleAbierto(true);
      return;
    }

    // Monitorear si la ventana emergente se cerró
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        if (localStorage.getItem('token')) {
          finalizarLoginExitoso();
        }
      }
    }, 500);
  };

  // Manejador del modal de respaldo
  const handleLoginGoogleModal = async (email: string, name: string) => {
    try {
      const respuesta = await axios.post(`${API_URL}/api/auth/google`, {
        credential: `google_login:${email.trim()}:${name.trim()}`,
      });

      localStorage.setItem('token', respuesta.data.token);
      localStorage.setItem('usuario_id', String(respuesta.data.usuario_id));
      localStorage.setItem('usuario_nombre', respuesta.data.nombre || name);
      localStorage.setItem('rol', String(respuesta.data.rol));

      setModalGoogleAbierto(false);
      finalizarLoginExitoso();
    } catch (error: any) {
      const detalle =
        error.response?.data?.detail || error.message || 'Error al autenticar con Google.';
      throw new Error(detalle);
    }
  };

  const handleCorreoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCorreo(e.target.value);
  };

  const handleContrasenaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContrasena(e.target.value);
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo || !contrasena) {
      alert('Por favor ingresa tu correo y contraseña.');
      return;
    }
    try {
      const respuesta = await axios.post(`${API_URL}/api/auth/login`, {
        correo_electronico: correo.trim(),
        contrasena: contrasena,
      });
      localStorage.setItem('token', respuesta.data.token);
      localStorage.setItem('usuario_id', String(respuesta.data.usuario_id));
      localStorage.setItem('usuario_nombre', respuesta.data.nombre || 'Usuario');
      localStorage.setItem('rol', String(respuesta.data.rol));
      finalizarLoginExitoso();
    } catch (error: any) {
      const detalle = error.response?.data?.detail || 'Credenciales inválidas o el servidor no responde.';
      alert(`⚠️ ${detalle}`);
    }
  };

  return (
    <>
      <Login
        correo={correo}
        contrasena={contrasena}
        onCorreoChange={handleCorreoChange}
        onContrasenaChange={handleContrasenaChange}
        onEnviar={handleEnviar}
        onGoogleLogin={handleAbrirVentanaGoogle}
        onVolverPrincipal={() => navigate('/')}
      />

      <VentanaGoogleLogin
        isOpen={modalGoogleAbierto}
        onClose={() => setModalGoogleAbierto(false)}
        onLogin={handleLoginGoogleModal}
      />
    </>
  );
};

export default LoginPage;
