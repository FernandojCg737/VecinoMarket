import { Link } from 'react-router-dom';
import { useCatalogo } from '../../context/CatalogoContext';

export default function Footer() {
  const { categorias } = useCatalogo();

  return (
    <footer className="mt-16 bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
        <div>
          <h3 className="text-white font-semibold mb-3">VecinoMarket</h3>
          <ul className="space-y-2">
            <li><Link to="/solicitar-empresa" className="hover:text-white">Vende con nosotros</Link></li>
            <li><a href="#" className="hover:text-white">Sobre nosotros</a></li>
            <li><a href="#" className="hover:text-white">Trabaja con nosotros</a></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-3">Categorías</h3>
          <ul className="space-y-2">
            {categorias.slice(0, 5).map((cat) => (
              <li key={cat.id}>
                <Link to={`/productos?categoria=${cat.id}`} className="hover:text-white">
                  {cat.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-3">Ayuda</h3>
          <ul className="space-y-2">
            <li><Link to="/ayuda" className="hover:text-white">Centro de ayuda</Link></li>
            <li><Link to="/ayuda#comprar" className="hover:text-white">Cómo comprar</Link></li>
            <li><Link to="/ayuda#envios" className="hover:text-white">Envíos y entregas</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-3">Contacto</h3>
          <ul className="space-y-2">
            <li>La Paz, Bolivia</li>
            <li>hola@vecinomarket.bo</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} VecinoMarket. Proyecto académico — Sistemas de Información II.
      </div>
    </footer>
  );
}
