import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalIcon, LinkIcon } from './Icons';

export default function ResourcePanel({ rows = [] }) {
  const [openResource, setOpenResource] = useState(null);
  const panelRef = useRef(null);
  const resources = useMemo(() => {
    const grouped = new Map();
    rows.forEach((row) => {
      if (!row.resource?.url) return;
      const resource = grouped.get(row.resource.url) ?? {
        url: row.resource.url,
        labels: []
      };
      if (!resource.labels.includes(row.name)) resource.labels.push(row.name);
      grouped.set(row.resource.url, resource);
    });
    return [...grouped.values()];
  }, [rows]);

  useEffect(() => {
    const close = (event) => {
      if (!panelRef.current?.contains(event.target)) setOpenResource(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const hostname = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <aside className="resources" ref={panelRef}>
      <div className="resourceHead">
        <h3>Recursos</h3>
        <span className="resourceCount">{resources.length}</span>
      </div>
      <div className="resourceList">
        {resources.map((resource) => (
          <div className="resourceItem" key={resource.url}>
            <i>
              <LinkIcon />
            </i>
            <div className="resourceInfo">
              <div className="resourceTitle">
                <span>{resource.labels[0]}</span>
                {resource.labels.length > 1 && (
                  <button
                    type="button"
                    className="resourceMore"
                    aria-expanded={openResource === resource.url}
                    aria-label={`Ver ${
                      resource.labels.length - 1
                    } nombres relacionados`}
                    onClick={() =>
                      setOpenResource((current) =>
                        current === resource.url ? null : resource.url
                      )
                    }
                  >
                    +{resource.labels.length - 1}
                  </button>
                )}
              </div>
              <small>{hostname(resource.url)}</small>
              {resource.labels.length > 1 && (
                <div
                  className={`resourceNames ${
                    openResource === resource.url ? 'open' : ''
                  }`}
                >
                  <strong>Relacionado con</strong>
                  {resource.labels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              )}
            </div>
            <a
              className="resourceExternal"
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Abrir recurso de ${resource.labels[0]}`}
            >
              <ExternalIcon />
            </a>
          </div>
        ))}
        {!resources.length && (
          <div className="resourceEmpty">
            <i>
              <LinkIcon />
            </i>
            <p>Los enlaces que agregues en una fila aparecerán aquí.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
