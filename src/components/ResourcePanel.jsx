import { useEffect, useMemo, useRef, useState } from 'react';
import AddForm from './AddForm';
import DeleteConfirm from './DeleteConfirm';
import DeleteContextMenu from './DeleteContextMenu';
import { ExternalIcon, LinkIcon, PlusIcon, ResourceIcon } from './Icons';
import Popover from './Popover';

export default function ResourcePanel({
  resources: savedResources = [],
  onAddResource,
  onDeleteResource
}) {
  const [openResource, setOpenResource] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const panelRef = useRef(null);
  const pressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const resources = useMemo(() => {
    const grouped = new Map();
    savedResources.forEach((saved) => {
      if (!saved?.url) return;
      const label = saved.label ?? saved.name ?? 'Recurso';
      const resource = grouped.get(saved.url) ?? {
        url: saved.url,
        labels: []
      };
      if (!resource.labels.includes(label)) resource.labels.push(label);
      grouped.set(saved.url, resource);
    });
    return [...grouped.values()];
  }, [savedResources]);

  useEffect(() => {
    const close = (event) => {
      if (!panelRef.current?.contains(event.target)) setOpenResource(null);
    };
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      window.clearTimeout(pressTimer.current);
    };
  }, []);

  const startLongPress = (event, resource) => {
    if (event.pointerType === 'mouse' && event.button !== 2) return;
    const { clientX: x, clientY: y } = event;
    longPressTriggered.current = false;
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setContextMenu({ resource, x, y });
    }, 650);
  };

  const stopLongPress = () => window.clearTimeout(pressTimer.current);

  const hostname = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <aside className="resources" id="docs" ref={panelRef}>
      <div className="resourceHead">
        <h3>Recursos</h3>
        <span className="resourceCount">{resources.length}</span>
      </div>
      <div className="resourceList">
        {resources.map((resource) => (
          <div
            className="resourceItem"
            key={resource.url}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu({
                resource,
                x: event.clientX,
                y: event.clientY
              });
            }}
            onPointerDown={(event) => startLongPress(event, resource)}
            onPointerUp={stopLongPress}
            onPointerCancel={stopLongPress}
            onPointerLeave={stopLongPress}
          >
            <i>
              <ResourceIcon label={resource.labels[0]} url={resource.url} />
            </i>
            <div className="resourceInfo">
              <div className="resourceTitle">
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    if (longPressTriggered.current) {
                      event.preventDefault();
                      longPressTriggered.current = false;
                    }
                  }}
                >
                  {resource.labels[0]}
                </a>
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
              onClick={(event) => {
                if (longPressTriggered.current) {
                  event.preventDefault();
                  longPressTriggered.current = false;
                }
              }}
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
            <p>Agrega aquí documentos y enlaces adicionales.</p>
          </div>
        )}
      </div>
      <div className="resourceActions">
        <div className="anchor resourceAddAnchor">
          <button
            type="button"
            className="addRow resourceAddRow"
            aria-expanded={addOpen}
            onClick={() => setAddOpen((current) => !current)}
          >
            <PlusIcon />
            <span>Agregar recurso</span>
          </button>
          <Popover
            open={addOpen}
            onClose={() => setAddOpen(false)}
            title="Nuevo recurso"
            align="right"
            placement="top"
          >
            <AddForm
              type="resource"
              onCancel={() => setAddOpen(false)}
              onSubmit={(resource) => {
                onAddResource(resource);
                setAddOpen(false);
              }}
            />
          </Popover>
        </div>
      </div>
      <DeleteContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onDelete={() => {
          if (!contextMenu?.resource) return;
          setPendingDelete(contextMenu.resource);
          setContextMenu(null);
        }}
      />
      <DeleteConfirm
        open={Boolean(pendingDelete)}
        name={pendingDelete?.labels[0]}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          onDeleteResource(pendingDelete.url);
          setPendingDelete(null);
        }}
      />
    </aside>
  );
}
