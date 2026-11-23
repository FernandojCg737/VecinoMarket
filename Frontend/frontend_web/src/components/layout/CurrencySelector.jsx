import { ChevronDown, Check, RefreshCw } from 'lucide-react';
import Dropdown from '../ui/Dropdown';
import { useCurrency } from '../../context/CurrencyContext';
import { MONEDAS } from '../../context/monedas';

// Botón desplegable de selección de moneda. Muestra la moneda activa con su
// símbolo (ej. "$ USD", "€ EUR", "Bs BO", "AR$ AR") y permite elegir entre las
// monedas soportadas. Al cambiar de moneda se vuelve a consultar la tasa del día.
export default function CurrencySelector({ className = '' }) {
  const { moneda, monedaInfo, cambiarMoneda, cargando, error } = useCurrency();

  return (
    <Dropdown
      align="right"
      ariaLabel="Seleccionar moneda"
      triggerClassName={`rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors whitespace-nowrap ${className}`}
      trigger={
        <>
          <span>{monedaInfo.simbolo} {monedaInfo.etiqueta}</span>
          <ChevronDown size={14} className="opacity-70" />
        </>
      }
      panelClassName="w-56 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-1.5"
    >
      <div className="px-2.5 py-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Moneda
        </p>
        {cargando ? (
          <RefreshCw size={13} className="animate-spin text-gray-400" aria-label="Actualizando tasas" />
        ) : null}
      </div>

      <ul className="space-y-0.5">
        {MONEDAS.map((m) => {
          const activo = m.codigo === moneda;
          return (
            <li key={m.codigo}>
              <button
                type="button"
                onClick={() => cambiarMoneda(m.codigo)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
                  activo
                    ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                aria-pressed={activo}
              >
                <span className="grid h-7 w-9 shrink-0 place-items-center rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold">
                  {m.simbolo}
                </span>
                <span className="flex-1">
                  {m.simbolo} {m.etiqueta}
                  <span className="block text-[11px] font-normal text-gray-400 dark:text-gray-500">
                    {m.nombre}
                  </span>
                </span>
                {activo && <Check size={16} className="text-brand-600 dark:text-brand-400" />}
              </button>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p className="px-2.5 pt-1.5 pb-1 text-[11px] text-amber-600 dark:text-amber-500">
          {error}
        </p>
      ) : null}
    </Dropdown>
  );
}