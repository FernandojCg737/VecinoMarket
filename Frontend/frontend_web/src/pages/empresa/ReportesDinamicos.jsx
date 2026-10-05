import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sliders, AlertCircle, Sparkles } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado, tienePermisoEmpleado } from '../../utils/roles';
import ReportesDinamicosBase from '../../components/reportes/ReportesDinamicosBase';

export default function ReportesDinamicos() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [incluyeIA, setIncluyeIA] = useState(false);

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    API.get('suscripciones/mi-suscripcion/')
      .then((res) => {
        setIncluyeIA(Boolean(res.data?.plan?.incluye_ia));
      })
      .catch(() => setIncluyeIA(false));
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/reportes" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  const tienePermiso = tienePermisoEmpleado(usuario, 'ver_reportes') || tienePermisoEmpleado(usuario, 'gestionar_reportes');
  if (!tienePermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto mb-3 text-red-500" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Acceso restringido</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "gestionar_reportes" asignado por el SuperAdmin o el administrador de tu empresa para ver y generar reportes personalizados.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Sliders className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reportes personalizados</h1>
        </div>
        {incluyeIA ? (
          <span className="w-fit rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-3.5 py-1 text-xs font-semibold flex items-center gap-1.5 border border-purple-200 dark:border-purple-800">
            <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
            Comandos de voz por IA disponibles
          </span>
        ) : (
          <span className="w-fit rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3.5 py-1 text-xs">
            Plan Estándar (Mejora a plan con IA para comandos de voz)
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU18 · Configura tus datasets, filtra por columnas y fechas, visualiza la tabla interactiva en pantalla o exporta el reporte.
      </p>
      <ReportesDinamicosBase
        catalogoUrl="reportes/reportes-dinamicos/catalogo/"
        generarUrl="reportes/reportes-dinamicos/generar/"
        permiteVoz={incluyeIA}
      />
    </div>
  );
}
