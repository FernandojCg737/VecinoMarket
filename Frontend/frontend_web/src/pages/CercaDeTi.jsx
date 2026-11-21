import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Store, Star, Home as HomeIcon } from 'lucide-react';
import { esErrorSinUbicacion, formatoKm, formatoNumero, obtenerCercanos } from '../api/ia';
import { useAuth } from '../context/AuthContext';
import { esComprador } from '../utils/roles';
import ProductCard from '../components/product/ProductCard';

const RADIOS = [2, 5, 10];

// Pin ámbar (brand) con el mismo trazo que el ícono MapPin de lucide.
const PIN_SUCURSAL = L.divIcon({
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 29],
  popupAnchor: [0, -26],
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#e09b06" stroke="#815903" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#ffffff"/></svg>`,
});

// Ajusta el encuadre al círculo del radio cada vez que cambia el centro o el radio.
function EncuadrarRadio({ lat, lng, radioKm }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLng(lat, lng).toBounds(radioKm * 2000), { padding: [16, 16] });
  }, [map, lat, lng, radioKm]);
  return null;
}

function obtenerPosicionGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('sin_soporte'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

export default function CercaDeTi() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [radioKm, setRadioKm] = useState(5);
  const [gps, setGps] = useState({ estado: 'buscando', coords: null }); // buscando | ok | no_disponible
  const [intentoGps, setIntentoGps] = useState(0);
  const [datos, setDatos] = useState(null);
  const [respondida, setRespondida] = useState(null); // clave de la última consulta respondida
  const [error, setError] = useState('');
  const [sinUbicacion, setSinUbicacion] = useState(false);

  // Se pide al abrir la página y cada vez que el usuario toca "usar GPS".
  useEffect(() => {
    let vigente = true;
    obtenerPosicionGps()
      .then((coords) => vigente && setGps({ estado: 'ok', coords }))
      .catch(() => vigente && setGps({ estado: 'no_disponible', coords: null }));
    return () => {
      vigente = false;
    };
  }, [intentoGps]);

  function pedirGps() {
    setGps({ estado: 'buscando', coords: null });
    setIntentoGps((n) => n + 1);
  }

  // Con GPS: lat/lng del navegador. Sin GPS: el backend usa la ubicación
  // guardada del comprador (o responde SIN_UBICACION).
  const clave = `${gps.coords?.lat}|${gps.coords?.lng}|${radioKm}`;
  const cargando = respondida !== clave;
  useEffect(() => {
    if (cargandoAuth || gps.estado === 'buscando') return;
    let vigente = true;
    obtenerCercanos({ ...(gps.coords || {}), radioKm })
      .then((res) => {
        if (!vigente) return;
        setDatos(res);
        setError('');
        setSinUbicacion(false);
      })
      .catch((err) => {
        if (!vigente) return;
        if (esErrorSinUbicacion(err)) setSinUbicacion(true);
        else setError('No se pudo cargar lo que hay cerca de ti.');
      })
      .finally(() => vigente && setRespondida(clave));
    return () => {
      vigente = false;
    };
  }, [gps, radioKm, cargandoAuth, clave]);

  const centro = datos ? [datos.ubicacion.lat, datos.ubicacion.lng] : null;
  const usandoGps = datos?.ubicacion.fuente === 'dispositivo';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 dark:bg-gray-800 text-brand-600 dark:text-brand-400">
            <MapPin size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cerca de ti</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              CU21 · RF45 · Productos y emprendedores cercanos según tu ubicación y tus preferencias
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {datos && (usandoGps ? (
            <span className="flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300">
              <Navigation size={14} /> Usando tu ubicación actual
            </span>
          ) : (
            <button
              type="button"
              onClick={pedirGps}
              title="Volver a intentar con la ubicación del navegador"
              className="flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <HomeIcon size={14} /> Usando tu dirección guardada · <span className="text-brand-600 dark:text-brand-400">usar GPS</span>
            </button>
          ))}
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">Radio:</span>
          {RADIOS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadioKm(r)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                r === radioKm
                  ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-gray-800 dark:text-brand-300'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {sinUbicacion ? (
        <div className="mx-auto max-w-xl text-center py-16">
          <MapPin className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Necesitamos tu ubicación</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Activa la ubicación de tu navegador
            {esComprador(usuario) ? ' o registra una dirección predeterminada' : ' o inicia sesión con una cuenta que tenga una dirección guardada'}
            {' '}para ver qué hay cerca de ti.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={pedirGps} className="flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              <Navigation size={14} /> Usar mi ubicación
            </button>
            <Link
              to={esComprador(usuario) ? '/mis-direcciones' : '/login?next=/cerca-de-ti'}
              className="rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {esComprador(usuario) ? 'Mis direcciones' : 'Iniciar sesión'}
            </Link>
          </div>
        </div>
      ) : !datos ? (
        <p className="text-sm text-gray-400">{gps.estado === 'buscando' ? 'Buscando tu ubicación...' : 'Cargando...'}</p>
      ) : (
        <div className={`space-y-8 transition-opacity ${cargando ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 relative h-80 lg:h-[420px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 z-0">
              <MapContainer center={centro} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <EncuadrarRadio lat={centro[0]} lng={centro[1]} radioKm={radioKm} />
                <Circle center={centro} radius={radioKm * 1000} pathOptions={{ color: '#3b82f6', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.12 }} />
                <CircleMarker center={centro} radius={8} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }} />
                {datos.emprendedores.flatMap((e) =>
                  e.sucursales.map((s) => (
                    <Marker key={s.id} position={[s.lat, s.lng]} icon={PIN_SUCURSAL}>
                      <Popup>
                        <strong>{e.empresa.razon_social}</strong>
                        <br />
                        {s.nombre} · {formatoKm(s.distancia_km)}
                      </Popup>
                    </Marker>
                  )),
                )}
              </MapContainer>
              <span className="absolute bottom-3 left-3 z-[400] rounded-md border border-gray-200 bg-white/95 px-2.5 py-1 text-xs text-gray-600">
                Sucursales activas con stock
              </span>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Emprendedores cercanos</h2>
              {datos.emprendedores.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No hay emprendedores en {radioKm} km. Prueba un radio mayor.</p>
              ) : (
                <div className="space-y-2.5 lg:max-h-[350px] lg:overflow-y-auto pr-1">
                  {datos.emprendedores.map((e) => (
                    <Link
                      key={e.empresa.id}
                      to={`/productos?empresa=${e.empresa.id}&empresaNombre=${encodeURIComponent(e.empresa.razon_social)}`}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-3 hover:border-brand-400 dark:hover:border-brand-500 transition"
                    >
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 dark:bg-gray-800 text-brand-600 dark:text-brand-400">
                        <Store size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{e.empresa.razon_social}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                          {e.categoria_principal}
                          {e.reputacion.promedio != null && (
                            <>
                              {e.categoria_principal && ' · '}
                              <Star size={11} className="fill-current" /> {formatoNumero(e.reputacion.promedio, 1)}
                            </>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">{formatoKm(e.distancia_km)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Productos cerca de ti</h2>
            {datos.productos.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
                <p className="text-sm text-gray-500 dark:text-gray-400">No encontramos productos con stock en {radioKm} km.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {datos.productos.map((p) => (
                  <ProductCard
                    key={p.id}
                    producto={p}
                    insignia={{ texto: formatoKm(p.distanciaKm), icono: MapPin }}
                    nota={p.sucursal.direccion || p.sucursal.nombre}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
