import { MapPin, ChevronDown } from 'lucide-react';
import Dropdown from '../ui/Dropdown';
import { DEPARTAMENTOS, useLocationPref } from '../../context/LocationContext';

export default function DepartamentoMenu() {
  const { departamento, setDepartamento } = useLocationPref();

  return (
    <Dropdown
      align="right"
      triggerClassName="rounded-full px-2 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      panelClassName="w-48 max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 shadow-lg text-sm text-gray-700 dark:text-gray-200"
      trigger={
        <>
          <MapPin size={18} />
          <span className="hidden lg:inline">{departamento}</span>
          <ChevronDown size={14} className="hidden md:block" />
        </>
      }
    >
      {DEPARTAMENTOS.map((dep) => (
        <button
          key={dep}
          type="button"
          onClick={() => setDepartamento(dep)}
          className={`block w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${dep === departamento ? 'font-semibold text-brand-600' : ''}`}
        >
          {dep}
        </button>
      ))}
    </Dropdown>
  );
}
