import { useEffect, useRef, useState } from 'react';
import { views } from '../data/dashboardData';
import { CheckIcon, ChevronIcon } from './Icons';

export default function ViewSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = views.find(([id]) => id === value)?.[1];

  useEffect(() => {
    if (!open) return;
    const close = (event) =>
      !ref.current?.contains(event.target) && setOpen(false);
    const escape = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div className="viewPicker" ref={ref}>
      <span className="viewLabel">Vista</span>
      <button
        type="button"
        className="viewTrigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected}</span>
        <ChevronIcon />
      </button>
      {open && (
        <div className="viewMenu" role="listbox" aria-label="Vista del tablero">
          {views.map(([id, label]) => (
            <button
              type="button"
              role="option"
              aria-selected={id === value}
              className={id === value ? 'selected' : ''}
              key={id}
              onClick={() => {
                onChange(id);
                setOpen(false);
              }}
            >
              <span>{label}</span>
              {id === value && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
