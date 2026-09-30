// CU17: helpers compartidos por la pantalla de la empresa que transmite
// (TransmitirLive.jsx) y la del comprador que mira (LiveViewer.jsx).

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

// STUN público de Google — solo ayuda a atravesar NAT para armar la
// conexión peer-to-peer, no transporta video. Sin servidor TURN propio,
// así que en redes muy restrictivas la conexión puede fallar.
export const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export function urlSenalizacion(liveId, { rol, token }) {
  const wsBase = API_BASE.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
  const params = new URLSearchParams({ rol, token: token || '' });
  return `${wsBase}/ws/live/${liveId}/?${params.toString()}`;
}
