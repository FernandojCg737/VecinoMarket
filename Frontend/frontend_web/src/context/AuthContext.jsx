import { createContext, useContext, useEffect, useState } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(() => Boolean(localStorage.getItem('vecinomarket_access')));

  useEffect(() => {
    const access = localStorage.getItem('vecinomarket_access');
    if (!access) return;
    API.get('usuarios/auth/perfil/')
      .then((res) => setUsuario(res.data))
      .catch(() => {
        localStorage.removeItem('vecinomarket_access');
        localStorage.removeItem('vecinomarket_refresh');
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    // Disparado por api/axios.js cuando el access token expiró y el refresh
    // también falló (o no había refresh guardado) -- saca al usuario de la
    // UI sin recargar la página.
    function alExpirarSesion() {
      setUsuario(null);
    }
    window.addEventListener('vecinomarket:sesion-expirada', alExpirarSesion);
    return () => window.removeEventListener('vecinomarket:sesion-expirada', alExpirarSesion);
  }, []);

  async function login(email, password) {
    const { data } = await API.post('usuarios/auth/login/', { email, password });
    localStorage.setItem('vecinomarket_access', data.access);
    localStorage.setItem('vecinomarket_refresh', data.refresh);
    const perfil = await API.get('usuarios/auth/perfil/');
    setUsuario(perfil.data);
    return perfil.data;
  }

  async function registrarComprador(datos) {
    const { data } = await API.post('usuarios/compradores/registro/', datos);
    localStorage.setItem('vecinomarket_access', data.access);
    localStorage.setItem('vecinomarket_refresh', data.refresh);
    setUsuario(data.usuario);
    return data.usuario;
  }

  async function loginConGoogle(credential) {
    const { data } = await API.post('usuarios/auth/google/', { credential });
    localStorage.setItem('vecinomarket_access', data.access);
    localStorage.setItem('vecinomarket_refresh', data.refresh);
    const perfil = await API.get('usuarios/auth/perfil/');
    setUsuario(perfil.data);
    return perfil.data;
  }

  async function logout() {
    const refresh = localStorage.getItem('vecinomarket_refresh');
    try {
      // CU22: registra el logout en la bitácora antes de borrar el token.
      await API.post('usuarios/auth/logout/', { refresh });
    } catch {
      // si el backend no responde, igual cerramos la sesión localmente.
    }
    localStorage.removeItem('vecinomarket_access');
    localStorage.removeItem('vecinomarket_refresh');
    setUsuario(null);
  }

  async function actualizarPerfil(datos) {
    const { data } = await API.patch('usuarios/auth/perfil/', datos);
    setUsuario(data);
    return data;
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, loginConGoogle, registrarComprador, logout, actualizarPerfil }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocado junto a su Provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
