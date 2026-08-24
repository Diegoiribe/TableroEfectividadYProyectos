import { useState } from 'react';

export default function AddForm({ type, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (!name.trim() || (type === 'resource' && !url.trim())) return;
    onSubmit({ name: name.trim(), url: url.trim() });
  };
  return (
    <form className="addForm" onSubmit={submit}>
      <label>
        {type === 'column'
          ? 'Nombre del encabezado'
          : type === 'member'
          ? 'Nombre del integrante'
          : 'Nombre'}
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            type === 'row'
              ? 'Nueva actividad'
              : type === 'resource'
              ? 'Ej. Manual de capacitación'
              : 'Nombre'
          }
        />
      </label>
      {(type === 'row' || type === 'resource') && (
        <label>
          Enlace {type === 'row' && <span>Opcional</span>}
          <input
            type="url"
            required={type === 'resource'}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>
      )}
      <div className="formActions">
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="confirm" type="submit">
          Agregar
        </button>
      </div>
    </form>
  );
}
