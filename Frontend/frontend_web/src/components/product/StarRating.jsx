import { Star } from 'lucide-react';

export default function StarRating({ rating, resenas, size = 14 }) {
  if (rating == null) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <div className="flex text-amber-400">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={size}
            fill={i < Math.round(rating) ? 'currentColor' : 'none'}
            strokeWidth={1.5}
          />
        ))}
      </div>
      {resenas != null && <span>({resenas})</span>}
    </div>
  );
}
