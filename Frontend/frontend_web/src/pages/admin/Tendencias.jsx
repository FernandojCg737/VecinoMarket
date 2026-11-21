import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';
import TendenciasConsumo from '../../components/ia/TendenciasConsumo';

// CU3 (RF46): versión global de las tendencias de consumo, para el personal
// de la plataforma (con filtro opcional por departamento).
export default function TendenciasAdmin() {
  const { usuario, cargando: cargandoAuth } = useAuth();

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/tendencias" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  return <TendenciasConsumo modo="admin" />;
}
