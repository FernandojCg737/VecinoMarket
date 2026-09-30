import { useEffect, useRef, useState } from 'react';

export default function Dropdown({
  trigger,
  children,
  align = 'left',
  panelClassName = '',
  triggerClassName = '',
  panelPositionClassName,
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`flex items-center gap-1 ${triggerClassName}`}
      >
        {trigger}
      </button>
      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          className={`z-50 ${panelPositionClassName ?? `absolute mt-2 ${align === 'right' ? 'right-0' : 'left-0'}`} ${panelClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
