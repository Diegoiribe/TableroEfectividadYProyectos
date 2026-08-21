import { useEffect, useRef } from 'react';

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
    <div className={`popover ${align} ${placement}`} ref={ref}>
      <div className="popoverArrow" />
      <h4>{title}</h4>
      {children}
    </div>
  );
}
