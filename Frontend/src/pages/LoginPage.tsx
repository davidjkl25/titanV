import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Login } from '../components/Login';
import { VentanaGoogleLogin } from '../components/VentanaGoogleLogin';
import { API_URL } from '../api';
import { guardarSesion, haySesion } from '../auth';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [modalGoogleAbierto, setModalGoogleAbierto] = useState(false);

  const finalizarLoginExitoso = useCallback(() => {
    onLoginSuccess();
    navigate('/dashboard');
  }, [onLoginSuccess, navigate]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        finalizarLoginExitoso();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'titanv_auth_sync' && haySesion()) {
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

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      setModalGoogleAbierto(true);
      return;
    }

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        if (haySesion()) {
          finalizarLoginExitoso();
        }
      }
    }, 500);
  };

  const handleLoginGoogleModal = async (email: string, name: string) => {
    try {
      const respuesta = await axios.post(`${API_URL}/auth/google`, {
        credential: `google_login:${email.trim()}:${name.trim()}`,
      });
      guardarSesion(respuesta.data);
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
      const respuesta = await axios.post(`${API_URL}/auth/login`, {
        correo_electronico: correo.trim(),
        contrasena,
      });
      guardarSesion(respuesta.data);
      finalizarLoginExitoso();
    } catch (error: any) {
      const detalle = error.response?.data?.detail || 'Credenciales inválidas o el servidor no responde.';
      alert(detalle);
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
