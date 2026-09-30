import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-4xl font-extrabold text-brand-600 mb-2">404</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">No encontramos la página que buscas.</p>
      <Link to="/" className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
        Volver al inicio
      </Link>
    </div>
  );
}
