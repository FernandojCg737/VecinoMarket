import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Boxes, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, X, ImagePlus, Upload } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';
import SugerenciaCategoriaIA from '../../components/admin/SugerenciaCategoriaIA';

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
  { value: 'AGOTADO', label: 'Agotado' },
];

const VACIO = { nombre: '', descripcion: '', sku: '', precio: '', precio_descuento: '', estado: 'ACTIVO', categoria: '' };

function badgeEstado(estado) {
  if (estado === 'ACTIVO') return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (estado === 'AGOTADO') return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
  return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
}

export default function MisProductos() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [resultados, setResultados] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [categorias, setCategorias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [nuevaImagenUrl, setNuevaImagenUrl] = useState('');
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [recienCreado, setRecienCreado] = useState(false);

  const porPagina = 24;

  function cargarProductos() {
    setCargando(true);
    return API.get('catalogo/mis-productos/', {
      params: { page: pagina, categoria: filtroCategoria || undefined, estado: filtroEstado || undefined, q: busqueda || undefined },
    })
      .then((res) => {
        setResultados(res.data.results);
        setTotal(res.data.count);
        setError('');
      })
      .catch((err) => {
        if (err?.response?.status === 403) setSinPermiso(true);
        else setError('No se pudo cargar tus productos.');
      })
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, pagina, filtroCategoria, filtroEstado, busqueda]);

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    API.get('catalogo/categorias/').then((res) => setCategorias(res.data)).catch(() => {});
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/productos" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  if (!cargando && sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Boxes className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "gestionar_productos" para publicar productos de tu empresa.
          Pídele al dueño de la cuenta que te lo asigne.
        </p>
      </div>
    );
  }

  function buscar(e) {
    e.preventDefault();
    setPagina(1);
    setBusqueda(q);
  }

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO);
    setErrorForm('');
    setNuevaImagenUrl('');
    setRecienCreado(false);
    setMostrarForm(true);
  }

  function abrirEdicion(p) {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      sku: p.sku || '',
      precio: p.precio,
      precio_descuento: p.precio_descuento ?? '',
      estado: p.estado,
      categoria: p.categoria ?? '',
    });
    setErrorForm('');
    setNuevaImagenUrl('');
    setRecienCreado(false);
    setMostrarForm(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    const payload = {
      ...form,
      categoria: form.categoria || null,
      precio_descuento: form.precio_descuento === '' ? null : form.precio_descuento,
    };
    try {
      if (editando) {
        await API.patch(`catalogo/mis-productos/${editando.id}/`, payload);
        setMostrarForm(false);
      } else {
        // En vez de cerrar el modal, seguimos editando el producto recién
        // creado — así se puede agregar imágenes (y pedir la sugerencia de
        // categoría por IA, que necesita una imagen) sin tener que volver
        // a abrirlo aparte.
        const { data } = await API.post('catalogo/mis-productos/', payload);
        setEditando(data);
        setRecienCreado(true);
      }
      await cargarProductos();
    } catch (err) {
      const data = err?.response?.data || {};
      setErrorForm(data.precio_descuento?.[0] || data.nombre?.[0] || 'No se pudo guardar el producto.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar el producto "${p.nombre}"?`)) return;
    try {
      await API.delete(`catalogo/mis-productos/${p.id}/`);
      await cargarProductos();
    } catch {
      setError('No se pudo eliminar el producto.');
    }
  }

  async function agregarImagen() {
    if (!nuevaImagenUrl.trim() || !editando) return;
    try {
      const { data } = await API.post(`catalogo/mis-productos/${editando.id}/imagenes/`, { url: nuevaImagenUrl.trim() });
      setEditando((prev) => ({ ...prev, imagenes: [...prev.imagenes, data] }));
      setNuevaImagenUrl('');
    } catch {
      setErrorForm('No se pudo agregar la imagen.');
    }
  }

  async function subirImagen(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo || !editando) return;
    setSubiendoImagen(true);
    setErrorForm('');
    const formData = new FormData();
    formData.append('archivo', archivo);
    try {
      const { data } = await API.post(`catalogo/mis-productos/${editando.id}/imagenes/`, formData, {
        headers: { 'Content-Type': undefined },
      });
      setEditando((prev) => ({ ...prev, imagenes: [...prev.imagenes, data] }));
    } catch {
      setErrorForm('No se pudo subir la imagen.');
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function quitarImagen(imagenId) {
    if (!editando) return;
    try {
      await API.delete(`catalogo/mis-productos/${editando.id}/imagenes/${imagenId}/`);
      setEditando((prev) => ({ ...prev, imagenes: prev.imagenes.filter((im) => im.id !== imagenId) }));
    } catch {
      setErrorForm('No se pudo quitar la imagen.');
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Boxes className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis productos</h1>
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Nuevo producto
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU07 · Publica y administra los productos de tu empresa en el catálogo.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <form onSubmit={buscar} className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre..."
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button type="submit" className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700">
            <Search size={16} />
          </button>
        </form>
        <select
          value={filtroCategoria}
          onChange={(e) => { setFiltroCategoria(e.target.value); setPagina(1); }}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {ESTADOS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {cargando ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Cargando...</td></tr>
            ) : resultados.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Todavía no publicaste productos.</td></tr>
            ) : resultados.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="text-gray-800 dark:text-gray-200 font-medium">{p.nombre}</div>
                  {p.sku && <div className="text-xs text-gray-400 dark:text-gray-500">SKU {p.sku}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.categoria_nombre || '—'}</td>
                <td className="px-4 py-3">
                  {p.precio_descuento ? (
                    <>
                      <span className="font-medium text-red-600 dark:text-red-400">Bs {p.precio_descuento}</span>{' '}
                      <span className="text-xs text-gray-400 line-through">Bs {p.precio}</span>
                    </>
                  ) : (
                    <span className="text-gray-700 dark:text-gray-300">Bs {p.precio}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.stock}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeEstado(p.estado)}`}>{p.estado}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => abrirEdicion(p)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => eliminar(p)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
        <span>{total} productos en total</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1}
            className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft size={16} />
          </button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}
            className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 overflow-y-auto py-8" onClick={() => setMostrarForm(false)}>
          <form
            onSubmit={guardar}
            className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {recienCreado ? 'Producto publicado' : editando ? 'Editar producto' : 'Nuevo producto'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {recienCreado
                ? 'Ahora agrégale fotos — con al menos una puedes pedirle a la IA que te sugiera la categoría.'
                : !editando && 'Completa estos datos primero; al publicarlo vas a poder agregarle fotos y pedir la sugerencia de categoría con IA.'}
            </p>

            <div className="space-y-3">
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción"
                rows={2}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <select
                value={form.categoria}
                onChange={(e) => setForm((prev) => ({ ...prev, categoria: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>

              {editando && (
                <SugerenciaCategoriaIA
                  productoId={editando.id}
                  tieneImagenes={editando.imagenes.length > 0}
                  onAplicar={(categoriaId) => setForm((prev) => ({ ...prev, categoria: categoriaId }))}
                  url={`catalogo/mis-productos/${editando.id}/sugerir-categoria/`}
                />
              )}

              <div className="grid grid-cols-3 gap-2">
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precio}
                  onChange={(e) => setForm((prev) => ({ ...prev, precio: e.target.value }))}
                  placeholder="Precio"
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precio_descuento}
                  onChange={(e) => setForm((prev) => ({ ...prev, precio_descuento: e.target.value }))}
                  placeholder="Precio oferta"
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <input
                  value={form.sku}
                  onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                  placeholder="SKU"
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <select
                value={form.estado}
                onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value }))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {ESTADOS.filter((op) => op.value).map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>

              {editando && (
                <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Imágenes</p>

                  {editando.imagenes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {editando.imagenes.map((im) => (
                        <div key={im.id} className="relative">
                          <img src={im.url} alt="" className="h-16 w-16 rounded-md object-cover border border-gray-200 dark:border-gray-700" />
                          <button
                            type="button"
                            onClick={() => quitarImagen(im.id)}
                            className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-white hover:bg-red-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer mb-2">
                    <Upload size={14} /> {subiendoImagen ? 'Subiendo...' : 'Subir imagen desde tu computadora'}
                    <input type="file" accept="image/*" onChange={subirImagen} disabled={subiendoImagen} className="hidden" />
                  </label>

                  <div className="flex gap-2">
                    <input
                      value={nuevaImagenUrl}
                      onChange={(e) => setNuevaImagenUrl(e.target.value)}
                      placeholder="...o pega una URL de imagen"
                      className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                    <button type="button" onClick={agregarImagen} className="flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200">
                      <ImagePlus size={14} /> Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {errorForm && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{errorForm}</p>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {recienCreado ? 'Listo' : 'Cancelar'}
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Publicar producto'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
