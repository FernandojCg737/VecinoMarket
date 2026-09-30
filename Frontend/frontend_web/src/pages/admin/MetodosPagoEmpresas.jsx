import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Wallet, Search, ArrowLeft, Store, Plus, Pencil, Trash2, Star, QrCode, Landmark, CreditCard, Upload,
} from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esStaff } from '../../utils/roles';

const TIPOS = [
  { value: 'QR', label: 'Código QR', icon: QrCode },
  { value: 'CUENTA_BANCARIA', label: 'Cuenta bancaria', icon: Landmark },
  { value: 'PASARELA', label: 'Pasarela de pago', icon: CreditCard },
];

const VACIO = {
  tipo: 'QR', nombre: '', banco: '', numero_cuenta: '', titular: '',
  proveedor_pasarela: '', referencia_pasarela: '', predeterminado: false,
};

function IconoTipo({ tipo, ...props }) {
  const Icono = TIPOS.find((t) => t.value === tipo)?.icon || Wallet;
  return <Icono {...props} />;
}

export default function MetodosPagoEmpresas() {
  const { usuario, cargando: cargandoAuth } = useAuth();

  const [empresas, setEmpresas] = useState([]);
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cargandoEmpresas, setCargandoEmpresas] = useState(true);
  const [error, setError] = useState('');

  const [empresaSel, setEmpresaSel] = useState(null);
  const [metodos, setMetodos] = useState([]);
  const [cargandoMetodos, setCargandoMetodos] = useState(false);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [archivoQr, setArchivoQr] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  function cargarEmpresas() {
    setCargandoEmpresas(true);
    return API.get('catalogo/admin/catalogos-empresas/', { params: { q: busqueda || undefined } })
      .then((res) => {
        setEmpresas(res.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar las empresas.'))
      .finally(() => setCargandoEmpresas(false));
  }

  useEffect(() => {
    if (!usuario || !esStaff(usuario)) return;
    cargarEmpresas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, busqueda]);

  function cargarMetodos() {
    if (!empresaSel) return;
    setCargandoMetodos(true);
    return API.get('facturacion/admin/metodos-pago/', { params: { empresa: empresaSel.id } })
      .then((res) => setMetodos(res.data))
      .catch(() => setError('No se pudo cargar los métodos de pago.'))
      .finally(() => setCargandoMetodos(false));
  }

  useEffect(() => {
    if (!empresaSel) return;
    cargarMetodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaSel]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/metodos-pago" replace />;
  if (!esStaff(usuario)) return <Navigate to="/" replace />;

  function buscarEmpresa(e) {
    e.preventDefault();
    setBusqueda(q);
  }

  function abrirEmpresa(e) {
    setEmpresaSel(e);
    setMetodos([]);
  }

  function volverAEmpresas() {
    setEmpresaSel(null);
    cargarEmpresas();
  }

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO);
    setArchivoQr(null);
    setErrorForm('');
    setMostrarForm(true);
  }

  function abrirEdicion(m) {
    setEditando(m);
    setForm({
      tipo: m.tipo,
      nombre: m.nombre,
      banco: m.banco || '',
      numero_cuenta: m.numero_cuenta || '',
      titular: m.titular || '',
      proveedor_pasarela: m.proveedor_pasarela || '',
      referencia_pasarela: m.referencia_pasarela || '',
      predeterminado: m.predeterminado,
    });
    setArchivoQr(null);
    setErrorForm('');
    setMostrarForm(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    const formData = new FormData();
    formData.append('empresa', empresaSel.id);
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));
    if (archivoQr) formData.append('imagen_qr', archivoQr);
    try {
      if (editando) {
        await API.patch(`facturacion/admin/metodos-pago/${editando.id}/`, formData, { headers: { 'Content-Type': undefined } });
      } else {
        await API.post('facturacion/admin/metodos-pago/', formData, { headers: { 'Content-Type': undefined } });
      }
      setMostrarForm(false);
      await cargarMetodos();
    } catch (err) {
      const data = err?.response?.data || {};
      setErrorForm(data.nombre?.[0] || data.tipo?.[0] || 'No se pudo guardar el método de pago.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(m) {
    if (!window.confirm(`¿Eliminar el método de pago "${m.nombre}"?`)) return;
    try {
      await API.delete(`facturacion/admin/metodos-pago/${m.id}/`);
      await cargarMetodos();
    } catch {
      setError('No se pudo eliminar el método de pago.');
    }
  }

  if (empresaSel) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button
          onClick={volverAEmpresas}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 mb-4"
        >
          <ArrowLeft size={16} /> Volver a empresas
        </button>

        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Wallet className="text-brand-600 dark:text-brand-400" size={24} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{empresaSel.razon_social}</h1>
          </div>
          <button
            onClick={abrirNuevo}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={16} /> Nuevo método
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          CU25 · Métodos de pago de esta empresa (QR, cuenta bancaria, pasarela).
        </p>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        {cargandoMetodos ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : metodos.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Esta empresa no tiene métodos de pago registrados.</p>
        ) : (
          <div className="space-y-3">
            {metodos.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  {m.tipo === 'QR' && m.imagen_qr_url ? (
                    <img src={m.imagen_qr_url} alt="" className="h-10 w-10 rounded-md object-cover border border-gray-200 dark:border-gray-700" />
                  ) : (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                      <IconoTipo tipo={m.tipo} size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{m.nombre}</span>
                      {m.predeterminado && (
                        <span className="flex items-center gap-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-semibold">
                          <Star size={10} fill="currentColor" /> Predeterminado
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {m.tipo === 'CUENTA_BANCARIA' && `${m.banco} · ${m.numero_cuenta} · ${m.titular}`}
                      {m.tipo === 'PASARELA' && `${m.proveedor_pasarela}${m.referencia_pasarela ? ` · ${m.referencia_pasarela}` : ''}`}
                      {m.tipo === 'QR' && TIPOS.find((t) => t.value === m.tipo)?.label}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => abrirEdicion(m)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => eliminar(m)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {mostrarForm && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 overflow-y-auto py-8" onClick={() => setMostrarForm(false)}>
            <form
              onSubmit={guardar}
              className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {editando ? 'Editar método de pago' : 'Nuevo método de pago'} · {empresaSel.razon_social}
              </h2>

              <div className="space-y-3">
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder='Nombre (ej. "QR BCP", "Cuenta Banco Unión")'
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />

                {form.tipo === 'QR' && (
                  <div>
                    {editando?.imagen_qr_url && !archivoQr && (
                      <img src={editando.imagen_qr_url} alt="" className="h-20 w-20 rounded-md object-cover border border-gray-200 dark:border-gray-700 mb-2" />
                    )}
                    <label className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-600 px-2 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <Upload size={14} /> {archivoQr ? archivoQr.name : 'Subir imagen del QR'}
                      <input type="file" accept="image/*" onChange={(e) => setArchivoQr(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                  </div>
                )}

                {form.tipo === 'CUENTA_BANCARIA' && (
                  <div className="space-y-2">
                    <input
                      value={form.banco}
                      onChange={(e) => setForm((prev) => ({ ...prev, banco: e.target.value }))}
                      placeholder="Banco"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                    <input
                      value={form.numero_cuenta}
                      onChange={(e) => setForm((prev) => ({ ...prev, numero_cuenta: e.target.value }))}
                      placeholder="Número de cuenta"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                    <input
                      value={form.titular}
                      onChange={(e) => setForm((prev) => ({ ...prev, titular: e.target.value }))}
                      placeholder="Titular de la cuenta"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>
                )}

                {form.tipo === 'PASARELA' && (
                  <div className="space-y-2">
                    <input
                      value={form.proveedor_pasarela}
                      onChange={(e) => setForm((prev) => ({ ...prev, proveedor_pasarela: e.target.value }))}
                      placeholder="Proveedor (ej. Stripe, PagoFácil)"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                    <input
                      value={form.referencia_pasarela}
                      onChange={(e) => setForm((prev) => ({ ...prev, referencia_pasarela: e.target.value }))}
                      placeholder="ID de cuenta/comercio (no credenciales secretas)"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={form.predeterminado}
                    onChange={(e) => setForm((prev) => ({ ...prev, predeterminado: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Marcar como predeterminado
                </label>
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
        <Wallet className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Métodos de pago de empresas</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU25 · Busca una empresa para ver, registrar, editar y eliminar sus métodos de pago (QR, cuenta bancaria, pasarela).
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
              <div className="flex items-center gap-3">
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
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
