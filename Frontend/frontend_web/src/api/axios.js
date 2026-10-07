import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/',
});

API.interceptors.request.use((config) => {
  const access = localStorage.getItem('vecinomarket_access');
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  if (config.data instanceof FormData && config.headers) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
      config.headers.delete('content-type');
    }
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
  }
  return config;
});

// El access token dura 30 min (ver SIMPLE_JWT en el backend). Sin esto, en
// cuanto vencía, cualquier polling en segundo plano (ej. la campanita de
// notificaciones) se quedaba pidiendo con un token muerto para siempre,
// llenando la consola del backend de 401 hasta que el usuario recargaba la
// página a mano. Ahora: al primer 401 se intenta refrescar el access token
// una sola vez (las peticiones que fallen mientras tanto comparten el mismo
// refresh en curso) y se reintenta la petición original; si el refresh
// también falla, se cierra la sesión localmente.
let refrescando = null;

function cerrarSesionLocal() {
  localStorage.removeItem('vecinomarket_access');
  localStorage.removeItem('vecinomarket_refresh');
  window.dispatchEvent(new Event('vecinomarket:sesion-expirada'));
}

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const esRefresh = config?.url?.includes('auth/refresh/');

    if (response?.status !== 401 || !config || config._reintentado || esRefresh) {
      return Promise.reject(error);
    }

    const refresh = localStorage.getItem('vecinomarket_refresh');
    if (!refresh) {
      cerrarSesionLocal();
      return Promise.reject(error);
    }

    config._reintentado = true;
    try {
      refrescando ??= axios
        .post(`${API.defaults.baseURL}usuarios/auth/refresh/`, { refresh })
        .finally(() => { refrescando = null; });
      const { data } = await refrescando;
      localStorage.setItem('vecinomarket_access', data.access);
      // El backend rota el refresh token en cada uso (ROTATE_REFRESH_TOKENS +
      // BLACKLIST_AFTER_ROTATION) -- si no guardamos el nuevo, el próximo
      // refresh llega con uno ya invalidado y cierra sesión antes de tiempo.
      if (data.refresh) localStorage.setItem('vecinomarket_refresh', data.refresh);
      config.headers.Authorization = `Bearer ${data.access}`;
      return API(config);
    } catch {
      cerrarSesionLocal();
      return Promise.reject(error);
    }
  }
);

export default API;
