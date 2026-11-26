import { useNavigate, useSearchParams } from 'react-router-dom';
import RecuperarContrasena from '../components/RecuperarContrasena';

const RecuperarContrasenaPage = () => {
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const token = parametros.get('token') || '';
  const email = parametros.get('email') || '';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212' }}>
      <RecuperarContrasena
        tokenInicial={token}
        emailInicial={email}
        onClose={() => navigate('/login')}
      />
    </div>
  );
};

export default RecuperarContrasenaPage;
