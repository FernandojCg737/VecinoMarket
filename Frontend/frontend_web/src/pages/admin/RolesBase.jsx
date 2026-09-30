import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Plus, Trash2 } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esSuperAdmin } from '../../utils/roles';

export default function RolesBase() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');

  function cargar() {
    Promise.all([API.get('usuarios/roles-base/'), API.get('usuarios/permisos/')])
      .then(([rolesRes, permisosRes]) => {
        setRoles(rolesRes.data);
        setPermisos(permisosRes.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar la información de roles.'));
  }

  useEffect(() => {
    if (!usuario || !esSuperAdmin(usuario)) return;
    cargar();
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/roles" replace />;
  if (!esSuperAdmin(usuario)) return <Navigate to="/" replace />;

  async function crearRol(e) {
    e.preventDefault();
    if (!nombreNuevo.trim()) return;
    setCreando(true);
    setError('');
    try {
      await API.post('usuarios/roles-base/', { nombre: nombreNuevo.trim() });
      setNombreNuevo('');
      cargar();
    } catch (err) {
      setError(err?.response?.data?.nombre?.[0] || 'No se pudo crear el rol.');
    } finally {
      setCreando(false);
    }
  }

  async function eliminarRol(rol) {
    try {
      await API.delete(`usuarios/roles-base/${rol.id}/`);
      setRoles((prev) => prev.filter((r) => r.id !== rol.id));
    } catch {
      setError('No se pudo eliminar el rol.');
    }
  }

  async function togglePermiso(rol, permiso) {
    const tiene = rol.permisos.some((p) => p.id === permiso.id);
    try {
      const { data } = tiene
        ? await API.delete(`usuarios/roles-base/${rol.id}/permisos/${permiso.id}/`)
        : await API.post(`usuarios/roles-base/${rol.id}/permisos/${permiso.id}/`);
      setRoles((prev) => prev.map((r) => (r.id === rol.id ? data : r)));
    } catch {
      setError('No se pudo actualizar el permiso.');
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Roles y permisos base</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Roles administrativos globales de la plataforma y los permisos que incluye cada uno (CU24 / T054-T055).
      </p>

      <form onSubmit={crearRol} className="flex gap-2 mb-6">
        <input
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Nombre del nuevo rol (ej. Soporte técnico)"
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <button
          type="submit"
          disabled={creando}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus size={16} /> Crear rol
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      <div className="space-y-4">
        {roles.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No hay roles base creados todavía.</p>
        ) : roles.map((rol) => (
          <div key={rol.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{rol.nombre}</h2>
              <button
                onClick={() => eliminarRol(rol)}
                className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                <Trash2 size={14} /> Eliminar rol
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {permisos.map((permiso) => {
                const activo = rol.permisos.some((p) => p.id === permiso.id);
                return (
                  <button
                    key={permiso.id}
                    onClick={() => togglePermiso(rol, permiso)}
                    title={permiso.descripcion}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      activo
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {permiso.codigo}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
