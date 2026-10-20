import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

// Client ID de Google Cloud / Firebase
// Cámbialo en Frontend/.env → VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()

// Sin Client ID no se monta el proveedor: el acceso por correo y contraseña
// sigue funcionando y la aplicación no se cae al cargar.
const contenido = GOOGLE_CLIENT_ID ? (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
) : (
  <App />
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>{contenido}</StrictMode>,
)
