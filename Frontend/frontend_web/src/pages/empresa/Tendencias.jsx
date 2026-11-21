import { useCallback, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Lock, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado, planPermiteIA, tienePermisoEmpleado } from '../../utils/roles';
import TendenciasConsumo from '../../components/ia/TendenciasConsumo';

// CU3 (RF46): tendencias de consumo de la empresa (solo web). Requiere el
// permiso 'ver_reportes' (el dueño lo tiene siempre) y un plan con IA vigente.
export default function Tendencias() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [sinPermiso, setSinPermiso] = useState(false);
  const [sinPlan, setSinPlan] = useState(false);

  // Estable (useCallback): TendenciasConsumo lo usa como dependencia de su efecto.
  const accesoDenegado = useCallback((err) => {
    const detalle = (err?.response?.data?.detail || '').toLowerCase();
    if (detalle.includes('inteligencia artificial') || detalle.includes('plan')) setSinPlan(true);
    else setSinPermiso(true);
  }, []);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/tendencias" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  if (!planPermiteIA(usuario) || sinPlan) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
          <TrendingUp size={32} />
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 mb-3 border border-amber-200 dark:border-amber-800">
          <Lock size={12} /> FUNCIÓN EXCLUSIVA PLANES BÁSICO Y PREMIUM
        </span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Análisis de tendencias no disponible</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg mx-auto mb-6">
          Tu empresa tiene actualmente el <strong>{usuario?.empresa_plan?.nombre ? `Plan ${usuario.empresa_plan.nombre}` : 'Plan Prueba'}</strong>.
          El análisis de tendencias con Inteligencia Artificial requiere el <strong>Plan Básico</strong> o <strong>Plan Premium</strong> con la suscripción activa.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/mi-empresa/dashboard"
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Volver a mi Dashboard
          </Link>
          <Link to="/mi-empresa/suscripcion" className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-sm font-bold text-white shadow-xs transition">
            Ver Planes Disponibles
          </Link>
        </div>
      </div>
    );
  }

  if (!tienePermisoEmpleado(usuario, 'ver_reportes') || sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <TrendingUp className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "ver_reportes" para ver las tendencias de tu empresa.
          Pídele al dueño de la cuenta que te lo asigne.
        </p>
      </div>
    );
  }

  return <TendenciasConsumo modo="empresa" onAccesoDenegado={accesoDenegado} />;
}
