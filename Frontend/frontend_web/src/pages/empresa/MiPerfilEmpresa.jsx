import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Building2, Save, Upload } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresa } from '../../utils/roles';

const inputClass = 'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function MiPerfilEmpresa() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  useEffect(() => {
    if (!usuario || !esEmpresa(usuario)) return;
    API.get('usuarios/mi-empresa/')
      .then((res) => setForm(res.data))
      .catch(() => setError('No se pudo cargar el perfil de tu empresa.'));
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/perfil" replace />;
  if (!esEmpresa(usuario)) return <Navigate to="/" replace />;

  async function subirLogo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setSubiendoLogo(true);
    setError('');
    const formData = new FormData();
    formData.append('archivo', archivo);
    try {
      const { data } = await API.post('usuarios/mi-empresa/logo/', formData, {
        headers: { 'Content-Type': undefined },
      });
      setForm((prev) => ({ ...prev, logo_url: data.logo_url }));
    } catch {
      setError('No se pudo subir el logo.');
    } finally {
      setSubiendoLogo(false);
    }
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    setGuardado(false);
    try {
      const { data } = await API.patch('usuarios/mi-empresa/', form);
      setForm(data);
      setGuardado(true);
    } catch (err) {
      setError(err?.response?.data?.razon_social?.[0] || 'No se pudo guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Perfil de mi empresa</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Edita la información pública de tu empresa. Para cambiar tu URL (slug) o reactivar tu cuenta, contacta al soporte.
      </p>

      {!form ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <form onSubmit={guardar} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Razón social</label>
              <input required value={form.razon_social} onChange={(e) => setForm((prev) => ({ ...prev, razon_social: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>NIT</label>
              <input value={form.nit} onChange={(e) => setForm((prev) => ({ ...prev, nit: e.target.value }))} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Logo</label>
            <div className="flex items-center gap-3">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="h-14 w-14 rounded-full object-cover border border-gray-200 dark:border-gray-700" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                  <Building2 size={20} />
                </div>
              )}
              <label className="flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <Upload size={14} /> {subiendoLogo ? 'Subiendo...' : 'Subir imagen'}
                <input type="file" accept="image/*" onChange={subirLogo} disabled={subiendoLogo} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className={labelClass}>Color de marca</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color_marca || '#D97706'}
                onChange={(e) => setForm((prev) => ({ ...prev, color_marca: e.target.value }))}
                className="h-9 w-12 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
              <input value={form.color_marca} onChange={(e) => setForm((prev) => ({ ...prev, color_marca: e.target.value }))} placeholder="#D97706" className={`${inputClass} flex-1`} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Descripción</label>
            <textarea rows={4} value={form.descripcion} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Departamento</label>
              <input value={form.departamento} onChange={(e) => setForm((prev) => ({ ...prev, departamento: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Ciudad</label>
              <input value={form.ciudad} onChange={(e) => setForm((prev) => ({ ...prev, ciudad: e.target.value }))} className={inputClass} />
            </div>
          </div>

          {guardado && <p className="text-sm text-green-600 dark:text-green-400">Cambios guardados.</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="submit" disabled={guardando} className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            <Save size={14} /> {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      )}
    </div>
  );
}
