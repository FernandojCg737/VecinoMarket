import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CreditCard, History, QrCode, Globe, Lock } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { esComprador } from '../utils/roles';

export default function MisTarjetas() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [historial, setHistorial] = useState(null);
  const [error, setError] = useState('');

  function cargar() {
    return API.get('pedidos/mis-compras/', { params: { page_size: 100 } })
      .then((res) => { setHistorial(res.data.results); setError(''); })
      .catch(() => setError('No se pudo cargar el historial de métodos de pago.'));
  }

  useEffect(() => {
    if (!usuario || !esComprador(usuario)) return;
    cargar();
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mis-tarjetas" replace />;
  if (!esComprador(usuario)) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <CreditCard className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Métodos de pago</h1>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU25 · Administra tus tarjetas y métodos guardados para pagos seguros.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {!historial ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : historial.length === 0 ? (
        <div className="py-12 flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <History size={32} className="text-gray-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Aún no realizaste compras.</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tus métodos de pago utilizados aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {historial.map((pedido) => {
            const metodo = (pedido.metodo_pago || '').toUpperCase();
            const esPaypal = metodo.includes('PAYPAL');
            const esQr = metodo.includes('QR');
            
            let Icono = CreditCard;
            let nombreMetodo = metodo || 'Desconocido';
            if (esPaypal) {
              Icono = Globe;
              nombreMetodo = 'PayPal';
            } else if (esQr) {
              Icono = QrCode;
              nombreMetodo = 'Pago con QR';
            }

            return (
              <div key={pedido.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
                    <Icono size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{nombreMetodo}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Pedido #{pedido.numero_pedido} · Bs {pedido.subtotal}
                    </p>
                  </div>
                </div>
                <div className="px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[10px] font-bold">
                  Exitoso
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand-200 dark:border-brand-900/50 bg-brand-50/50 dark:bg-brand-900/10 p-4">
        <Lock className="mt-0.5 text-brand-600 dark:text-brand-400 shrink-0" size={18} />
        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          Tus datos están protegidos bajo estándares PCI-DSS y bóveda tokenizada de PayPal.
        </p>
      </div>
    </div>
  );
}
