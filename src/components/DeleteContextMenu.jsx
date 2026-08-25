import { useEffect } from 'react';

export default function DeleteContextMenu({
  menu,
  onClose,
  onDelete,
  onAddSubnote,
  onAddFile
}) {
  useEffect(() => {
    if (!menu) return;
    const close = () => onClose();
    const escape = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('mousedown', close);
    document.addEventListener('scroll', close, true);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('scroll', close, true);
      document.removeEventListener('keydown', escape);
    };
  }, [menu, onClose]);

  if (!menu) return null;
  const left = Math.min(menu.x, window.innerWidth - 172);
  const top = Math.min(
    menu.y,
    window.innerHeight - (onAddSubnote || onAddFile ? 132 : 58)
  );

  return (
    <div
      className="deleteContextMenu"
      role="menu"
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {onAddSubnote && (
        <button
          type="button"
          role="menuitem"
          className="contextAddSubnote"
          onClick={onAddSubnote}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Agregar subnota</span>
        </button>
      )}
      {onAddFile && (
        <button
          type="button"
          role="menuitem"
          className="contextAddFile"
          onClick={onAddFile}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 12.5 14.5 6a3 3 0 0 1 4.2 4.2l-8.1 8.1a5 5 0 0 1-7.1-7.1l8-8" />
          </svg>
          <span>Agregar archivo</span>
        </button>
      )}
      <button type="button" role="menuitem" onClick={onDelete}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
        </svg>
        <span>Eliminar</span>
      </button>
    </div>
  );
}
