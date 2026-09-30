import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'vecinomarket_tema';

function temaInicial() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado === 'light' || guardado === 'dark') return guardado;
  } catch {
    // localStorage no disponible: seguimos con la preferencia del sistema.
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark');

    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) favicon.href = tema === 'dark' ? '/favicon-dark.svg' : '/favicon-light.svg';

    try {
      localStorage.setItem(STORAGE_KEY, tema);
    } catch {
      // no persiste, pero no rompe la app.
    }
  }, [tema]);

  function toggleTema() {
    setTema((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  return (
    <ThemeContext.Provider value={{ tema, toggleTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocado junto a su Provider
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
