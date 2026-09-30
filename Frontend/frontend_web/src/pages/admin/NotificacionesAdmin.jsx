import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Bell, Send } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esSuperAdmin } from '../../utils/roles';

const ROLES = [
  { value: 'TODOS', label: 'Todos los usuarios' },
  { value: 'COMPRADOR', label: 'Compradores' },
  { value: 'EMPRESA', label: 'Empresas (dueños)' },
  { value: 'EMPLEADO', label: 'Empleados' },
  { value: 'ADMIN', label: 'Personal de soporte' },
];

const VACIO = { rol: 'COMPRADOR', tipo: 'AVISO_GENERAL', titulo: '', mensaje: '', enlace: '' };

export default function NotificacionesAdmin() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState('');
  const [error, setError] = useState('');

  function cargarHistorial() {
    return API.get('notificaciones/admin/notificaciones/').then((res) => setHistorial(res.data)).catch(() => {});
  }

  useEffect(() => {
    if (!usuario || !esSuperAdmin(usuario)) return;
    cargarHistorial();
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/admin/notificaciones" replace />;
  if (!esSuperAdmin(usuario)) return <Navigate to="/" replace />;

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    setResultado('');
    try {
      const { data } = await API.post('notificaciones/admin/enviar/', form);
      setResultado(`Enviada a ${data.destinatarios} usuario(s).`);
      setForm((prev) => ({ ...prev, titulo: '', mensaje: '', enlace: '' }));
      await cargarHistorial();
    } catch (err) {
      setError(err?.response?.data?.non_field_errors?.[0] || 'No se pudo enviar la notificación.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="text-brand-600 dark:text-brand-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notificaciones del sistema</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">CU23 · Envía avisos a todo un rol de usuarios de una sola vez.</p>

      <form onSubmit={enviar} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3 mb-8">
        <select value={form.rol} onChange={(e) => setForm((prev) => ({ ...prev, rol: e.target.value }))} className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300">
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <input required value={form.titulo} onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))} placeholder="Título" className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
        <textarea required value={form.mensaje} onChange={(e) => setForm((prev) => ({ ...prev, mensaje: e.target.value }))} placeholder="Mensaje" rows={3} className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
        <input value={form.enlace} onChange={(e) => setForm((prev) => ({ ...prev, enlace: e.target.value }))} placeholder="Enlace (opcional, ej: /productos)" className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />

        {resultado && <p className="text-xs text-green-600 dark:text-green-400">{resultado}</p>}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={enviando} className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          <Send size={14} /> {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Historial reciente</h2>
      <div className="space-y-2">
        {historial.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Sin notificaciones enviadas todavía.</p>
        ) : historial.slice(0, 30).map((n) => (
          <div key={n.id} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.titulo}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(n.creado_en).toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{n.mensaje}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{n.usuario_email} · {n.leido ? 'Leída' : 'No leída'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
