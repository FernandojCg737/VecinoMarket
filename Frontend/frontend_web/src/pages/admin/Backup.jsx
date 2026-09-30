import { useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DatabaseBackup, Download, Upload, AlertTriangle } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esSuperAdmin } from '../../utils/roles';

function nombreDesdeCabecera(cabecera, respaldo) {
  const match = /filename="?([^"]+)"?/.exec(cabecera || '');
  return match ? match[1] : respaldo;
}

export default function Backup() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [descargando, setDescargando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/backup" replace />;
  if (!esSuperAdmin(usuario)) return <Navigate to="/" replace />;

  async function descargarBackup() {
    setDescargando(true);
    setError('');
    setMensaje('');
    try {
      const res = await API.get('core/backup/', { responseType: 'blob' });
      const nombre = nombreDesdeCabecera(res.headers['content-disposition'], 'vecinomarket_backup.json');
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      setMensaje('Respaldo descargado correctamente.');
    } catch {
      setError('No se pudo generar el respaldo.');
    } finally {
      setDescargando(false);
    }
  }

  async function restaurarBackup(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!window.confirm(`¿Restaurar el sistema desde "${archivo.name}"? Esto agrega/actualiza datos en la base actual.`)) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setRestaurando(true);
    setError('');
    setMensaje('');
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      const res = await API.post('core/restore/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMensaje(res.data?.detail || 'Respaldo restaurado correctamente.');
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo restaurar el respaldo.');
    } finally {
      setRestaurando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <DatabaseBackup className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          <span className="text-brand-600 dark:text-brand-400">CU28:</span> Copias de Seguridad y Restauración
        </h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Copia de seguridad y restauración de todo el sistema (exclusivo del SuperAdmin).
      </p>

      {mensaje && (
        <p className="mb-4 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 text-sm">
          {mensaje}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 text-sm">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Descargar respaldo</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Genera un archivo JSON con todos los datos del sistema (usuarios, empresas, catálogo, pedidos, etc.).
        </p>
        <button
          onClick={descargarBackup}
          disabled={descargando}
          className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Download size={16} /> {descargando ? 'Generando...' : 'Descargar backup'}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Restaurar desde un respaldo</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Sube un archivo generado con "Descargar backup" para restaurar sus datos.
        </p>
        <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400 mb-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          No borra lo que ya existe en la base actual — agrega o actualiza (por ID) lo que venga en el archivo.
        </p>
        <label className="flex w-fit items-center gap-2 rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-60">
          <Upload size={16} /> {restaurando ? 'Restaurando...' : 'Elegir archivo y restaurar'}
          <input
            ref={inputRef}
            type="file"
            accept="application/json"
            className="hidden"
            disabled={restaurando}
            onChange={restaurarBackup}
          />
        </label>
      </div>
    </div>
  );
}
