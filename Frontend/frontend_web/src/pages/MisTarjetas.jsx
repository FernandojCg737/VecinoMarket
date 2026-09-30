import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { esComprador } from '../utils/roles';
import PayPalCheckoutButton from '../components/pagos/PayPalCheckoutButton';

export default function MisTarjetas() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [tarjetas, setTarjetas] = useState(null);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const setupTokenIdRef = useRef(null);

  function cargar() {
    return API.get('pagos/mis-tarjetas/')
      .then((res) => { setTarjetas(res.data); setError(''); })
      .catch(() => setError('No se pudo cargar tus métodos de pago.'));
  }

  useEffect(() => {
    if (!usuario || !esComprador(usuario)) return;
    cargar();
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mis-tarjetas" replace />;
  if (!esComprador(usuario)) return <Navigate to="/" replace />;

  async function crearPromesaVinculo() {
    const { data } = await API.post('pagos/mis-tarjetas/');
    setupTokenIdRef.current = data.setup_token_id;
    return { vaultSetupToken: data.setup_token_id };
  }

  async function onApprove() {
    await API.post('pagos/mis-tarjetas/confirmar/', { setup_token_id: setupTokenIdRef.current });
    setMostrarForm(false);
    await cargar();
  }

  async function eliminar(tarjeta) {
    if (!window.confirm('¿Eliminar este método de pago guardado?')) return;
    try {
      await API.delete(`pagos/mis-tarjetas/${tarjeta.id}/`);
      await cargar();
    } catch {
      setError('No se pudo eliminar el método de pago.');
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <CreditCard className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis métodos de pago</h1>
        </div>
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Vincular PayPal
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Vinculá tu cuenta de PayPal una vez y usala para pagar en cualquier empresa sin volver a iniciar sesión en PayPal cada vez.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {mostrarForm && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Vincular cuenta de PayPal</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Se abrirá una ventana de PayPal para que apruebes la vinculación.
          </p>
          <PayPalCheckoutButton
            modo="guardar"
            crearPromesaInicio={crearPromesaVinculo}
            onApprove={onApprove}
            textoBoton="Vincular con PayPal"
          />
          <button onClick={() => setMostrarForm(false)} className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:underline">
            Cancelar
          </button>
        </div>
      )}

      {!tarjetas ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : tarjetas.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Todavía no vinculaste ninguna cuenta de PayPal.</p>
      ) : (
        <div className="space-y-2">
          {tarjetas.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-14 place-items-center rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300">
                  PayPal
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.nombre || 'Cuenta PayPal'}</p>
                  {t.email && <p className="text-xs text-gray-400 dark:text-gray-500">{t.email}</p>}
                </div>
              </div>
              <button onClick={() => eliminar(t)} className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
