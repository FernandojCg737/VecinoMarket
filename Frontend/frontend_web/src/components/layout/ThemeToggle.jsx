import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { tema, toggleTema } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTema}
      className={`rounded-full p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors ${className}`}
      aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
      title={tema === 'dark' ? 'Modo claro' : 'Modo noche'}
    >
      {tema === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
