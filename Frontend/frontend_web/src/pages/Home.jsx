import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { obtenerProductos } from '../api/catalogo';
import { useCatalogo } from '../context/CatalogoContext';
import ProductCard from '../components/product/ProductCard';

const ICONOS_FLOTANTES = [
  { Icono: Icons.Camera, className: 'left-[6%] top-[18%] h-10 w-10 -rotate-6' },
  { Icono: Icons.Headphones, className: 'left-[14%] top-[62%] h-9 w-9 rotate-6' },
  { Icono: Icons.ShoppingBag, className: 'left-[4%] top-[42%] h-8 w-8 rotate-3' },
  { Icono: Icons.Watch, className: 'right-[6%] top-[20%] h-9 w-9 rotate-6' },
  { Icono: Icons.Gift, className: 'right-[13%] top-[60%] h-10 w-10 -rotate-6' },
  { Icono: Icons.Sparkles, className: 'right-[4%] top-[40%] h-8 w-8 -rotate-3' },
];

export default function Home() {
  const { categorias } = useCatalogo();
  const [productos, setProductos] = useState([]);
  const [bannerError, setBannerError] = useState(false);

  useEffect(() => {
    obtenerProductos().then(setProductos).catch(() => setProductos([]));
  }, []);

  // El backend ya ordena por más reciente primero, así que los primeros N ya
  // sirven como "recién agregados"; no hay valoración por producto en el
  // modelo real, así que ya no hay un criterio de "mejor valorado" posible.
  const recienAgregados = productos.slice(0, 8);
  const ofertas = productos.filter((p) => p.precio_descuento).slice(0, 8);

  return (
    <div>
      {/* Banner de ofertas: pon tu imagen en public/banner-ofertas.jpeg y aparece sola aquí.
          El contenedor mantiene la relación de aspecto real de la foto (2:1) en todos los
          tamaños, así nunca se recorta la mujer ni los productos de los costados — solo se
          achica proporcionalmente. El texto va superpuesto siempre, con tamaños "fluidos"
          (clamp) que escalan de forma continua con el ancho de pantalla, no a saltos. */}
      <section className="relative w-full aspect-[2/1] max-h-[480px] overflow-hidden bg-gray-100">
        {!bannerError ? (
          <img
            src="/banner-ofertas.jpeg"
            alt="Ofertas de VecinoMarket"
            onError={() => setBannerError(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-800">
            {ICONOS_FLOTANTES.map(({ Icono, className }, i) => (
              <Icono key={i} className={`hidden sm:block absolute text-white/15 ${className}`} />
            ))}
          </div>
        )}

        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-[clamp(0.25rem,1vw,0.75rem)] text-center px-[17%] ${
            bannerError ? 'text-white' : 'text-gray-900'
          }`}
        >
          <span
            className={`font-bold uppercase tracking-widest text-[clamp(0.6rem,1.8vw,0.875rem)] ${bannerError ? 'text-brand-50' : 'text-gray-500'}`}
          >
            Oferta por tiempo limitado
          </span>
          <h1 className="font-extrabold leading-tight text-[clamp(1.25rem,5vw,3rem)]">
            Ofertas <span className="text-brand-600">imbatibles</span>
          </h1>
          <p
            className={`max-w-lg leading-snug text-[clamp(0.65rem,2vw,1.125rem)] ${bannerError ? 'text-brand-50' : 'text-gray-600'}`}
          >
            Descubre los mejores productos de tu barrio a{' '}
            <strong className={bannerError ? 'text-white' : 'text-gray-900'}>precios</strong> que te van a encantar.
          </p>
          <Link
            to="/productos"
            className={`rounded-full font-semibold transition-colors text-[clamp(0.65rem,1.8vw,1rem)] px-[clamp(0.85rem,3vw,1.5rem)] py-[clamp(0.35rem,1.4vw,0.75rem)] ${
              bannerError
                ? 'bg-white text-brand-700 hover:bg-brand-50'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            Explorar productos
          </Link>
        </div>
      </section>

      {/* Categorías */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Comprar por categoría</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {categorias.map((cat) => {
            const Icono = Icons[cat.icono] || Icons.Package;
            return (
              <Link
                key={cat.id}
                to={`/productos?categoria=${cat.id}`}
                className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:p-4 text-center hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-all"
              >
                <span className="grid h-9 w-9 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-full bg-brand-50 dark:bg-gray-800 text-brand-600 dark:text-brand-400">
                  <Icono size={18} className="sm:hidden" />
                  <Icono size={22} className="hidden sm:block" />
                </span>
                <span className="text-[11px] sm:text-xs font-medium leading-snug text-gray-700 dark:text-gray-300">{cat.nombre}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Ofertas */}
      {ofertas.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ofertas destacadas</h2>
            <Link to="/productos" className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
              Ver todo
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {ofertas.map((p) => (
              <ProductCard key={p.id} producto={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recién agregados */}
      <section className="mx-auto max-w-7xl px-4 py-6 mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recién agregados</h2>
          <Link to="/productos" className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
            Ver todo
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {recienAgregados.map((p) => (
            <ProductCard key={p.id} producto={p} />
          ))}
        </div>
      </section>

      {/* Banner vender */}
      <section className="bg-green-700 dark:bg-green-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">¿Tienes un emprendimiento?</h2>
            <p className="text-green-50">Regístralo en VecinoMarket y llega a más clientes.</p>
          </div>
          <Link
            to="/solicitar-empresa"
            className="rounded-full bg-white px-6 py-3 font-semibold text-green-700 hover:bg-green-50 transition-colors shrink-0"
          >
            Solicitar cuenta de empresa
          </Link>
        </div>
      </section>
    </div>
  );
}
