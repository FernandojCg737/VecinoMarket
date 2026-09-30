import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, Star, MapPin, MessageCircle, Bot, Radio, Sparkles,
  Package, Wallet, Bell, ChevronRight,
} from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { esComprador } from '../utils/roles';

const ESTADO_LABEL = {
  PENDIENTE: 'Pendiente', CONFIRMADO: 'Confirmado', EN_PREPARACION: 'En preparación',
  ENVIADO: 'Enviado', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado',
};

function badgeEstado(estado) {
  if (estado === 'ENTREGADO') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'CANCELADO') return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  if (estado === 'ENVIADO') return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
}

function Tarjeta({ icono: Icono, etiqueta, valor, color }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`grid h-8 w-8 place-items-center rounded-full ${color}`}>
          <Icono size={16} />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{etiqueta}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{valor}</p>
    </div>
  );
}

const ACCESOS = [
  { to: '/mis-direcciones', icono: MapPin, etiqueta: 'Direcciones' },
  { to: '/mis-resenas', icono: Star, etiqueta: 'Reseñas' },
  { to: '/chat', icono: MessageCircle, etiqueta: 'Chats' },
  { to: '/chatbot', icono: Bot, etiqueta: 'Chatbot' },
  { to: '/live', icono: Radio, etiqueta: 'Live' },
];

export default function DashboardComprador() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [compras, setCompras] = useState(null);
  const [valoraciones, setValoraciones] = useState(null);
  const [recomendaciones, setRecomendaciones] = useState(null);
  const [notificaciones, setNotificaciones] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario || !esComprador(usuario)) return;
    Promise.all([
      API.get('pedidos/mis-compras/', { params: { page_size: 100 } }),
      API.get('reportes/mis-valoraciones/'),
      API.get('reportes/mis-recomendaciones/'),
      API.get('notificaciones/mis-notificaciones/'),
    ])
      .then(([comprasRes, valoracionesRes, recomendacionesRes, notificacionesRes]) => {
        setCompras(comprasRes.data.results);
        setValoraciones(valoracionesRes.data);
        setRecomendaciones(recomendacionesRes.data);
        setNotificaciones(notificacionesRes.data);
      })
      .catch(() => setError('No se pudo cargar tu cuenta.'));
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-cuenta" replace />;
  if (!esComprador(usuario)) return <Navigate to="/" replace />;

  const cargando = !compras || !valoraciones || !recomendaciones || !notificaciones;

  const pedidosEnCurso = compras?.filter((c) => !['ENTREGADO', 'CANCELADO'].includes(c.estado)).length ?? 0;
  const totalGastado = compras?.reduce((suma, c) => suma + Number(c.subtotal), 0) ?? 0;
  const idsCalificados = new Set((valoraciones || []).map((v) => v.pedido));
  const porCalificar = compras?.filter((c) => c.estado === 'ENTREGADO' && !idsCalificados.has(c.id)).length ?? 0;
  const sinLeer = notificaciones?.filter((n) => !n.leido).length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <LayoutDashboard className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Hola, {usuario.nombre?.split(' ')[0]}</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Todo lo tuyo en un solo lugar.</p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tarjeta icono={Package} etiqueta="Pedidos en curso" valor={pedidosEnCurso} color="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" />
            <Tarjeta icono={Wallet} etiqueta="Total comprado" valor={`Bs ${totalGastado.toFixed(2)}`} color="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400" />
            <Tarjeta icono={Star} etiqueta="Por calificar" valor={porCalificar} color="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" />
            <Tarjeta icono={Bell} etiqueta="Notificaciones" valor={sinLeer} color="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" />
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Receipt size={16} className="text-brand-600 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pedidos recientes</p>
              </div>
              <Link to="/mis-compras" className="flex items-center gap-0.5 text-xs text-brand-600 dark:text-brand-400 hover:underline">
                Ver todos <ChevronRight size={12} />
              </Link>
            </div>
            {compras.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Todavía no hiciste ninguna compra.</p>
            ) : (
              <div className="space-y-2">
                {compras.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    to="/mis-compras"
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{c.numero_pedido} · {c.empresa_nombre}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{new Date(c.fecha).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeEstado(c.estado)}`}>{ESTADO_LABEL[c.estado] || c.estado}</span>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Bs {c.subtotal}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles size={16} className="text-brand-600 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recomendado para ti</p>
              </div>
              <Link to="/recomendados" className="flex items-center gap-0.5 text-xs text-brand-600 dark:text-brand-400 hover:underline">
                Ver más <ChevronRight size={12} />
              </Link>
            </div>
            {recomendaciones.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Todavía no tenemos recomendaciones para ti.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recomendaciones.slice(0, 4).map((r, i) => (
                  <Link key={i} to="/recomendados" className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-brand-400 dark:hover:border-brand-500 transition">
                    <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                      {r.imagen_url && <img src={r.imagen_url} alt={r.producto_nombre} className="h-full w-full object-cover" />}
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-1">{r.producto_nombre}</p>
                      <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">Bs {Number(r.producto_precio).toFixed(2)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Accesos rápidos</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {ACCESOS.map(({ to, icono: Icono, etiqueta }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-center hover:border-brand-400 dark:hover:border-brand-500 transition"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                    <Icono size={16} />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">{etiqueta}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
