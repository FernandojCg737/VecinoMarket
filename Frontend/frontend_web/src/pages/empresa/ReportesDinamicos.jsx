import { Navigate } from 'react-router-dom';
import { Sliders } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';
import ReportesDinamicosBase from '../../components/reportes/ReportesDinamicosBase';

export default function ReportesDinamicos() {
  const { usuario, cargando: cargandoAuth } = useAuth();

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/reportes" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Sliders className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reportes personalizados</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Elige qué datos, columnas y rango de fechas quieres ver, y expórtalo en el formato que necesites.
      </p>
      <ReportesDinamicosBase
        catalogoUrl="reportes/reportes-dinamicos/catalogo/"
        generarUrl="reportes/reportes-dinamicos/generar/"
      />
    </div>
  );
}
