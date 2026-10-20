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

// El botón de Google solo se habilita si hay un Client ID configurado.
// Sin él, `initTokenClient` lanza "Missing required parameter client_id"
// y React desmonta la página entera (queda solo el fondo negro).
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const HAY_GOOGLE = GOOGLE_CLIENT_ID.length > 0;

/** Lógica de acceso con correo y contraseña (compartida por ambas variantes). */
function useAccesoConCorreo(onLoginSuccess: () => void) {
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

  return { correo, contrasena, handleCorreoChange, handleContrasenaChange, handleEnviar, navigate };
}

// ── Variante SIN Google OAuth configurado ──
// El botón de Google sigue visible: al pulsarlo explica que falta el
// Client ID, en vez de dejar la página en negro.
function LoginSinGoogle({ onLoginSuccess }: LoginPageProps) {
  const { correo, contrasena, handleCorreoChange, handleContrasenaChange, handleEnviar, navigate } =
    useAccesoConCorreo(onLoginSuccess);

  const avisarGoogleNoConfigurado = () => {
    alert(
      '⚠️ El inicio de sesión con Google no está configurado en este equipo.\n\n' +
      'Falta el Client ID de Google Cloud. Agrégalo en Frontend/.env:\n\n' +
      '  VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com\n\n' +
      'y reinicia el servidor de Vite (npm run dev).\n\n' +
      'Mientras tanto, usa el acceso con correo y contraseña.'
    );
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
    />
  );
}

// ── Variante CON Google OAuth ──
function LoginConGoogle({ onLoginSuccess }: LoginPageProps) {
  const { correo, contrasena, handleCorreoChange, handleContrasenaChange, handleEnviar, navigate } =
    useAccesoConCorreo(onLoginSuccess);

  // ── GOOGLE OAUTH REAL ────────────────────────────────────────────────────────
  // Abre la ventana emergente ORIGINAL de Google (selector de cuenta).
  // El access_token obtenido se envía al backend, que lo vuelve a verificar
  // contra Google server-side y toma de ahí el correo/nombre verificados.
  // No se llama a googleapis userinfo desde el navegador: ese request
  // cross-origin falla por CORS y produciría "Network Error".
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
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <Login
      correo={correo}
      contrasena={contrasena}
      onCorreoChange={handleCorreoChange}
      onContrasenaChange={handleContrasenaChange}
      onEnviar={handleEnviar}
      onGoogleLogin={() => iniciarConGoogle()}
      onVolverPrincipal={() => navigate('/')}
    />
  );
}

const LoginPage = (props: LoginPageProps) =>
  HAY_GOOGLE ? <LoginConGoogle {...props} /> : <LoginSinGoogle {...props} />;

export default LoginPage;
