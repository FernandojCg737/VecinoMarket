import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Star, Trash2, Pencil } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { esComprador } from '../utils/roles';

function EstrellasInput({ valor, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star size={22} className={n <= valor ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'} />
        </button>
      ))}
    </div>
  );
}

function Estrellas({ valor }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} className={n <= valor ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'} />
      ))}
    </div>
  );
}

export default function MisResenas() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [compras, setCompras] = useState([]);
  const [valoraciones, setValoraciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [editando, setEditando] = useState(null);
  const [pedidoForm, setPedidoForm] = useState(null);
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    setCargando(true);
    return Promise.all([
      API.get('pedidos/mis-compras/', { params: { page_size: 100 } }),
      API.get('reportes/mis-valoraciones/'),
    ])
      .then(([comprasRes, valoracionesRes]) => {
        setCompras(comprasRes.data.results);
        setValoraciones(valoracionesRes.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar tus compras.'))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!usuario || !esComprador(usuario)) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mis-resenas" replace />;
  if (!esComprador(usuario)) return <Navigate to="/" replace />;

  function abrirNueva(pedido) {
    setEditando(null);
    setPedidoForm(pedido);
    setCalificacion(5);
    setComentario('');
  }

  function abrirEdicion(valoracion) {
    setEditando(valoracion);
    setPedidoForm({ id: valoracion.pedido, numero_pedido: valoracion.numero_pedido });
    setCalificacion(valoracion.calificacion);
    setComentario(valoracion.comentario || '');
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      if (editando) {
        await API.patch(`reportes/mis-valoraciones/${editando.id}/`, { calificacion, comentario });
      } else {
        await API.post('reportes/mis-valoraciones/', { pedido: pedidoForm.id, calificacion, comentario });
      }
      setPedidoForm(null);
      await cargar();
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo guardar la reseña.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(valoracion) {
    if (!window.confirm('¿Eliminar tu reseña?')) return;
    try {
      await API.delete(`reportes/mis-valoraciones/${valoracion.id}/`);
      await cargar();
    } catch {
      setError('No se pudo eliminar la reseña.');
    }
  }

  const idsCalificados = new Set(valoraciones.map((v) => v.pedido));
  const pendientes = compras.filter((c) => !idsCalificados.has(c.id));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Star className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis reseñas</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU04 · Califica tus compras entregadas y cuéntale a otros compradores cómo te fue.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {!cargando && pendientes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Pendientes de calificar</h2>
          <div className="space-y-2">
            {pendientes.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">{c.numero_pedido} · {c.empresa_nombre}</span>
                <button
                  onClick={() => abrirNueva(c)}
                  className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Calificar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tus reseñas</h2>
      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : valoraciones.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4">Todavía no dejaste ninguna reseña.</p>
      ) : (
        <div className="space-y-3">
          {valoraciones.map((v) => (
            <div key={v.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{v.empresa_nombre}</span>
                    <Estrellas valor={v.calificacion} />
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{v.numero_pedido}</div>
                  {v.comentario && <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5">{v.comentario}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => abrirEdicion(v)} className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => eliminar(v)} className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pedidoForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={() => setPedidoForm(null)}>
          <form onSubmit={guardar} className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{editando ? 'Editar reseña' : 'Nueva reseña'}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{pedidoForm.numero_pedido}</p>
            <EstrellasInput valor={calificacion} onChange={setCalificacion} />
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Cuéntanos cómo te fue (opcional)"
              rows={3}
              className="w-full mt-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setPedidoForm(null)} className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
