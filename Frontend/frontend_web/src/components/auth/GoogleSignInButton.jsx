import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function cargarScriptGoogle() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function GoogleSignInButton({ onCredential, onError }) {
  const contenedorRef = useRef(null);
  const { tema } = useTheme();
  const [noDisponible] = useState(() => !CLIENT_ID);

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelado = false;

    cargarScriptGoogle()
      .then(() => {
        if (cancelado || !contenedorRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (respuesta) => onCredential(respuesta.credential),
        });
        contenedorRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(contenedorRef.current, {
          theme: tema === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          locale: 'es',
        });
      })
      .catch(() => {
        if (!cancelado) onError?.('No se pudo cargar el botón de Google.');
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tema]);

  if (noDisponible) return null;

  return <div ref={contenedorRef} className="flex justify-center" />;
}
