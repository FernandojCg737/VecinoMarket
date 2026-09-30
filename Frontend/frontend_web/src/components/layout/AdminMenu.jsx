import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { GRUPOS_ADMIN } from '../../config/adminMenu';
import { useAuth } from '../../context/AuthContext';
import { esSuperAdmin } from '../../utils/roles';

export default function AdminMenu() {
  const [abierto, setAbierto] = useState(null);
  const { usuario } = useAuth();
  const esSuper = esSuperAdmin(usuario);

  return (
    <div className="py-1">
      {GRUPOS_ADMIN.map((grupo, i) => {
        const items = grupo.items.filter((item) => (esSuper || !item.soloSuperAdmin) && !item.ocultoParaStaff);
        if (items.length === 0) return null;
        const expandido = abierto === grupo.id;
        return (
          <div key={grupo.id} onMouseEnter={() => setAbierto(grupo.id)}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAbierto((v) => (v === grupo.id ? null : grupo.id));
              }}
              className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span>
                P{i + 1} · {grupo.titulo}
              </span>
              <ChevronRight size={14} className={`shrink-0 transition-transform ${expandido ? 'rotate-90' : ''}`} />
            </button>
            {expandido && (
              <div className="bg-gray-50 dark:bg-gray-900/40 py-1">
                {items.map((item) => (
                  <Link
                    key={item.cu}
                    to={item.to}
                    className="block px-6 py-1.5 text-xs leading-snug hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="font-medium text-brand-600 dark:text-brand-400">{item.cu}</span>{' '}
                    <span className="text-gray-600 dark:text-gray-300">{item.titulo}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
