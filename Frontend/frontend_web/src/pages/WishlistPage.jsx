import { useCurrency } from '../context/CurrencyContext';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShoppingCart,
  Trash2,
  Bell,
  BellOff,
  TrendingDown,
  ArrowRight,
  Store,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { esComprador } from '../utils/roles';

export default function WishlistPage() {
  const { usuario } = useAuth();
  const {
    items,
    cargando,
    moverAlCarrito,
    toggleWishlist,
    actualizarAlerta,
    totalDeseados,
  } = useWishlist();

  const [editandoAlertaId, setEditandoAlertaId] = useState(null);
  const { formatearPrecio } = useCurrency();
  const [precioMetaInput, setPrecioMetaInput] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);

  const mostrarExito = (msg) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(''), 3500);
  };

  if (!usuario || !esComprador(usuario)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          <Heart size={32} className="fill-rose-500/20" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Inicia sesión como comprador
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Para ver tus productos favoritos y recibir alertas personalizadas cuando bajen de precio, necesitas una cuenta de comprador.
        </p>
        <div className="pt-2">
          <Link
            to="/login?next=/favoritos"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  const itemsConBaja = items.filter((it) => it.baja_precio_detectada);

  const handleMoverAlCarrito = async (item) => {
    setProcesandoId(item.id);
    try {
      await moverAlCarrito(item, false);
      mostrarExito(`"${item.nombre}" se movió al carrito.`);
    } catch {
      alert('No se pudo mover el producto al carrito.');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleGuardarAlerta = async (item) => {
    try {
      await actualizarAlerta(item.id, {
        precio_objetivo: precioMetaInput ? parseFloat(precioMetaInput) : null,
      });
      setEditandoAlertaId(null);
      mostrarExito('Alerta de precio actualizada.');
    } catch {
      alert('Error al guardar el precio objetivo.');
    }
  };

  const handleToggleNotif = async (item) => {
    try {
      await actualizarAlerta(item.id, {
        notificar_baja_precio: !item.notificar_baja_precio,
      });
      mostrarExito(
        item.notificar_baja_precio
          ? 'Alertas de precio desactivadas para este producto.'
          : 'Alertas de precio activadas.'
      );
    } catch {
      alert('No se pudo modificar la alerta.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Banner de feedback */}
      {mensajeExito && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-4 text-sm font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <Heart size={22} className="fill-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Lista de Deseos y Alertas de Precio
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Recibe notificaciones en tiempo real cuando tus productos favoritos bajen de precio.
              </p>
            </div>
          </div>
        </div>

        {/* Resumen rápido */}
        <div className="flex items-center gap-3 text-sm">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/80 px-4 py-2 border border-gray-200 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400">Guardados: </span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{totalDeseados}</span>
          </div>
          {itemsConBaja.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 px-4 py-2 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold">
              <TrendingDown size={16} />
              <span>{itemsConBaja.length} con rebaja</span>
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      {cargando ? (
        <div className="py-20 text-center text-gray-400 dark:text-gray-500">
          Cargando tu lista de deseos...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center space-y-4 max-w-xl mx-auto">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gray-50 dark:bg-gray-800 text-gray-400">
            <Heart size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Tu lista de deseos está vacía
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Explora el catálogo y presiona el ícono del corazón en cualquier producto para guardarlo aquí y monitorear su precio.
            </p>
          </div>
          <Link
            to="/productos"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition"
          >
            Explorar catálogo <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const tieneBaja = item.baja_precio_detectada;
            const editandoAlerta = editandoAlertaId === item.id;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
              >
                {/* Imagen y badges */}
                <div className="relative aspect-4/3 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <Link to={`/productos/${item.producto_id}`}>
                    <img
                      src={item.imagen || '/placeholder.png'}
                      alt={item.nombre}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Badge de Alerta de rebaja */}
                  {tieneBaja && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-1 text-xs font-bold shadow-md animate-pulse">
                      <TrendingDown size={14} />
                      <span>¡Bajó de precio!</span>
                    </div>
                  )}

                  {/* Botón eliminar de la lista */}
                  <button
                    type="button"
                    onClick={() => toggleWishlist({ id: item.producto_id })}
                    className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-400 hover:text-rose-500 hover:bg-white transition-colors shadow-xs"
                    title="Eliminar de favoritos"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Info del producto */}
                <div className="flex flex-1 flex-col p-5 gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Store size={14} className="text-gray-400" />
                    <span>{item.empresa_nombre || 'Tienda VecinoMarket'}</span>
                  </div>

                  <Link
                    to={`/productos/${item.producto_id}`}
                    className="font-semibold text-gray-900 dark:text-gray-100 hover:text-brand-600 line-clamp-2 transition-colors text-base"
                  >
                    {item.nombre}
                  </Link>

                  {/* Precios */}
                  <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-800/60">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-extrabold text-brand-600 dark:text-brand-400">
                            {formatearPrecio(item.precio_actual)}
                          </span>
                          {tieneBaja && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
                              {formatearPrecio(item.precio_al_guardar)}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400">
                          Guardado inicialmente en: {formatearPrecio(item.precio_al_guardar)}
                        </span>
                      </div>

                      {item.porcentaje_descuento > 0 && (
                        <span className="rounded-md bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                          -{item.porcentaje_descuento}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Panel de Alerta de Precio */}
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-xs space-y-2 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleToggleNotif(item)}
                        className={`flex items-center gap-1.5 font-medium transition-colors ${
                          item.notificar_baja_precio
                            ? 'text-brand-700 dark:text-brand-300'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {item.notificar_baja_precio ? (
                          <>
                            <Bell size={14} className="fill-brand-500/20 text-brand-600" />
                            <span>Alerta activa</span>
                          </>
                        ) : (
                          <>
                            <BellOff size={14} />
                            <span>Alertas desactivadas</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditandoAlertaId(editandoAlerta ? null : item.id);
                          setPrecioMetaInput(item.precio_objetivo ? String(item.precio_objetivo) : '');
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1"
                        title="Configurar precio objetivo"
                      >
                        <Sliders size={13} />
                        <span>{item.precio_objetivo ? `Meta: Bs ${item.precio_objetivo}` : 'Fijar meta'}</span>
                      </button>
                    </div>

                    {editandoAlerta && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                        <span className="text-gray-500">Bs</span>
                        <input
                          type="number"
                          step="0.5"
                          placeholder="Monto meta"
                          value={precioMetaInput}
                          onChange={(e) => setPrecioMetaInput(e.target.value)}
                          className="w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
                        />
                        <button
                          type="button"
                          onClick={() => handleGuardarAlerta(item)}
                          className="rounded-lg bg-brand-600 hover:bg-brand-700 px-2.5 py-1 text-white font-semibold transition"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditandoAlertaId(null)}
                          className="text-gray-400 hover:text-gray-600 px-1"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Acciones principales */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={!item.en_stock || procesandoId === item.id}
                      onClick={() => handleMoverAlCarrito(item)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed py-2.5 text-sm font-semibold text-white shadow-xs transition"
                    >
                      <ShoppingCart size={16} />
                      <span>{procesandoId === item.id ? 'Añadiendo...' : 'Mover al carrito'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

