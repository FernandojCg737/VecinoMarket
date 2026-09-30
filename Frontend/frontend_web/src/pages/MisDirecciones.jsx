import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Plus, Pencil, Trash2, Star, Crosshair } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { esComprador } from '../utils/roles';

// El bundler no resuelve los íconos por defecto de Leaflet — se apuntan
// directo al CDN de unpkg (mismo paquete, mismas versiones que node_modules).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LA_PAZ = { lat: -16.5, lon: -68.15 };

const VACIO = { alias: '', direccion_texto: '', departamento: '', ciudad: '', es_predeterminada: false };

function SelectorDeMapa({ posicion, onCambiar }) {
  useMapEvents({
    click(e) {
      onCambiar({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return <Marker position={[posicion.lat, posicion.lon]} />;
}

export default function MisDirecciones() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [direcciones, setDirecciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [posicion, setPosicion] = useState(LA_PAZ);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [buscandoGps, setBuscandoGps] = useState(false);

  function cargarDirecciones() {
    setCargando(true);
    return API.get('usuarios/mis-direcciones/')
      .then((res) => {
        setDirecciones(res.data);
        setError('');
      })
      .catch(() => setError('No se pudo cargar tus direcciones.'))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    if (!usuario || !esComprador(usuario)) return;
    cargarDirecciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (cargandoAuth) return null;
  if (!usuario) return <Navigate to="/login?next=/mis-direcciones" replace />;
  if (!esComprador(usuario)) return <Navigate to="/" replace />;

  function abrirNueva() {
    setEditando(null);
    setForm(VACIO);
    setPosicion(LA_PAZ);
    setErrorForm('');
    setMostrarForm(true);
  }

  function abrirEdicion(d) {
    setEditando(d);
    setForm({
      alias: d.alias, direccion_texto: d.direccion_texto,
      departamento: d.departamento, ciudad: d.ciudad, es_predeterminada: d.es_predeterminada,
    });
    setPosicion({ lat: d.latitud ?? LA_PAZ.lat, lon: d.longitud ?? LA_PAZ.lon });
    setErrorForm('');
    setMostrarForm(true);
  }

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setErrorForm('Tu navegador no soporta geolocalización.');
      return;
    }
    setBuscandoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosicion({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setBuscandoGps(false);
      },
      () => {
        setErrorForm('No se pudo obtener tu ubicación. Márcala en el mapa.');
        setBuscandoGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm('');
    const payload = { ...form, lat: posicion.lat, lon: posicion.lon };
    try {
      if (editando) {
        await API.patch(`usuarios/mis-direcciones/${editando.id}/`, payload);
      } else {
        await API.post('usuarios/mis-direcciones/', payload);
      }
      setMostrarForm(false);
      await cargarDirecciones();
    } catch (err) {
      setErrorForm(err?.response?.data?.direccion_texto?.[0] || 'No se pudo guardar la dirección.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(d) {
    if (!window.confirm(`¿Eliminar la dirección "${d.alias || d.direccion_texto}"?`)) return;
    try {
      await API.delete(`usuarios/mis-direcciones/${d.id}/`);
      await cargarDirecciones();
    } catch {
      setError('No se pudo eliminar la dirección.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <MapPin className="text-brand-600 dark:text-brand-400" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis direcciones</h1>
        </div>
        <button
          onClick={abrirNueva}
          className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Nueva dirección
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        CU13 · Marca tu ubicación en el mapa o usa tu GPS para que las empresas sepan dónde entregarte.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : direcciones.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Todavía no registraste ninguna dirección.</p>
      ) : (
        <div className="space-y-3">
          {direcciones.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{d.alias || 'Dirección'}</span>
                  {d.es_predeterminada && (
                    <span className="flex items-center gap-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-semibold">
                      <Star size={10} fill="currentColor" /> Predeterminada
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{d.direccion_texto}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">{d.ciudad}{d.departamento ? `, ${d.departamento}` : ''}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => abrirEdicion(d)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => eliminar(d)}
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
            className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editando ? 'Editar dirección' : 'Nueva dirección'}
            </h2>

            <div className="space-y-3">
              <input
                required
                value={form.alias}
                onChange={(e) => setForm((prev) => ({ ...prev, alias: e.target.value }))}
                placeholder='Alias (ej. "Casa", "Trabajo")'
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                required
                value={form.direccion_texto}
                onChange={(e) => setForm((prev) => ({ ...prev, direccion_texto: e.target.value }))}
                placeholder="Calle, número, zona"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.ciudad}
                  onChange={(e) => setForm((prev) => ({ ...prev, ciudad: e.target.value }))}
                  placeholder="Ciudad"
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <input
                  value={form.departamento}
                  onChange={(e) => setForm((prev) => ({ ...prev, departamento: e.target.value }))}
                  placeholder="Departamento"
                  className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Ubicación en el mapa</label>
                  <button
                    type="button"
                    onClick={usarMiUbicacion}
                    disabled={buscandoGps}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 disabled:opacity-60"
                  >
                    <Crosshair size={12} /> {buscandoGps ? 'Buscando...' : 'Usar mi ubicación (GPS)'}
                  </button>
                </div>
                <div className="h-56 rounded-md overflow-hidden border border-gray-300 dark:border-gray-700">
                  <MapContainer center={[posicion.lat, posicion.lon]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <SelectorDeMapa posicion={posicion} onCambiar={setPosicion} />
                  </MapContainer>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Haz clic en el mapa para marcar el punto exacto.</p>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.es_predeterminada}
                  onChange={(e) => setForm((prev) => ({ ...prev, es_predeterminada: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                Marcar como predeterminada
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
