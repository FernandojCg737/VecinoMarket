import { BrainCircuit } from 'lucide-react';

export default function ModoMachineLearning({ activo, ocupado, onToggle }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      disabled={ocupado}
      onClick={onToggle}
      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 disabled:opacity-60 sm:text-sm ${
        activo
          ? 'border-purple-600 bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-100'
          : 'border-purple-300 bg-white text-purple-800 hover:bg-purple-100 dark:border-purple-700 dark:bg-gray-900 dark:text-purple-200 dark:hover:bg-purple-950'
      }`}
    >
      <BrainCircuit size={15} aria-hidden="true" />
      Machine Learning
    </button>
  );
}
