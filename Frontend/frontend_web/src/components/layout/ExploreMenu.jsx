import { Link } from 'react-router-dom';
import { Menu, ChevronDown } from 'lucide-react';
import * as Icons from 'lucide-react';
import Dropdown from '../ui/Dropdown';
import { useCatalogo } from '../../context/CatalogoContext';

export default function ExploreMenu() {
  const { categorias } = useCatalogo();

  return (
    <Dropdown
      align="left"
      triggerClassName="rounded-full px-3 py-2 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      panelClassName="w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 shadow-lg text-sm text-gray-700 dark:text-gray-200"
      trigger={
        <>
          <Menu size={18} />
          Explora
          <ChevronDown size={14} />
        </>
      }
    >
      {categorias.map((cat) => {
        const Icono = Icons[cat.icono] || Icons.Package;
        return (
          <Link
            key={cat.id}
            to={`/productos?categoria=${cat.id}`}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Icono size={16} className="text-brand-600" />
            {cat.nombre}
          </Link>
        );
      })}
    </Dropdown>
  );
}
