import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu as MenuIcon, X, Radio } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCatalogo } from '../../context/CatalogoContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ExploreMenu from './ExploreMenu';
import DepartamentoMenu from './DepartamentoMenu';
import AccountMenu from './AccountMenu';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

export default function Header() {
  const [query, setQuery] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoOscuroError, setLogoOscuroError] = useState(false);
  const { totalItems } = useCart();
  const { categorias } = useCatalogo();
  const { tema } = useTheme();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const usarLogoOscuro = tema === 'dark' && !logoOscuroError;

  function buscar(e) {
    e.preventDefault();
    navigate(`/productos?q=${encodeURIComponent(query)}`);
    setMenuAbierto(false);
  }

  const campoBusqueda = (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Busca productos, tiendas o categorías..."
      className="flex-1 min-w-0 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
    />
  );

  const botonBuscar = (
    <button
      type="submit"
      className="m-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-colors"
      aria-label="Buscar"
    >
      <Search size={16} />
    </button>
  );

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm dark:shadow-none dark:border-b dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            className="md:hidden shrink-0 text-gray-700 dark:text-gray-300"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label="Abrir menú"
          >
            {menuAbierto ? <X size={24} /> : <MenuIcon size={24} />}
          </button>

          <Link to="/" className="flex items-center shrink-0">
            {logoError ? (
              <span className="text-base sm:text-lg md:text-xl font-extrabold text-brand-600">VecinoMarket</span>
            ) : usarLogoOscuro ? (
              <img
                src="/logo-dark.png"
                alt="VecinoMarket"
                className="w-20 sm:w-36 md:w-44 h-auto object-contain"
                onError={() => setLogoOscuroError(true)}
              />
            ) : (
              // Sin logo-dark.png (o falló): en modo noche le damos un fondo
              // blanco al logo normal para que su texto oscuro siga legible.
              <span className="dark:bg-white dark:rounded-lg dark:px-2 dark:py-1 flex items-center">
                <img
                  src="/logo.png"
                  alt="VecinoMarket"
                  className="w-20 sm:w-36 md:w-44 h-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              </span>
            )}
          </Link>

          <div className="hidden md:block shrink-0">
            <ExploreMenu />
          </div>

          <Link
            to="/live"
            className="hidden md:flex shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
          >
            <Radio size={14} className="animate-pulse" /> LIVE
          </Link>

          {/* Buscador: inline solo en desktop, en mobile pasa a su propia fila abajo */}
          <form
            onSubmit={buscar}
            className="hidden md:flex flex-1 min-w-0 items-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 focus-within:ring-2 focus-within:ring-brand-300 focus-within:bg-white dark:focus-within:bg-gray-800 transition-colors"
          >
            {campoBusqueda}
            {botonBuscar}
          </form>

          <div className="flex-1 md:hidden" />

          <div className="hidden md:flex items-center shrink-0 text-sm">
            <DepartamentoMenu />
            <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />
            <AccountMenu />
            {usuario && <NotificationBell />}
            <ThemeToggle />
            <Link
              to="/carrito"
              className="relative ml-1 flex items-center gap-1.5 rounded-full p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ShoppingCart size={22} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-gray-900 dark:bg-brand-500 text-[11px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>

          {/* Íconos compactos: solo mobile */}
          <div className="flex md:hidden items-center gap-0.5 shrink-0 text-gray-700 dark:text-gray-300">
            <Link
              to="/live"
              aria-label="Live"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-600 text-white hover:bg-red-700"
            >
              <Radio size={14} className="animate-pulse" />
            </Link>
            <DepartamentoMenu />
            <AccountMenu />
            {usuario && <NotificationBell />}
            <ThemeToggle />
            <Link to="/carrito" className="relative rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
              <ShoppingCart size={22} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-gray-900 dark:bg-brand-500 text-[11px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Buscador en fila propia: solo mobile */}
        <form
          onSubmit={buscar}
          className="mt-3 md:hidden flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 focus-within:ring-2 focus-within:ring-brand-300 focus-within:bg-white dark:focus-within:bg-gray-800 transition-colors"
        >
          {campoBusqueda}
          {botonBuscar}
        </form>
      </div>

      {menuAbierto && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Categorías</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
            {categorias.map((cat) => {
              const Icono = Icons[cat.icono] || Icons.Package;
              return (
                <Link
                  key={cat.id}
                  to={`/productos?categoria=${cat.id}`}
                  onClick={() => setMenuAbierto(false)}
                  className="flex items-center gap-1.5"
                >
                  <Icono size={16} className="text-brand-600" /> {cat.nombre}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
