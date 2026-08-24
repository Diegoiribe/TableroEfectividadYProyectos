export default function DeleteConfirm({ open, name, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div
      className="deleteConfirmBackdrop"
      role="presentation"
      onMouseDown={onCancel}
    >
      <div
        className="deleteConfirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h3 id="delete-confirm-title">¿Eliminar “{name}”?</h3>
        <p>Esta acción quitará el acceso de esta sección.</p>
        <div>
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="danger" onClick={onConfirm}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
