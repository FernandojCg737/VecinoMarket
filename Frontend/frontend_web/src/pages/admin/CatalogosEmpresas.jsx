import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Store, Search, ArrowLeft, Boxes, Layers, Plus, Pencil, Trash2, X, ImagePlus, Upload,
} from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';
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

export default function CatalogosEmpresas() {
  const { usuario, cargando: cargandoAuth } = useAuth();

  const [empresas, setEmpresas] = useState([]);
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [error, setError] = useState('');

  const [empresaSel, setEmpresaSel] = useState(null);

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [qProducto, setQProducto] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [nuevaImagenUrl, setNuevaImagenUrl] = useState('');
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  function cargarEmpresas() {
    setCargandoEmpresas(true);
    return API.get('catalogo/admin/catalogos-empresas/', { params: { q: busqueda || undefined } })
      .then((res) => {
        setEmpresas(res.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar el catálogo de empresas.'))
      .finally(() => setCargandoEmpresas(false));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargarEmpresas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, busqueda]);

  function cargarProductos() {
    if (!empresaSel) return;
    return API.get('catalogo/admin/productos/', {
      params: {
        empresa: empresaSel.id,
        categoria: filtroCategoria || undefined,
        estado: filtroEstado || undefined,
        q: busquedaProducto || undefined,
        page_size: 200,
      },
    })
      .then((res) => setProductos(res.data.results))
      .catch(() => setError('No se pudo cargar los productos de la empresa.'));
  }

  useEffect(() => {
    if (!empresaSel) return;
    cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaSel, filtroCategoria, filtroEstado, busquedaProducto]);

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    API.get('catalogo/admin/categorias/').then((res) => setCategorias(res.data)).catch(() => {});
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/catalogo" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  function buscarEmpresa(e) {
    e.preventDefault();
    setBusqueda(q);
  }

  function abrirEmpresa(e) {
    setEmpresaSel(e);
    setFiltroCategoria('');
    setFiltroEstado('');
    setQProducto('');
    setBusquedaProducto('');
  }

  function volverAEmpresas() {
    setEmpresaSel(null);
    setProductos([]);
    cargarEmpresas();
  }

  function buscarProducto(e) {
    e.preventDefault();
    setBusquedaProducto(qProducto);
  }

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO);
    setErrorForm('');
    setNuevaImagenUrl('');
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
    setMostrarForm(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    const payload = {
      ...form,
      empresa: empresaSel.id,
      categoria: form.categoria || null,
      precio_descuento: form.precio_descuento === '' ? null : form.precio_descuento,
    };
    try {
      if (editando) {
        await API.patch(`catalogo/admin/productos/${editando.id}/`, payload);
      } else {
        await API.post('catalogo/admin/productos/', payload);
      }
      setMostrarForm(false);
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
      await API.delete(`catalogo/admin/productos/${p.id}/`);
      await cargarProductos();
    } catch {
      setError('No se pudo eliminar el producto.');
    }
  }

  async function agregarImagen() {
    if (!nuevaImagenUrl.trim() || !editando) return;
    try {
      const { data } = await API.post(`catalogo/admin/productos/${editando.id}/imagenes/`, { url: nuevaImagenUrl.trim() });
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
      const { data } = await API.post(`catalogo/admin/productos/${editando.id}/imagenes/`, formData, {
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
      await API.delete(`catalogo/admin/productos/${editando.id}/imagenes/${imagenId}/`);
      setEditando((prev) => ({ ...prev, imagenes: prev.imagenes.filter((im) => im.id !== imagenId) }));
    } catch {
      setErrorForm('No se pudo quitar la imagen.');
    }
  }

  if (empresaSel) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <button
          onClick={volverAEmpresas}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 mb-4"
        >
          <ArrowLeft size={16} /> Volver a empresas
        </button>

        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Store className="text-brand-600 dark:text-brand-400" size={24} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{empresaSel.razon_social}</h1>
          </div>
          <button
            onClick={abrirNuevo}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Nuevo producto
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          CU05 · Catálogo de esta empresa — ver, buscar, editar y eliminar sus productos.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
          + CU08 · Categorizar Producto mediante Visión Artificial (al editar un producto con imagen)
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <form onSubmit={buscarProducto} className="flex items-center gap-2">
            <input
              value={qProducto}
              onChange={(e) => setQProducto(e.target.value)}
              placeholder="Buscar por nombre..."
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <button type="submit" className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700">
              <Search size={16} />
            </button>
          </form>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
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
              {productos.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Sin productos.</td></tr>
              ) : productos.map((p) => (
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

        {mostrarForm && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 overflow-y-auto py-8" onClick={() => setMostrarForm(false)}>
            <form
              onSubmit={guardar}
              className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {editando ? 'Editar producto' : 'Nuevo producto'} · {empresaSel.razon_social}
              </h2>

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Store className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Catálogos de empresas</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        CU05 · Busca una empresa para ver, buscar, editar y eliminar los productos de su catálogo.
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
        + CU08 · Categorizar Producto mediante Visión Artificial (al editar un producto con imagen)
      </p>

      <form onSubmit={buscarEmpresa} className="flex items-center gap-2 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar empresa por razón social..."
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <button type="submit" className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-white hover:bg-brand-700">
          <Search size={16} />
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargandoEmpresas ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : empresas.length === 0 ? (
        <p className="text-sm text-gray-400">No se encontraron empresas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {empresas.map((e) => (
            <button
              key={e.id}
              onClick={() => abrirEmpresa(e)}
              className="text-left rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3 mb-3">
                {e.logo_url ? (
                  <img src={e.logo_url} alt="" className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                    <Store size={18} />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{e.razon_social}</div>
                  {e.ciudad && <div className="text-xs text-gray-400 dark:text-gray-500">{e.ciudad}</div>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><Boxes size={14} /> {e.total_productos} productos</span>
                <span className="flex items-center gap-1"><Layers size={14} /> {e.categorias_distintas} categorías</span>
              </div>
              <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">{e.productos_activos} activos</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
