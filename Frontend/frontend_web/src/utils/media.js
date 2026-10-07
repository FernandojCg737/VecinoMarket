export function resolverUrlMedia(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const rawBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';
  const base = rawBase.replace(/\/api\/?$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}
