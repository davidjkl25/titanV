import { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AceptarInvitacionPage from './pages/AceptarInvitacionPage';
import './App.css';

// Componente interno para manejar la redirección DESPUÉS de que el estado cambie
function AppRoutes() {
  // Antes esto siempre arrancaba en false, así que recargar la página con
  // sesión iniciada te mandaba de vuelta al login aunque el token siguiera
  // guardado. Ahora arranca según si hay token o no.
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!localStorage.getItem('token'));
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('usuario_nombre');
  };

  // Cuando isLoggedIn cambia a true, navega al dashboard
  // (a menos que haya una invitación pendiente por aceptar, ver AceptarInvitacionPage)
  useEffect(() => {
    if (isLoggedIn && !sessionStorage.getItem('invitacion_pendiente')) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoggedIn]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          isLoggedIn ? (
            <DashboardPage onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/invitacion/:token"
        element={<AceptarInvitacionPage isLoggedIn={isLoggedIn} onLoginSuccess={handleLoginSuccess} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;

