import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';

export default function WishlistButton({ producto, className = '', size = 18 }) {
  const { esDeseado, toggleWishlist } = useWishlist();
  const [animando, setAnimando] = useState(false);
  const deseado = esDeseado(producto?.id);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAnimando(true);
    try {
      await toggleWishlist(producto);
    } finally {
      setTimeout(() => setAnimando(false), 300);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`grid place-items-center rounded-full transition-all duration-200 bg-white/90 dark:bg-gray-800/90 text-gray-400 hover:text-rose-500 hover:bg-white dark:hover:bg-gray-700 shadow-xs ${
        deseado ? 'text-rose-500' : ''
      } ${animando ? 'scale-125' : 'scale-100'} ${className}`}
      title={deseado ? 'Quitar de favoritos' : 'Guardar en lista de deseos'}
      aria-label={deseado ? 'Quitar de favoritos' : 'Guardar en lista de deseos'}
    >
      <Heart
        size={size}
        className={`transition-colors ${deseado ? 'text-rose-500 fill-rose-500' : ''}`}
      />
    </button>
  );
}

