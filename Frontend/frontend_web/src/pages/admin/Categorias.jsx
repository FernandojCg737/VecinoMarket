import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Tags, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Package } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

const VACIO = { nombre: '', descripcion: '', icono: '', categoria_padre: '' };

function IconoCategoria({ nombre, ...props }) {
  const Icono = Icons[nombre] || Package;
  return <Icono {...props} />;
}

export default function Categorias() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState('');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  const [expandida, setExpandida] = useState(null);
  const [productosPorCategoria, setProductosPorCategoria] = useState({});
  const [cargandoProductos, setCargandoProductos] = useState(false);

  function cargarCategorias() {
    return API.get('catalogo/admin/categorias/')
      .then((res) => {
        setCategorias(res.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar las categorías.'));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargarCategorias();
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/categorias" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  function abrirNueva() {
    setEditandoId(null);
    setForm(VACIO);
    setErrorForm('');
    setMostrarForm(true);
  }

  function abrirEdicion(cat) {
    setEditandoId(cat.id);
    setForm({
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      icono: cat.icono || '',
      categoria_padre: cat.categoria_padre ?? '',
    });
    setErrorForm('');
    setMostrarForm(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    const payload = { ...form, categoria_padre: form.categoria_padre || null };
    try {
      if (editandoId) {
        await API.patch(`catalogo/admin/categorias/${editandoId}/`, payload);
      } else {
        await API.post('catalogo/admin/categorias/', payload);
      }
      setMostrarForm(false);
      await cargarCategorias();
    } catch (err) {
      setErrorForm(err?.response?.data?.nombre?.[0] || 'No se pudo guardar la categoría.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(cat) {
    if (cat.productos_count > 0) {
      if (!window.confirm(`"${cat.nombre}" tiene ${cat.productos_count} producto(s). Al eliminarla quedarán sin categoría. ¿Continuar?`)) return;
    } else if (!window.confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) {
      return;
    }
    try {
      await API.delete(`catalogo/admin/categorias/${cat.id}/`);
      await cargarCategorias();
    } catch {
      setError('No se pudo eliminar la categoría.');
    }
  }

  async function toggleExpandir(cat) {
    if (expandida === cat.id) {
      setExpandida(null);
      return;
    }
    setExpandida(cat.id);
    if (!productosPorCategoria[cat.id]) {
      setCargandoProductos(true);
      try {
        const { data } = await API.get(`catalogo/admin/categorias/${cat.id}/productos/`);
        setProductosPorCategoria((prev) => ({ ...prev, [cat.id]: data.results ?? data }));
      } catch {
        setProductosPorCategoria((prev) => ({ ...prev, [cat.id]: [] }));
      } finally {
        setCargandoProductos(false);
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Tags className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Categorías de productos</h1>
        </div>
        <button
          onClick={abrirNueva}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Nueva categoría
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU06 · Crea, edita, elimina categorías y revisa qué productos tiene cada una.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="space-y-3">
        {categorias.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">No hay categorías todavía.</p>
        ) : categorias.map((cat) => (
          <div key={cat.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                  <IconoCategoria nombre={cat.icono} size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {cat.nombre}
                    {cat.categoria_padre && (
                      <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                        (subcategoría de {categorias.find((c) => c.id === cat.categoria_padre)?.nombre ?? '—'})
                      </span>
                    )}
                  </div>
                  {cat.descripcion && <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{cat.descripcion}</div>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleExpandir(cat)}
                  className="flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                >
                  <Package size={12} /> {cat.productos_count}
                  {expandida === cat.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                <button
                  onClick={() => abrirEdicion(cat)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => eliminar(cat)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {expandida === cat.id && (
              <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                {cargandoProductos && !productosPorCategoria[cat.id] ? (
                  <p className="text-xs text-gray-400">Cargando productos...</p>
                ) : (productosPorCategoria[cat.id] ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Sin productos en esta categoría.</p>
                ) : (
                  <div className="space-y-1.5">
                    {(productosPorCategoria[cat.id] ?? []).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {p.nombre} <span className="text-gray-400 dark:text-gray-500">· {p.empresa?.razon_social}</span>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 shrink-0 ml-2">Bs {p.precio} · {p.estado}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={() => setMostrarForm(false)}>
          <form
            onSubmit={guardar}
            className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editandoId ? 'Editar categoría' : 'Nueva categoría'}
            </h2>

            <div className="space-y-3">
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                value={form.descripcion}
                onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción (opcional)"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <div className="flex items-center gap-2">
                <input
                  value={form.icono}
                  onChange={(e) => setForm((prev) => ({ ...prev, icono: e.target.value }))}
                  placeholder="Ícono (nombre de lucide-react, ej. ShoppingBasket)"
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                  <IconoCategoria nombre={form.icono} size={16} />
                </div>
              </div>
              <select
                value={form.categoria_padre}
                onChange={(e) => setForm((prev) => ({ ...prev, categoria_padre: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">Sin categoría padre (categoría de nivel superior)</option>
                {categorias.filter((c) => c.id !== editandoId).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {errorForm && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{errorForm}</p>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
