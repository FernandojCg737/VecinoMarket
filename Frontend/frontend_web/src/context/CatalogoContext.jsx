import { createContext, useContext, useEffect, useState } from 'react';
import { obtenerCategorias } from '../api/catalogo';

const CatalogoContext = createContext(null);

// Categorías reales del backend, cargadas una sola vez y compartidas por
// Header/Footer/ExploreMenu/Home/ProductListing (evita repetir el fetch en
// cada uno).
export function CatalogoProvider({ children }) {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerCategorias()
      .then(setCategorias)
      .catch(() => setCategorias([]))
      .finally(() => setCargando(false));
  }, []);

  return (
    <CatalogoContext.Provider value={{ categorias, cargando }}>
      {children}
    </CatalogoContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocado junto a su Provider
export function useCatalogo() {
  const ctx = useContext(CatalogoContext);
  if (!ctx) throw new Error('useCatalogo debe usarse dentro de <CatalogoProvider>');
  return ctx;
}
