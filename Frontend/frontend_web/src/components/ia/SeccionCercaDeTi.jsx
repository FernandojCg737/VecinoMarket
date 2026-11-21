import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation } from 'lucide-react';
import { formatoKm, obtenerCercanos } from '../../api/ia';
import { useAuth } from '../../context/AuthContext';
import { esComprador } from '../../utils/roles';
import ProductCard from '../product/ProductCard';

// CU2 (RF45) en el Home. No pide el GPS al abrir la portada: el comprador ve
// lo cercano a su ubicación guardada; el invitado (o quien no tiene
// ubicación guardada) ve una invitación a /cerca-de-ti, donde sí se pide.
export default function SeccionCercaDeTi({ limite = 4 }) {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const comprador = esComprador(usuario);
  const [datos, setDatos] = useState(null);
  const [sinDatos, setSinDatos] = useState(false);

  useEffect(() => {
    if (cargandoAuth || !comprador) return;
    let vigente = true;
    obtenerCercanos({ radioKm: 5, limite })
      .then((res) => {
        if (vigente) setDatos(res);
      })
      .catch(() => {
        if (vigente) setSinDatos(true);
      });
    return () => {
      vigente = false;
    };
  }, [comprador, cargandoAuth, limite]);

  if (cargandoAuth) return null;

  if (!comprador || sinDatos || (datos && datos.productos.length === 0)) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 dark:bg-gray-800 text-brand-600 dark:text-brand-400">
            <MapPin size={22} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Descubre emprendedores cerca de ti</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Productos con stock en tiendas de tu barrio, en un radio de 2, 5 o 10 km.</p>
          </div>
        </div>
        <Link
          to="/cerca-de-ti"
          className="flex items-center justify-center gap-1.5 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 shrink-0"
        >
          <Navigation size={14} /> Ver qué hay cerca
        </Link>
      </div>
    );
  }

  if (!datos) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
          <MapPin size={20} className="text-brand-600 dark:text-brand-400" /> Cerca de ti
        </h2>
        <Link to="/cerca-de-ti" className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
          Ver mapa
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {datos.productos.map((p) => (
          <ProductCard key={p.id} producto={p} insignia={{ texto: formatoKm(p.distanciaKm), icono: MapPin }} nota={p.sucursal.direccion || p.sucursal.nombre} />
        ))}
      </div>
    </section>
  );
}
