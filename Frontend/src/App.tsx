import { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
<<<<<<< HEAD
import './App.css';

// Componente interno para manejar la redirección DESPUÉS de que el estado cambie
function AppRoutes() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
=======
import AceptarInvitacionPage from './pages/AceptarInvitacionPage';
import './App.css';

function AppRoutes() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!localStorage.getItem('token'));
>>>>>>> test
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('usuario_nombre');
<<<<<<< HEAD
  };

  // Cuando isLoggedIn cambia a true, navega al dashboard
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoggedIn]);
=======
    
  };

  useEffect(() => {
    if (isLoggedIn && !sessionStorage.getItem('invitacion_pendiente')) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoggedIn, navigate]);
>>>>>>> test

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
<<<<<<< HEAD
=======
      <Route
        path="/invitacion/:token"
        element={<AceptarInvitacionPage isLoggedIn={isLoggedIn} onLoginSuccess={handleLoginSuccess} />}
      />
>>>>>>> test
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
<<<<<<< HEAD

=======
>>>>>>> test
