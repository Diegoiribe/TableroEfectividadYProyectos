import { useState } from 'react';

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const hasProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed);
  const isLocal = /^(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?(?:\/|$)/i.test(trimmed);
  const candidate = hasProtocol
    ? trimmed
    : `${isLocal ? 'http' : 'https'}://${trimmed}`;
  const parsed = new URL(candidate);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('unsupported-protocol');
  }
  return parsed.href;
}

function isPublishedDashboard() {
  if (typeof window === 'undefined') return false;
  return !['localhost', '127.0.0.1'].includes(window.location.hostname);
}

export default function AddForm({ type, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (!name.trim() || (type === 'resource' && !url.trim())) return;
    try {
      const normalizedUrl = url.trim() ? normalizeUrl(url) : '';
      if (
        type === 'resource' &&
        isPublishedDashboard() &&
        new URL(normalizedUrl).protocol !== 'https:'
      ) {
        setUrlError('En Vercel necesitas la URL pública HTTPS de la herramienta; localhost no está disponible.');
        return;
      }
      setUrlError('');
      onSubmit({ name: name.trim(), url: normalizedUrl });
    } catch {
      setUrlError('Escribe una dirección válida, por ejemplo localhost:3000.');
    }
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
            type="text"
            inputMode="url"
            required={type === 'resource'}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setUrlError('');
            }}
            placeholder="https://... o localhost:3000"
            aria-invalid={Boolean(urlError)}
            aria-describedby={urlError ? 'add-form-url-error' : undefined}
          />
          {urlError && <small id="add-form-url-error" className="addFormError">{urlError}</small>}
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
