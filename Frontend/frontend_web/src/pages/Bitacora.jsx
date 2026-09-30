import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ScrollText, ChevronLeft, ChevronRight, KeyRound, Monitor, Smartphone } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { esSuperAdmin } from '../utils/roles';

const ACCIONES = [
  { value: '', label: 'Todas las acciones' },
  { value: 'LOGIN', label: 'Ingresos (login)' },
  { value: 'LOGOUT', label: 'Salidas (logout)' },
  { value: 'CREAR', label: 'Crear' },
  { value: 'ACTUALIZAR', label: 'Actualizar' },
  { value: 'ELIMINAR', label: 'Eliminar' },
];

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Detecta si el user_agent corresponde a un dispositivo móvil. */
function detectarDispositivo(userAgent = '') {
  const ua = userAgent.toLowerCase();
  const esMobil =
    /android|iphone|ipad|ipod|mobile|webos|blackberry|windows phone|dart|flutter/i.test(ua);
  return esMobil ? 'MÓVIL' : 'WEB';
}

/** Extrae un texto legible desde el campo detalle (JSON). */
function extraerDetalle(detalle) {
  if (!detalle || typeof detalle !== 'object') return '—';
  // Si tiene un campo "descripcion" o "mensaje", mostrarlo directo
  if (detalle.descripcion) return detalle.descripcion;
  if (detalle.mensaje) return detalle.mensaje;
  if (detalle.detalle) return detalle.detalle;
  // Para logs de login, mostrar el email
  if (detalle.email) return `Inicio de sesión: ${detalle.email}`;
  // Fallback: serializar las primeras claves relevantes
  const ignorar = ['id', 'usuario_id'];
  const claves = Object.keys(detalle).filter((k) => !ignorar.includes(k)).slice(0, 2);
  return claves.map((k) => `${k}: ${detalle[k]}`).join(' · ') || '—';
}

/** Devuelve las clases de color de la pastilla según la acción. */
function accionClase(accion = '') {
  const a = accion.toUpperCase();
  if (a === 'LOGIN')     return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (a === 'LOGOUT')    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
  if (a.includes('CREAR') || a.includes('CREATE'))
                         return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  if (a.includes('ACTUALIZAR') || a.includes('UPDATE'))
                         return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
  if (a.includes('ELIMINAR') || a.includes('DELETE'))
                         return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  return 'bg-brand-50 dark:bg-gray-800 text-brand-700 dark:text-brand-400';
}

export default function Bitacora() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [resultados, setResultados] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [accion, setAccion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [llave, setLlave] = useState('');
  const [llaveIngresada, setLlaveIngresada] = useState('');

  const porPagina = 50;

  useEffect(() => {
    if (!usuario || !esSuperAdmin(usuario) || !llave) return;
    setCargando(true);
    API.get('auditoria/bitacora/', {
      params: { page: pagina, accion: accion || undefined },
      headers: { 'X-Developer-Key': llave },
    })
      .then((res) => {
        setResultados(res.data.results);
        setTotal(res.data.count);
        setError('');
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          setError('Llave de desarrollador incorrecta.');
          setLlave('');
        } else {
          setError('No se pudo cargar la bitácora.');
        }
      })
      .finally(() => setCargando(false));
  }, [usuario, pagina, accion, llave]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/bitacora" replace />;
  if (!esSuperAdmin(usuario)) return <Navigate to="/" replace />;

  /* ── Pantalla de llave ─────────────────────────────────────────────── */
  if (!llave) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <KeyRound className="mx-auto mb-3 text-brand-600 dark:text-brand-400" size={32} />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Bitácora confidencial</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Este contenido es confidencial incluso para el administrador de base de datos — ingresa la llave de
          desarrollador para verlo.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            setLlave(llaveIngresada);
          }}
          className="flex gap-2"
        >
          <input
            type="password"
            value={llaveIngresada}
            onChange={(e) => setLlaveIngresada(e.target.value)}
            placeholder="Llave de desarrollador"
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  /* ── Tabla principal ───────────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      {/* Encabezado */}
      <div className="flex items-center gap-2 mb-1">
        <ScrollText className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bitácora del sistema</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Registro de ingresos, salidas y acciones críticas de los usuarios (CU22).
      </p>

      {/* Filtro */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-600 dark:text-gray-400">Filtrar por:</label>
        <select
          value={accion}
          onChange={(e) => { setAccion(e.target.value); setPagina(1); }}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {ACCIONES.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Entidad</th>
              <th className="px-4 py-3">Fecha y Hora</th>
              <th className="px-4 py-3">Dispositivo</th>
              <th className="px-4 py-3">Dirección IP</th>
              <th className="px-4 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {cargando ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                  Cargando…
                </td>
              </tr>
            ) : resultados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                  No hay registros para este filtro.
                </td>
              </tr>
            ) : (
              resultados.map((r) => {
                const dispositivo = detectarDispositivo(r.user_agent);
                const esMobil = dispositivo === 'MÓVIL';
                return (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    {/* Usuario */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {r.usuario_nombre || (
                          <span className="text-gray-400 dark:text-gray-500 italic font-normal">Sistema</span>
                        )}
                      </span>
                      {r.usuario_email && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{r.usuario_email}</div>
                      )}
                    </td>

                    {/* Acción */}
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold tracking-wide ${accionClase(r.accion)}`}>
                        {r.accion}
                      </span>
                    </td>

                    {/* Entidad */}
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {r.entidad_afectada
                        ? `${r.entidad_afectada}${r.entidad_id ? ` #${r.entidad_id}` : ''}`
                        : '—'}
                    </td>

                    {/* Fecha y Hora */}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatearFecha(r.creado_en)}
                    </td>

                    {/* Dispositivo */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold ${
                        esMobil
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}>
                        {esMobil
                          ? <><Smartphone size={11} /> MÓVIL</>
                          : <><Monitor size={11} /> WEB</>
                        }
                      </span>
                    </td>

                    {/* Dirección IP */}
                    <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400 text-xs">
                      {r.ip_origen || '—'}
                    </td>

                    {/* Detalle */}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[240px]">
                      <span className="line-clamp-2 text-xs leading-relaxed">
                        {extraerDetalle(r.detalle)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
        <span>{total} registros en total</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina <= 1}
            className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={16} />
          </button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina >= totalPaginas}
            className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
