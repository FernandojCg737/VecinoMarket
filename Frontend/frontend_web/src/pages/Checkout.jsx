import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2, MapPin, Store, CreditCard } from 'lucide-react';
import API from '../api/axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import PayPalCheckoutButton from '../components/pagos/PayPalCheckoutButton';

const TASA_CAMBIO = 6.96;

export default function Checkout() {
  const { items, subtotal, vaciarCarrito } = useCart();
  const { usuario, cargando: cargandoAuth } = useAuth();
  const navigate = useNavigate();

  const [direcciones, setDirecciones] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [sucursales, setSucursales] = useState({}); // { [empresaId]: Sucursal[] }
  const [entregas, setEntregas] = useState({}); // { [empresaId]: { modalidad, direccionId, sucursalId } }
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState(null); // id de tarjeta guardada, o null = "nueva"
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { numerosPedido }

  const entregasRef = useRef(entregas);
  useEffect(() => {
    entregasRef.current = entregas;
  }, [entregas]);
  const ordenCompraIdRef = useRef(null);
  const paypalOrderIdRef = useRef(null);

  const grupos = useMemo(() => {
    const porEmpresa = {};
    items.forEach((it) => {
      const key = it.empresaId;
      if (!porEmpresa[key]) porEmpresa[key] = { empresaId: key, empresaNombre: it.empresa, items: [] };
      porEmpresa[key].items.push(it);
    });
    return Object.values(porEmpresa);
  }, [items]);

  useEffect(() => {
    API.get('usuarios/mis-direcciones/').then((res) => setDirecciones(res.data)).catch(() => {});
    API.get('pagos/mis-tarjetas/').then((res) => setTarjetas(res.data)).catch(() => setTarjetas([]));
  }, []);

  useEffect(() => {
    grupos.forEach(({ empresaId }) => {
      if (sucursales[empresaId]) return;
      API.get('inventario/sucursales/', { params: { empresa: empresaId } })
        .then((res) => setSucursales((prev) => ({ ...prev, [empresaId]: res.data })))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupos]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/checkout" replace />;
  if (items.length === 0 && !resultado) return <Navigate to="/carrito" replace />;

  function actualizarEntrega(empresaId, cambios) {
    setEntregas((prev) => ({ ...prev, [empresaId]: { ...prev[empresaId], ...cambios } }));
  }

  function entregasCompletas() {
    return grupos.every(({ empresaId }) => {
      const e = entregas[empresaId];
      if (!e?.modalidad) return false;
      if (e.modalidad === 'ENVIO_DOMICILIO') return Boolean(e.direccionId);
      if (e.modalidad === 'RECOJO_TIENDA') return Boolean(e.sucursalId);
      return false;
    });
  }

  function payloadCheckout() {
    const e = entregasRef.current;
    return {
      items: items.map((it) => ({ producto_id: it.id, cantidad: it.cantidad })),
      entregas: Object.fromEntries(
        Object.entries(e).map(([empresaId, cfg]) => [
          empresaId,
          cfg.modalidad === 'RECOJO_TIENDA'
            ? { modalidad: cfg.modalidad, sucursal_id: cfg.sucursalId }
            : { modalidad: cfg.modalidad, direccion_id: cfg.direccionId },
        ]),
      ),
    };
  }

  async function pagarConTarjetaGuardada() {
    setEnviando(true);
    setError('');
    try {
      const { data: orden } = await API.post('pedidos/checkout/', {
        ...payloadCheckout(),
        payment_token_id: tarjetaSeleccionada,
      });
      const { data: confirmado } = await API.post(`pedidos/checkout/${orden.orden_compra_id}/confirmar/`, {
        paypal_order_id: orden.paypal_order_id,
      });
      finalizar(confirmado.numeros_pedido);
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo procesar el pago.');
    } finally {
      setEnviando(false);
    }
  }

  async function crearPromesaOrdenNueva() {
    const { data: orden } = await API.post('pedidos/checkout/', payloadCheckout());
    ordenCompraIdRef.current = orden.orden_compra_id;
    paypalOrderIdRef.current = orden.paypal_order_id;
    return { orderId: orden.paypal_order_id };
  }

  async function onApproveOrdenNueva() {
    const { data: confirmado } = await API.post(`pedidos/checkout/${ordenCompraIdRef.current}/confirmar/`, {
      paypal_order_id: paypalOrderIdRef.current,
    });
    finalizar(confirmado.numeros_pedido);
  }

  function finalizar(numerosPedido) {
    setResultado({ numerosPedido });
    vaciarCarrito();
  }

  if (resultado) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <CheckCircle2 size={56} className="mx-auto text-green-600 dark:text-green-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">¡Pedido confirmado!</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-1">
          {resultado.numerosPedido.length > 1 ? 'Tus números de pedido son' : 'Tu número de pedido es'}
        </p>
        <p className="text-lg font-mono font-semibold text-brand-600 dark:text-brand-400 mb-6">
          {resultado.numerosPedido.join(' · ')}
        </p>
        <button
          onClick={() => navigate('/mis-compras')}
          className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
        >
          Ver mis compras
        </button>
      </div>
    );
  }

  const montoUsd = (subtotal / TASA_CAMBIO).toFixed(2);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Finalizar compra</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {grupos.map(({ empresaId, empresaNombre, items: itemsEmpresa }) => {
            const cfg = entregas[empresaId] || {};
            return (
              <div key={empresaId} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{empresaNombre}</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                  {itemsEmpresa.map((it) => `${it.cantidad}× ${it.nombre}`).join(', ')}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => actualizarEntrega(empresaId, { modalidad: 'ENVIO_DOMICILIO' })}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${cfg.modalidad === 'ENVIO_DOMICILIO' ? 'border-brand-500 bg-brand-50 dark:bg-gray-800 text-brand-700 dark:text-brand-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    <MapPin size={18} /> Envío a domicilio
                  </button>
                  <button
                    type="button"
                    onClick={() => actualizarEntrega(empresaId, { modalidad: 'RECOJO_TIENDA' })}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${cfg.modalidad === 'RECOJO_TIENDA' ? 'border-brand-500 bg-brand-50 dark:bg-gray-800 text-brand-700 dark:text-brand-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    <Store size={18} /> Recojo en tienda
                  </button>
                </div>

                {cfg.modalidad === 'ENVIO_DOMICILIO' && (
                  <div className="mt-4">
                    {direcciones.length === 0 ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        No tienes direcciones guardadas — agrega una en "Mis direcciones" antes de continuar.
                      </p>
                    ) : (
                      <select
                        value={cfg.direccionId || ''}
                        onChange={(e) => actualizarEntrega(empresaId, { direccionId: Number(e.target.value) })}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                      >
                        <option value="">Elige una dirección...</option>
                        {direcciones.map((d) => (
                          <option key={d.id} value={d.id}>{d.alias || 'Dirección'} — {d.direccion_texto}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {cfg.modalidad === 'RECOJO_TIENDA' && (
                  <div className="mt-4">
                    {!sucursales[empresaId]?.length ? (
                      <p className="text-xs text-gray-400">Cargando sucursales...</p>
                    ) : (
                      <select
                        value={cfg.sucursalId || ''}
                        onChange={(e) => actualizarEntrega(empresaId, { sucursalId: Number(e.target.value) })}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                      >
                        <option value="">Elige una sucursal...</option>
                        {sucursales[empresaId].map((s) => (
                          <option key={s.id} value={s.id}>{s.nombre} — {s.direccion_texto}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Método de pago</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              Se cobrará <strong>${montoUsd} USD</strong> vía PayPal (Bs {subtotal.toFixed(2)} al tipo de cambio oficial).
            </p>

            <div className="space-y-2 mb-4">
              {tarjetas.map((t) => (
                <label key={t.id} className={`flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer ${tarjetaSeleccionada === t.id ? 'border-brand-500 bg-brand-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700'}`}>
                  <input type="radio" name="tarjeta" checked={tarjetaSeleccionada === t.id} onChange={() => setTarjetaSeleccionada(t.id)} />
                  <CreditCard size={16} className="text-gray-500" />
                  <span className="text-gray-800 dark:text-gray-200">PayPal — {t.nombre || t.email || 'cuenta vinculada'}</span>
                </label>
              ))}
              <label className={`flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer ${tarjetaSeleccionada === null ? 'border-brand-500 bg-brand-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700'}`}>
                <input type="radio" name="tarjeta" checked={tarjetaSeleccionada === null} onChange={() => setTarjetaSeleccionada(null)} />
                <CreditCard size={16} className="text-gray-500" />
                <span className="text-gray-800 dark:text-gray-200">Pagar con PayPal (nuevo)</span>
              </label>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}

            {tarjetaSeleccionada === null ? (
              entregasCompletas() ? (
                <PayPalCheckoutButton
                  modo="pago"
                  crearPromesaInicio={crearPromesaOrdenNueva}
                  onApprove={onApproveOrdenNueva}
                  textoBoton={`Pagar $${montoUsd} USD`}
                />
              ) : (
                <p className="text-xs text-gray-400">Completa la entrega de cada tienda para poder pagar.</p>
              )
            ) : (
              <button
                type="button"
                onClick={pagarConTarjetaGuardada}
                disabled={enviando || !entregasCompletas()}
                className="w-full rounded-full bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
              >
                {enviando ? 'Procesando...' : `Pagar $${montoUsd} USD`}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 h-fit">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Resumen</h2>
          <ul className="space-y-2 mb-4 max-h-56 overflow-y-auto text-sm">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between text-gray-600 dark:text-gray-400">
                <span className="truncate pr-2">{it.cantidad}× {it.nombre}</span>
                <span className="shrink-0">Bs {(it.precio * it.cantidad).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-semibold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-800 pt-3">
            <span>Total</span>
            <span>Bs {subtotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
