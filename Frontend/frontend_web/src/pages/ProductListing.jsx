import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Store, MessageCircle, Bot } from 'lucide-react';
import API from '../api/axios';
import { obtenerProductos } from '../api/catalogo';
import { useCatalogo } from '../context/CatalogoContext';
import { useAuth } from '../context/AuthContext';
import { esComprador } from '../utils/roles';
import ProductCard from '../components/product/ProductCard';
import ChatbotWidget from '../components/chat/ChatbotWidget';

export default function ProductListing() {
  const { categorias } = useCatalogo();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') || '';
  const categoriaId = searchParams.get('categoria') || '';
  const empresaId = searchParams.get('empresa') || '';
  const empresaNombre = searchParams.get('empresaNombre') || '';

  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarChatbot, setMostrarChatbot] = useState(false);
  const [iniciandoChat, setIniciandoChat] = useState(false);

  // Vuelve a mostrar "cargando" en cuanto cambian los filtros
  const filtroActual = `${q}|${categoriaId}|${empresaId}`;
  const [filtroAnterior, setFiltroAnterior] = useState(filtroActual);
  if (filtroAnterior !== filtroActual) {
    setFiltroAnterior(filtroActual);
    setCargando(true);
  }

  useEffect(() => {
    obtenerProductos({ q, categoriaId, empresaId })
      .then(setResultados)
      .catch(() => setResultados([]))
      .finally(() => setCargando(false));
  }, [q, categoriaId, empresaId]);

  function cambiarCategoria(id) {
    const params = new URLSearchParams(searchParams);
    if (id) params.set('categoria', id);
    else params.delete('categoria');
    setSearchParams(params);
  }

  function limpiarFiltroEmpresa() {
    const params = new URLSearchParams(searchParams);
    params.delete('empresa');
    params.delete('empresaNombre');
    setSearchParams(params);
  }

  async function handleContactarVendedor() {
    if (!usuario) {
      navigate(`/login?next=/productos?empresa=${empresaId}${empresaNombre ? `&empresaNombre=${encodeURIComponent(empresaNombre)}` : ''}`);
      return;
    }
    if (!esComprador(usuario)) {
      alert('Debes iniciar sesión con una cuenta de comprador para chatear con los vendedores.');
      return;
    }
    setIniciandoChat(true);
    try {
      const { data } = await API.post('comunicacion/mis-conversaciones/', {
        empresa: Number(empresaId),
      });
      navigate(`/chat?conversacion=${data.id}`);
    } catch (err) {
      console.error('Error al iniciar chat:', err);
      alert('No se pudo abrir el chat con el vendedor. Por favor, intenta de nuevo.');
    } finally {
      setIniciandoChat(false);
    }
  }

  const nombreTienda = empresaNombre || (empresaId && resultados[0]?.empresa) || 'Tienda';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {empresaId ? (
        <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-emerald-50/70 via-white to-brand-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/80 p-5 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
                <Store size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{nombreTienda}</h1>
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Tienda activa
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Catálogo de productos · {cargando ? 'Buscando...' : `${resultados.length} producto${resultados.length === 1 ? '' : 's'} disponible${resultados.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleContactarVendedor}
                disabled={iniciandoChat}
                className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs md:text-sm font-semibold text-white hover:bg-brand-700 transition shadow-sm disabled:opacity-50"
                title="Contactar al vendedor por chat interno (CU14)"
              >
                <MessageCircle size={16} />
                {iniciandoChat ? 'Abriendo chat...' : 'Contactar vendedor'}
              </button>

              <button
                onClick={() => setMostrarChatbot((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition shadow-sm"
                title="Preguntas frecuentes con el chatbot (CU15)"
              >
                <Bot size={16} className="text-brand-600 dark:text-brand-400" />
                {mostrarChatbot ? 'Ocultar chatbot' : 'Preguntar al chatbot'}
              </button>

              <button
                onClick={limpiarFiltroEmpresa}
                className="rounded-full border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="Ver todos los productos de todas las tiendas"
              >
                Ver todas las tiendas
              </button>
            </div>
          </div>

          {mostrarChatbot && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <ChatbotWidget empresaId={Number(empresaId)} empresaNombre={nombreTienda} />
            </div>
          )}
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {q ? `Resultados para "${q}"` : 'Todos los productos'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {cargando ? 'Buscando...' : `${resultados.length} productos encontrados`}
          </p>
        </>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-56 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Categorías</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <button
                onClick={() => cambiarCategoria('')}
                className={`w-full text-left rounded px-2 py-1.5 ${!categoriaId ? 'bg-brand-50 dark:bg-gray-800 text-brand-700 dark:text-brand-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                Todas
              </button>
            </li>
            {categorias.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => cambiarCategoria(cat.id)}
                  className={`w-full text-left rounded px-2 py-1.5 ${categoriaId === cat.id ? 'bg-brand-50 dark:bg-gray-800 text-brand-700 dark:text-brand-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  {cat.nombre}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex-1">
          {!cargando && resultados.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              {empresaId
                ? 'Esta tienda no tiene productos en la categoría seleccionada.'
                : 'No encontramos productos con esos filtros.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {resultados.map((p) => (
                <ProductCard key={p.id} producto={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
