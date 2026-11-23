import { createContext, useContext, useEffect, useState } from 'react';
import { MONEDAS } from './monedas';

const CurrencyContext = createContext(null);
const MONEDA_POR_CODIGO = new Map(MONEDAS.map((m) => [m.codigo, m]));
const MONEDA_BASE = MONEDA_POR_CODIGO.get('BOB');
const STORAGE_KEY = 'vecinomarket_moneda';
const CACHE_TASAS_KEY = 'vecinomarket_tasas_divisas';
const API_TASAS_URL = 'https://open.er-api.com/v6/latest/BOB';

function leerMonedaInicial() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (MONEDA_POR_CODIGO.has(guardado)) return guardado;
  } catch {
    // El selector sigue funcionando si el almacenamiento está deshabilitado.
  }
  return MONEDA_BASE.codigo;
}

function tasaValida(tasa) {
  return Number.isFinite(tasa) && tasa > 0;
}

function leerTasasCache() {
  try {
    const datos = JSON.parse(localStorage.getItem(CACHE_TASAS_KEY));
    if (datos?.rates?.BOB === 1) return datos;
  } catch {
    // Una caché inválida se descarta.
  }
  return null;
}

export function CurrencyProvider({ children }) {
  const [moneda, setMoneda] = useState(leerMonedaInicial);
  const [tasas, setTasas] = useState(leerTasasCache);
  const [solicitud, setSolicitud] = useState(0);
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    const controller = new AbortController();
    let activa = true;
    const plazo = window.setTimeout(() => controller.abort(), 10000);

    async function consultarTasas() {
      try {
        const resp = await fetch(API_TASAS_URL, { signal: controller.signal });
        if (!resp.ok) throw new Error('Consulta de tasas fallida');
        const data = await resp.json();
        if (
          data?.result !== 'success' || data.rates?.BOB !== 1
          || !MONEDAS.every(({ codigo }) => tasaValida(data.rates[codigo]))
        ) {
          throw new Error('Respuesta de tasas inválida');
        }
        if (!activa) return;
        const nuevo = {
          rates: data.rates,
          updatedAt: data.time_last_update_utc || new Date().toISOString(),
          fuente: 'open.er-api.com',
        };
        setTasas(nuevo);
        setEstado('actual');
        try {
          localStorage.setItem(CACHE_TASAS_KEY, JSON.stringify(nuevo));
        } catch {
          // La tasa permanece disponible en memoria.
        }
      } catch {
        if (activa) setEstado('error');
      } finally {
        window.clearTimeout(plazo);
      }
    }

    consultarTasas();
    return () => {
      activa = false;
      window.clearTimeout(plazo);
      controller.abort();
    };
  }, [solicitud]);

  const tasa = tasas?.rates?.[moneda];
  const puedeConvertir = moneda !== MONEDA_BASE.codigo && tasaValida(tasa);
  const monedaInfo = puedeConvertir ? MONEDA_POR_CODIGO.get(moneda) : MONEDA_BASE;
  const tasaActual = puedeConvertir ? tasa : 1;
  const error = estado !== 'error' ? '' : puedeConvertir
    ? 'No se pudo actualizar la tasa. Se usa la última disponible.'
    : moneda !== MONEDA_BASE.codigo
      ? 'No hay una tasa disponible. Los precios se muestran en bolivianos.'
      : '';

  function formatearPrecio(precioEnBs, { conSimbolo = true } = {}) {
    const convertido = (Number(precioEnBs) || 0) * tasaActual;
    const numero = convertido.toLocaleString('es-BO', {
      minimumFractionDigits: monedaInfo.decimales,
      maximumFractionDigits: monedaInfo.decimales,
    });
    return conSimbolo ? `${monedaInfo.simbolo} ${numero}` : numero;
  }

  function cambiarMoneda(codigo) {
    if (!MONEDA_POR_CODIGO.has(codigo)) return;
    setMoneda(codigo);
    setEstado('cargando');
    setSolicitud((intento) => intento + 1);
    try {
      localStorage.setItem(STORAGE_KEY, codigo);
    } catch {
      // La preferencia se mantiene durante la sesión.
    }
  }

  return (
    <CurrencyContext.Provider
      value={{
        moneda,
        monedaInfo,
        simbolo: monedaInfo.simbolo,
        cambiarMoneda,
        formatearPrecio,
        tasaActual,
        tasas,
        cargando: estado === 'cargando',
        error,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook junto a su proveedor
export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency debe usarse dentro de <CurrencyProvider>');
  return ctx;
}
