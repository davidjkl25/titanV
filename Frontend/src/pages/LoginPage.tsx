import { useState } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useGoogleLogin } from '@react-oauth/google';
import { Login } from '../components/Login';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const API_URL = 'http://127.0.0.1:8000';
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const HAY_GOOGLE = GOOGLE_CLIENT_ID.length > 0;

function useAccesoConCorreo(onLoginSuccess: () => void) {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');

  const handleCorreoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCorreo(e.target.value);
    if (errorGeneral) setErrorGeneral('');
  };

  const handleContrasenaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContrasena(e.target.value);
    if (errorGeneral) setErrorGeneral('');
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo || !contrasena) {
      setErrorGeneral('Por favor ingresa tu correo y contraseña.');
      return;
    }
    setCargando(true);
    setErrorGeneral('');
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
      setErrorGeneral(detalle);
    } finally {
      setCargando(false);
    }
  };

  return { correo, contrasena, cargando, errorGeneral, setErrorGeneral, handleCorreoChange, handleContrasenaChange, handleEnviar, navigate };
}

function LoginSinGoogle({ onLoginSuccess }: LoginPageProps) {
  const { correo, contrasena, cargando, errorGeneral, setErrorGeneral, handleCorreoChange, handleContrasenaChange, handleEnviar, navigate } =
    useAccesoConCorreo(onLoginSuccess);

  const avisarGoogleNoConfigurado = () => {
    setErrorGeneral('El inicio de sesión con Google no está configurado. Usa correo y contraseña.');
  };

  return (
    <Login
      correo={correo}
      contrasena={contrasena}
      onCorreoChange={handleCorreoChange}
      onContrasenaChange={handleContrasenaChange}
      onEnviar={handleEnviar}
      onGoogleLogin={avisarGoogleNoConfigurado}
      onVolverPrincipal={() => navigate('/')}
      cargando={cargando}
      errorGeneral={errorGeneral}
    />
  );
}

function LoginConGoogle({ onLoginSuccess }: LoginPageProps) {
  const { correo, contrasena, cargando, errorGeneral, setErrorGeneral, handleCorreoChange, handleContrasenaChange, handleEnviar, navigate } =
    useAccesoConCorreo(onLoginSuccess);

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
        setErrorGeneral(`No se pudo iniciar con Google: ${detalle}`);
      }
    },
    onError: () => {
      setErrorGeneral('No se pudo abrir la ventana de Google. Revisa tu conexión a internet.');
    },
  });

  return (
    <Login
      correo={correo}
      contrasena={contrasena}
      onCorreoChange={handleCorreoChange}
      onContrasenaChange={handleContrasenaChange}
      onEnviar={handleEnviar}
      onGoogleLogin={() => iniciarConGoogle()}
      onVolverPrincipal={() => navigate('/')}
      cargando={cargando}
      errorGeneral={errorGeneral}
    />
  );
}

const LoginPage = (props: LoginPageProps) =>
  HAY_GOOGLE ? <LoginConGoogle {...props} /> : <LoginSinGoogle {...props} />;

export default LoginPage;
