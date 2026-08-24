import { useEffect, useRef, useState } from 'react';
import { CheckIcon, ChevronIcon } from './Icons';

export default function AppleSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className = ''
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected =
    options.find((option) => option.value === value) ?? options[0];

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
    <div className={`appleSelect ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`appleSelectTrigger ${className}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label ?? '—'}</span>
        <ChevronIcon />
      </button>
      {open && (
        <div className="appleSelectMenu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? 'selected' : ''}
              key={String(option.value)}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
