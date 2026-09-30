import { createContext, useContext, useState } from 'react';

const LocationContext = createContext(null);
const STORAGE_KEY = 'vecinomarket_departamento';

// eslint-disable-next-line react-refresh/only-export-components -- constante colocada junto a su Provider
export const DEPARTAMENTOS = [
  'La Paz', 'Santa Cruz', 'Cochabamba', 'Oruro', 'Potosí',
  'Chuquisaca', 'Tarija', 'Beni', 'Pando',
];

function departamentoInicial() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEPARTAMENTOS[0];
  } catch {
    return DEPARTAMENTOS[0];
  }
}

export function LocationProvider({ children }) {
  const [departamento, setDepartamentoState] = useState(departamentoInicial);

  function setDepartamento(dep) {
    setDepartamentoState(dep);
    try {
      localStorage.setItem(STORAGE_KEY, dep);
    } catch {
      // localStorage no disponible (modo privado, etc): no persiste, pero no rompe.
    }
  }

  return (
    <LocationContext.Provider value={{ departamento, setDepartamento }}>
      {children}
    </LocationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocado junto a su Provider
export function useLocationPref() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationPref debe usarse dentro de <LocationProvider>');
  return ctx;
}
