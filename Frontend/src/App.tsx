import { Component, useState, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AceptarInvitacionPage from './pages/AceptarInvitacionPage';
import GoogleAuthPopupPage from './pages/GoogleAuthPopupPage';
import './App.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#fff', backgroundColor: '#1a1a1a', padding: '40px', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#ffcc00' }}>⚠️ Ocurrió un error al cargar la vista</h2>
          <p style={{ marginTop: '10px' }}>Detalle del error:</p>
          <pre style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '6px', color: '#ff6b6b', overflowX: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ backgroundColor: '#222', padding: '15px', borderRadius: '6px', color: '#aaa', fontSize: '12px', overflowX: 'auto', marginTop: '10px' }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/';
            }}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#ffcc00',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Limpiar sesión y volver al inicio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
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

  useEffect(() => {
    if (isLoggedIn && !sessionStorage.getItem('invitacion_pendiente')) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/google-auth" element={<GoogleAuthPopupPage />} />
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
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
