import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DatabaseBackup, Download, Upload, AlertTriangle, Trash2, Cloud } from 'lucide-react';
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
  const [historial, setHistorial] = useState([]);
  const [horaBackup, setHoraBackup] = useState('');
  const [guardandoHora, setGuardandoHora] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (usuario && esSuperAdmin(usuario)) {
      cargarHistorial();
      cargarConfiguracion();
    }
  }, [usuario]);

  async function cargarHistorial() {
    try {
      const res = await API.get('core/backup/historial/');
      setHistorial(res.data);
    } catch (err) {
      console.error('Error al cargar historial', err);
    }
  }

  async function cargarConfiguracion() {
    try {
      const res = await API.get('core/backup/config/');
      if (res.data && res.data.hora_backup) {
        // backend devuelve "HH:MM:SS"
        setHoraBackup(res.data.hora_backup.slice(0, 5));
      }
    } catch (err) {
      console.error('Error al cargar configuración', err);
    }
  }

  async function guardarConfiguracion() {
    if (!horaBackup) return;
    setGuardandoHora(true);
    setMensaje('');
    setError('');
    try {
      await API.post('core/backup/config/', { hora_backup: horaBackup });
      setMensaje('Hora de backup automático actualizada.');
    } catch (err) {
      setError('Error al guardar la hora del backup.');
    } finally {
      setGuardandoHora(false);
    }
  }

  async function eliminarRespaldo(id) {
    if (!window.confirm('¿Seguro que deseas eliminar este registro de la nube?')) return;
    try {
      await API.delete(`core/backup/historial/${id}/`);
      setMensaje('Respaldo eliminado del historial.');
      cargarHistorial();
    } catch (err) {
      setError('Error al eliminar el respaldo.');
    }
  }

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
      cargarHistorial();
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
        timeout: 120000,
      });
      setMensaje(res.data?.detail || 'Respaldo restaurado correctamente.');
      cargarHistorial();
    } catch (err) {
      setError(err?.response?.data?.detail ||
        'No se pudo confirmar la restauración. Revisa la bitácora antes de volver a cargar el archivo.');
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
          disabled={descargando || restaurando}
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
            accept=".json,application/json"
            className="hidden"
            disabled={restaurando || descargando}
            onChange={restaurarBackup}
          />
        </label>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Configuración de Backups Automáticos</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Establece la hora a la que se realizarán los respaldos diarios automáticos.
        </p>
        <div className="flex items-center gap-3">
          <input 
            type="time" 
            value={horaBackup}
            onChange={(e) => setHoraBackup(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={guardarConfiguracion}
            disabled={guardandoHora}
            className="rounded-md bg-gray-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-60"
          >
            {guardandoHora ? 'Guardando...' : 'Guardar hora'}
          </button>
        </div>
      </div>

      {/* Panel de Historial */}
      <div className="mt-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Cloud size={18} className="text-brand-500" /> Historial en la Nube
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Copias de seguridad almacenadas, tanto manuales como automáticas.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">Fecha y Hora</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {historial.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-5 py-4 text-center text-gray-500">
                    No hay copias de seguridad registradas en la nube.
                  </td>
                </tr>
              ) : (
                historial.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-5 py-3">
                      {new Date(b.creado_en).toLocaleString('es-BO')}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.tipo === 'AUTOMATICO' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {b.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <a 
                          href={b.archivo} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                          title="Descargar"
                        >
                          <Download size={18} />
                        </a>
                        <button 
                          onClick={() => eliminarRespaldo(b.id)}
                          className="text-red-500 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
