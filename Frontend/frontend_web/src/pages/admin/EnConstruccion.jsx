import { Navigate } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

export default function EnConstruccion({ cu, titulo, descripcion }) {
  const { usuario, cargando: cargandoAuth } = useAuth();

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Construction className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {cu} · {titulo}
        </h1>
      </div>
      <div className="mt-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Este módulo todavía no está implementado.</p>
        {descripcion && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">{descripcion}</p>
        )}
      </div>
    </div>
  );
}
