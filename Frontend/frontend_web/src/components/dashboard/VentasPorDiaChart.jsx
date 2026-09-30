export default function VentasPorDiaChart({ datos }) {
  const maximo = Math.max(...datos.map((d) => d.total_ventas), 1);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Ventas de los últimos {datos.length} días</p>
      <div className="flex items-end gap-1.5 h-40">
        {datos.map((d) => {
          const alturaPct = Math.max((d.total_ventas / maximo) * 100, d.total_ventas > 0 ? 4 : 1);
          return (
            <div key={d.dia} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                Bs {d.total_ventas.toFixed(2)}
              </div>
              <div
                className={`w-full rounded-t-sm ${d.total_ventas > 0 ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                style={{ height: `${alturaPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {datos.map((d) => (
          <div key={d.dia} className="flex-1 text-center text-[9px] text-gray-400 dark:text-gray-500">
            {new Date(d.dia + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' })}
          </div>
        ))}
      </div>
    </div>
  );
}
