import { useEffect, useRef } from 'react';
import { CloseIcon } from './Icons';

export default function Popover({
  open,
  onClose,
  title,
  children,
  align = 'left',
  placement = 'bottom'
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (event) => !ref.current?.contains(event.target) && onClose();
    const escape = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className={`popover ${align} ${placement}`}
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-label={title}
    >
      <div className="popoverArrow" />
      <div className="popoverHeader">
        <h4>{title}</h4>
        <button
          type="button"
          className="popoverClose"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>
      {children}
    </div>
  );
}
