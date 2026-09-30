import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Bot, Plus, Pencil, Trash2 } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { esEmpresaOEmpleado } from '../../utils/roles';

const VACIO = { palabras_clave: '', pregunta_ejemplo: '', respuesta: '' };

export default function MisFaqsChatbot() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [faqs, setFaqs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  function cargar() {
    setCargando(true);
    return API.get('comunicacion/mis-faqs-chatbot/')
      .then((res) => {
        setFaqs(res.data);
        setError('');
      })
      .catch((err) => {
        if (err?.response?.status === 403) setSinPermiso(true);
        else setError('No se pudo cargar tus preguntas frecuentes.');
      })
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!usuario || !esEmpresaOEmpleado(usuario)) return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mi-empresa/chatbot" replace />;
  if (!esEmpresaOEmpleado(usuario)) return <Navigate to="/" replace />;

  if (!cargando && sinPermiso) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Bot className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Sin acceso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No tienes el permiso "gestionar_chat" para configurar el chatbot de tu empresa.
          Pídele al dueño de la cuenta que te lo asigne.
        </p>
      </div>
    );
  }

  function abrirNueva() {
    setEditando(null);
    setForm(VACIO);
    setErrorForm('');
    setMostrarForm(true);
  }

  function abrirEdicion(f) {
    setEditando(f);
    setForm({ palabras_clave: f.palabras_clave, pregunta_ejemplo: f.pregunta_ejemplo, respuesta: f.respuesta });
    setErrorForm('');
    setMostrarForm(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    try {
      if (editando) {
        await API.patch(`comunicacion/mis-faqs-chatbot/${editando.id}/`, form);
      } else {
        await API.post('comunicacion/mis-faqs-chatbot/', form);
      }
      setMostrarForm(false);
      await cargar();
    } catch (err) {
      setErrorForm(err?.response?.data?.palabras_clave?.[0] || 'No se pudo guardar la pregunta frecuente.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(f) {
    if (!window.confirm(`¿Eliminar "${f.pregunta_ejemplo || f.palabras_clave}"?`)) return;
    try {
      await API.delete(`comunicacion/mis-faqs-chatbot/${f.id}/`);
      await cargar();
    } catch {
      setError('No se pudo eliminar.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Bot className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Chatbot de mi tienda</h1>
        </div>
        <button onClick={abrirNueva} className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
          <Plus size={16} /> Nueva pregunta
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU15 · Configura respuestas automáticas por palabras clave para que tus compradores se autoatiendan.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : faqs.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Todavía no configuraste ninguna pregunta frecuente.</p>
      ) : (
        <div className="space-y-3">
          {faqs.map((f) => (
            <div key={f.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{f.pregunta_ejemplo || '(sin pregunta de ejemplo)'}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Palabras clave: {f.palabras_clave}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">{f.respuesta}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => abrirEdicion(f)} className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => eliminar(f)} className="grid h-8 w-8 place-items-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 overflow-y-auto py-8" onClick={() => setMostrarForm(false)}>
          <form onSubmit={guardar} className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{editando ? 'Editar pregunta' : 'Nueva pregunta'}</h2>
            <div className="space-y-3">
              <input
                required
                value={form.palabras_clave}
                onChange={(e) => setForm((prev) => ({ ...prev, palabras_clave: e.target.value }))}
                placeholder="Palabras clave separadas por coma (ej: horario, hora, abierto)"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                value={form.pregunta_ejemplo}
                onChange={(e) => setForm((prev) => ({ ...prev, pregunta_ejemplo: e.target.value }))}
                placeholder="Pregunta de ejemplo (se muestra como sugerencia)"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <textarea
                required
                value={form.respuesta}
                onChange={(e) => setForm((prev) => ({ ...prev, respuesta: e.target.value }))}
                placeholder="Respuesta del chatbot"
                rows={3}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            {errorForm && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{errorForm}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setMostrarForm(false)} className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
