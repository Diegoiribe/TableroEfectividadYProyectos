import { useEffect, useMemo, useRef, useState } from 'react';
import AddForm from './AddForm';
import DeleteConfirm from './DeleteConfirm';
import DeleteContextMenu from './DeleteContextMenu';
import {
  CloseIcon,
  ExternalIcon,
  LinkIcon,
  PlusIcon,
  ResourceIcon
} from './Icons';
import Popover from './Popover';

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function ToolsWorkspace({
  resources,
  onAddResource,
  onDeleteResource
}) {
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [frameVersion, setFrameVersion] = useState(0);
  const [contextMenu, setContextMenu] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const pressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const items = useMemo(() => {
    const unique = new Map();

    resources.forEach((resource) => {
      if (!resource?.url) return;
      const current = unique.get(resource.url);
      if (!current) {
        unique.set(resource.url, {
          ...resource,
          label: resource.label ?? resource.name ?? 'Recurso'
        });
      }
    });

    return [...unique.values()];
  }, [resources]);
  const active = items.find((item) => item.url === selectedUrl);

  useEffect(() => () => window.clearTimeout(pressTimer.current), []);

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

  return (
    <section className={`toolsWorkspace ${active ? 'viewerOpen' : ''}`}>
      <div className="toolsIntro">
        <span>ÁREA DE TRABAJO</span>
        <h2>Tools</h2>
        <p>Tus documentos, plataformas y herramientas en un solo lugar.</p>
      </div>

      <div className="toolsShell">
        <aside className="toolsLibrary" aria-label="Biblioteca de herramientas">
          <div className="toolsLibraryHead">
            <div>
              <span>Biblioteca</span>
              <strong>{items.length} recursos</strong>
            </div>
            {active ? (
              <button
                type="button"
                className="toolsMobileClose"
                aria-label="Cerrar herramienta"
                onClick={() => setSelectedUrl(null)}
              >
                <CloseIcon />
              </button>
            ) : null}
          </div>

          <div className="toolsList">
            {items.map((resource) => (
              <div
                className="toolCardWrap"
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
                <button
                  type="button"
                  className={`toolCard ${
                    active?.url === resource.url ? 'active' : ''
                  }`}
                  onClick={() => {
                    if (longPressTriggered.current) {
                      longPressTriggered.current = false;
                      return;
                    }
                    setSelectedUrl(resource.url);
                    setFrameVersion(0);
                  }}
                >
                  <i>
                    <ResourceIcon label={resource.label} url={resource.url} />
                  </i>
                  <span>
                    <strong>{resource.label}</strong>
                    <small>{hostname(resource.url)}</small>
                  </span>
                  <svg className="toolCardArrow" viewBox="0 0 24 24">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </div>
            ))}

            {!items.length && (
              <div className="toolsEmpty">
                <i>
                  <LinkIcon />
                </i>
                <strong>Aún no hay herramientas</strong>
                <p>Agrega el primer enlace para comenzar tu biblioteca.</p>
              </div>
            )}
          </div>

          <div className="toolsActions">
            <div className="anchor toolsAddAnchor">
              <button
                type="button"
                className="addRow toolsAddButton"
                aria-expanded={addOpen}
                onClick={() => setAddOpen((current) => !current)}
              >
                <PlusIcon />
                <span>Agregar herramienta</span>
              </button>
              <Popover
                open={addOpen}
                onClose={() => setAddOpen(false)}
                title="Nueva herramienta"
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
        </aside>

        <div className="toolsViewer">
          {active ? (
            <>
              <div className="toolsViewerBar">
                <button
                  type="button"
                  className="toolsViewerClose"
                  aria-label="Cerrar herramienta"
                  onClick={() => setSelectedUrl(null)}
                >
                  <CloseIcon />
                </button>
                <div className="toolsAddressBar" title={active.url}>
                  <svg
                    className="toolsLockIcon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <rect x="5" y="10" width="14" height="10" rx="3" />
                    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                  </svg>
                  <span>{active.url}</span>
                  <button
                    type="button"
                    aria-label="Recargar herramienta"
                    title="Recargar"
                    onClick={() => setFrameVersion((current) => current + 1)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
                    </svg>
                  </button>
                </div>
                <a
                  href={active.url}
                  target="_blank"
                  rel="noreferrer"
                  className="toolsOpenExternal"
                  aria-label="Abrir herramienta en otra pestaña"
                  title="Abrir en otra pestaña"
                >
                  <ExternalIcon />
                </a>
              </div>
              <iframe
                key={`${active.url}-${frameVersion}`}
                className="toolsFrame"
                src={active.url}
                title={active.label}
                allow="clipboard-read; clipboard-write; fullscreen"
              />
              <p className="toolsFrameHint">
                Si el sitio no permite mostrarse aquí, usa “Abrir aparte”.
              </p>
            </>
          ) : (
            <div className="toolsViewerEmpty">
              <div className="toolsWindowDots">
                <i />
                <i />
                <i />
              </div>
              <span>
                <LinkIcon />
              </span>
              <h3>Selecciona una herramienta</h3>
              <p>Se abrirá aquí sin salir de tu tablero.</p>
            </div>
          )}
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
        name={pendingDelete?.label}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          onDeleteResource(pendingDelete);
          if (selectedUrl === pendingDelete.url) setSelectedUrl(null);
          setPendingDelete(null);
        }}
      />
    </section>
  );
}
