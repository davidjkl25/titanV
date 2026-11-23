import { useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useGoogleLogin } from '@react-oauth/google';
import { Login } from '../components/Login';
import { ModalGoogleLogin } from '../components/ModalGoogleLogin';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000';
const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID?.trim() || '';

interface LoginContentProps {
  correo: string;
  contrasena: string;
  onCorreoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContrasenaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEnviar: (e: React.FormEvent) => void;
  onVolverPrincipal: () => void;
}

// Subcomponente que usa el hook useGoogleLogin SOLO si Google OAuth está configurado en Google Cloud
const LoginPageWithGoogle = ({
  onLoginSuccess,
  ...props
}: LoginContentProps & { onLoginSuccess: () => void }) => {
  const navigate = useNavigate();

  const iniciarConGoogle = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      try {
        const respuesta = await axios.post(`${API_URL}/api/auth/google`, {
          credential: tokenResponse.access_token,
        });

        localStorage.setItem('token', respuesta.data.token);
        localStorage.setItem('usuario_id', String(respuesta.data.usuario_id));
        localStorage.setItem('usuario_nombre', respuesta.data.nombre);
        localStorage.setItem('rol', String(respuesta.data.rol));

        onLoginSuccess();
        navigate('/dashboard');
      } catch (error: any) {
        const detalle = error.response?.data?.detail || error.message || 'Error al autenticar con Google.';
        alert(`⚠️ No se pudo iniciar con Google: ${detalle}`);
      }
    },
    onError: () => {
      alert('⚠️ No se pudo abrir la ventana de Google. Revisa tu conexión a internet.');
    },
  });

  return (
    <Login
      {...props}
      onGoogleLogin={() => iniciarConGoogle()}
    />
  );
};

// Subcomponente interactivo que abre el selector de cuentas de Google (ideal para presentaciones y pruebas)
const LoginPageFallback = ({
  onLoginSuccess,
  ...props
}: LoginContentProps & { onLoginSuccess: () => void }) => {
  const [modalGoogleAbierto, setModalGoogleAbierto] = useState(false);
  const navigate = useNavigate();

  const handleSeleccionarCuentaGoogle = async (email: string, name: string) => {
    try {
      const respuesta = await axios.post(`${API_URL}/api/auth/google`, {
        credential: `demo_google:${email}:${name}`,
      });

      localStorage.setItem('token', respuesta.data.token);
      localStorage.setItem('usuario_id', String(respuesta.data.usuario_id));
      localStorage.setItem('usuario_nombre', respuesta.data.nombre);
      localStorage.setItem('rol', String(respuesta.data.rol));

      setModalGoogleAbierto(false);
      onLoginSuccess();
      navigate('/dashboard');
    } catch (error: any) {
      const detalle = error.response?.data?.detail || error.message || 'Error al autenticar con Google.';
      alert(`⚠️ No se pudo iniciar con Google: ${detalle}`);
    }
  };

  return (
    <>
      <Login
        {...props}
        onGoogleLogin={() => setModalGoogleAbierto(true)}
      />
      <ModalGoogleLogin
        isOpen={modalGoogleAbierto}
        onClose={() => setModalGoogleAbierto(false)}
        onSelectAccount={handleSeleccionarCuentaGoogle}
      />
    </>
  );
};

const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');

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
      onLoginSuccess();
      navigate('/dashboard');
    } catch (error: any) {
      const detalle = error.response?.data?.detail || 'Credenciales inválidas o el servidor no responde.';
      alert(`⚠️ ${detalle}`);
    }
  };

  const commonProps: LoginContentProps = {
    correo,
    contrasena,
    onCorreoChange: handleCorreoChange,
    onContrasenaChange: handleContrasenaChange,
    onEnviar: handleEnviar,
    onVolverPrincipal: () => navigate('/'),
  };

  if (GOOGLE_CLIENT_ID) {
    return <LoginPageWithGoogle onLoginSuccess={onLoginSuccess} {...commonProps} />;
  }

  return <LoginPageFallback onLoginSuccess={onLoginSuccess} {...commonProps} />;
};

export default LoginPage;
