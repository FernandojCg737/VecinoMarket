import API from './axios';
import { adaptarProducto } from './catalogo';

// RF44–RF46: historial de navegación. Silencioso a propósito: si falla (sin
// red, backend caído, payload rechazado) la navegación sigue igual y no se
// muestra nada al usuario. COMPRA no se registra acá: el backend la deriva de
// los pedidos pagados.
export function registrarEvento(tipo, { producto, termino, departamento } = {}) {
  const payload = { tipo };
  if (producto) payload.producto = producto;
  if (termino) payload.termino_busqueda = termino;
  if (departamento) payload.departamento = departamento;
  API.post('ia/eventos/', payload).catch(() => {});
}

// Cada resultado del backend trae el producto con la misma forma que el
// catálogo, así que se reutiliza adaptarProducto (lo que esperan ProductCard
// y el carrito) y se le suman los datos propios de la IA.
function adaptarResultado(r) {
  return {
    ...adaptarProducto(r.producto),
    score: r.score,
    empresaReputacion: r.empresa_reputacion?.promedio ?? null,
  };
}

// CU1: "Para ti". estrategia: 'personalizada' | 'popular' (arranque en frío).
export async function obtenerRecomendaciones(limite = 10) {
  const { data } = await API.get('ia/recomendaciones/', { params: { limite } });
  return { estrategia: data.estrategia, generadoEn: data.generado_en, productos: data.resultados.map(adaptarResultado) };
}

// CU1: "Productos similares". estrategia: 'hibrida' | 'categoria'.
export async function obtenerSimilares(productoId, limite = 8) {
  const { data } = await API.get(`ia/productos/${productoId}/similares/`, { params: { limite } });
  return { estrategia: data.estrategia, productos: data.resultados.map(adaptarResultado) };
}

// CU2: "Cerca de ti". Sin lat/lng el backend usa la ubicación guardada del
// comprador; si no tiene, responde 400 con codigo SIN_UBICACION.
export async function obtenerCercanos({ lat, lng, radioKm = 5, limite = 20 } = {}) {
  const params = { radio_km: radioKm, limite };
  if (lat != null && lng != null) {
    params.lat = lat;
    params.lng = lng;
  }
  const { data } = await API.get('ia/recomendaciones/cercanas/', { params });
  return {
    ubicacion: data.ubicacion,
    radioKm: data.radio_km,
    estrategia: data.estrategia,
    productos: data.productos.map((item) => ({
      ...adaptarProducto(item.producto),
      score: item.score,
      distanciaKm: item.distancia_km,
      sucursal: item.sucursal,
      stockSucursal: item.stock_sucursal,
    })),
    emprendedores: data.emprendedores,
  };
}

// CU3: tendencias de consumo (empresa/empleado con ver_reportes; global para staff).
export async function obtenerTendencias({ semanas = 12, departamento = '' } = {}) {
  const params = { semanas };
  if (departamento) params.departamento = departamento;
  const { data } = await API.get('ia/tendencias/', { params });
  return data;
}

export function esErrorSinUbicacion(err) {
  return err?.response?.status === 400 && err?.response?.data?.codigo === 'SIN_UBICACION';
}

// Formato boliviano: 1.240 · 7,4 · 0,6
export function formatoNumero(valor, decimales = 0) {
  return Number(valor ?? 0).toLocaleString('es-BO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
    useGrouping: 'always', // en español 1240 no se agrupa por defecto; el prototipo usa 1.240
  });
}

export function formatoKm(km) {
  return `${formatoNumero(km, 1)} km`;
}

// La valoración del modelo es por EMPRESA (no hay valoración por producto):
// se muestra la de la empresa junto a la tarjeta.
export function notaReputacion(producto) {
  return producto.empresaReputacion != null ? `★ ${formatoNumero(producto.empresaReputacion, 1)} · valoración de la tienda` : '';
}
