import { useMemo, useState } from 'react';
import AddForm from './AddForm';
import { ExternalIcon, LinkIcon, PlusIcon } from './Icons';
import Popover from './Popover';

export default function ResourcePanel({ rows = [], extraResources = [], onAdd }) {
  const [open, setOpen] = useState(false);
  const resources = useMemo(() => {
    const all = [
      ...rows.map((r) => r.resource).filter(Boolean),
      ...extraResources
    ];
    return [
      ...new Map(all.filter((r) => r.url).map((r) => [r.url, r])).values()
    ];
  }, [rows, extraResources]);
  return (
    <aside className="resources">
      <div className="resourceHead">
        <h3>Recursos</h3>
        <div className="anchor">
          <button className="miniButton" onClick={() => setOpen(!open)}>
            <PlusIcon />
          </button>
          <Popover
            open={open}
            onClose={() => setOpen(false)}
            title="Nuevo recurso"
            align="right"
          >
            <AddForm
              type="resource"
              onCancel={() => setOpen(false)}
              onSubmit={({ name, url }) => {
                onAdd({ label: name, url });
                setOpen(false);
              }}
            />
          </Popover>
        </div>
      </div>
      <div className="resourceList">
        {resources.map((r) => (
          <a href={r.url} target="_blank" rel="noreferrer" key={r.url}>
            <i>
              <LinkIcon />
            </i>
            <span>
              {r.label}
              <small>{new URL(r.url).hostname}</small>
            </span>
            <ExternalIcon />
          </a>
        ))}
        {!resources.length && <p>Los archivos y enlaces aparecerán aquí.</p>}
      </div>
    </aside>
  );
}
