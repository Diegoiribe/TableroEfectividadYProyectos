import { useEffect, useMemo, useRef, useState } from 'react';
import AppleSelect from './AppleSelect';
import DeleteContextMenu from './DeleteContextMenu';
import { ChevronIcon, LinkIcon, PlusIcon, ResourceIcon } from './Icons';
import Popover from './Popover';

const fontSizes = [
  { value: '2', label: 'Pequeño' },
  { value: '3', label: 'Normal' },
  { value: '4', label: 'Grande' },
  { value: '5', label: 'Título' }
];

function sanitizeHtml(html = '') {
  const template = window.document.createElement('template');
  template.innerHTML = html;
  const allowed = new Set([
    'B',
    'BR',
    'DIV',
    'EM',
    'FONT',
    'H1',
    'H2',
    'H3',
    'I',
    'IMG',
    'LI',
    'OL',
    'P',
    'STRONG',
    'TABLE',
    'TBODY',
    'TD',
    'TH',
    'THEAD',
    'TR',
    'U',
    'UL'
  ]);
  [...template.content.querySelectorAll('*')].forEach((node) => {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }
    [...node.attributes].forEach((attribute) => {
      const permitted =
        (node.tagName === 'IMG' && ['src', 'alt'].includes(attribute.name)) ||
        (node.tagName === 'FONT' && attribute.name === 'size') ||
        (['TD', 'TH'].includes(node.tagName) &&
          ['colspan', 'rowspan'].includes(attribute.name));
      if (!permitted) node.removeAttribute(attribute.name);
    });
    if (node.tagName === 'IMG') {
      const source = node.getAttribute('src') ?? '';
      if (!source.startsWith('data:image/') && !source.startsWith('https://'))
        node.remove();
    }
  });
  return template.innerHTML;
}

function DocumentEditor({ document: docItem, onSave }) {
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const savedRange = useRef(null);
  const [saved, setSaved] = useState(true);
  const [fontSize, setFontSize] = useState('3');
  const initialHtml = useMemo(
    () => sanitizeHtml(docItem.content),
    [docItem.content]
  );

  useEffect(() => {
    const rememberSelection = () => {
      const selection = window.getSelection();
      if (!selection?.rangeCount || !editorRef.current) return;
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange();
      }
    };
    window.document.addEventListener('selectionchange', rememberSelection);
    return () =>
      window.document.removeEventListener('selectionchange', rememberSelection);
  }, []);

  const restoreSelection = () => {
    editorRef.current?.focus();
    if (!savedRange.current) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange.current);
  };
  const runCommand = (command, value = null) => {
    restoreSelection();
    window.document.execCommand(command, false, value);
    setSaved(false);
  };
  const insertImage = (file) => {
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => runCommand('insertImage', reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="docsViewerBar">
        <div className="docsViewerIdentity">
          <i>
            <ResourceIcon label="Docs" url="https://docs.google.com/document" />
          </i>
          <span>
            <strong>{docItem.name}</strong>
            <small>{saved ? 'Guardado' : 'Cambios sin guardar'}</small>
          </span>
        </div>
        <button
          type="button"
          className="docsSaveButton"
          disabled={saved}
          onClick={() => {
            onSave(sanitizeHtml(editorRef.current?.innerHTML ?? ''));
            setSaved(true);
          }}
        >
          Guardar
        </button>
      </div>
      <div className="docsCanvas">
        <article className="docsPage">
          <span>DOCUMENTACIÓN DEL PROCESO</span>
          <div className="docsTitleRow">
            <h1>{docItem.name}</h1>
            <div className="editorToolbar" aria-label="Formato del documento">
              <button
                type="button"
                aria-label="Negrita"
                title="Negrita"
                onMouseDown={(event) => {
                  event.preventDefault();
                  runCommand('bold');
                }}
              >
                <b>B</b>
              </button>
              <button
                type="button"
                aria-label="Cursiva"
                title="Cursiva"
                onMouseDown={(event) => {
                  event.preventDefault();
                  runCommand('italic');
                }}
              >
                <i>I</i>
              </button>
              <AppleSelect
                value={fontSize}
                options={fontSizes}
                ariaLabel="Tamaño de letra"
                className="editorSizeSelect"
                onChange={(value) => {
                  setFontSize(value);
                  runCommand('fontSize', value);
                }}
              />
              <button
                type="button"
                aria-label="Agregar tabla"
                title="Agregar tabla"
                onMouseDown={(event) => {
                  event.preventDefault();
                  runCommand(
                    'insertHTML',
                    '<table><tbody><tr><th>Encabezado</th><th>Encabezado</th></tr><tr><td>Contenido</td><td>Contenido</td></tr></tbody></table><p><br></p>'
                  );
                }}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M4 5h16v14H4zm0 5h16M10 5v14" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Agregar imagen"
                title="Agregar imagen"
                onMouseDown={(event) => {
                  event.preventDefault();
                  imageInputRef.current?.click();
                }}
              >
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m3 16 5-5 4 4 2-2 7 7" />
                </svg>
              </button>
              <input
                ref={imageInputRef}
                className="editorImageInput"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  insertImage(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>
          </div>
          <div
            ref={editorRef}
            className="docsEditor"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Escribe aquí el objetivo, responsables, pasos, recursos y notas del proceso…"
            dangerouslySetInnerHTML={{ __html: initialHtml }}
            onInput={() => setSaved(false)}
            onPaste={(event) => {
              const images = [...event.clipboardData.items]
                .filter(
                  (item) =>
                    item.kind === 'file' && item.type.startsWith('image/')
                )
                .map((item) => item.getAsFile())
                .filter(Boolean);
              event.preventDefault();
              if (images.length) images.forEach(insertImage);
              else
                runCommand(
                  'insertText',
                  event.clipboardData.getData('text/plain')
                );
            }}
          />
        </article>
      </div>
    </>
  );
}

export default function DocsWorkspace({
  documents,
  trash = [],
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  onRestoreDocument
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [subnoteParent, setSubnoteParent] = useState(null);
  const [subnoteName, setSubnoteName] = useState('');
  const [trashOpen, setTrashOpen] = useState(false);
  const [renderTime] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(() => new Set());
  const pressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const active = documents.find((document) => document.id === selectedId);
  const documentIds = useMemo(
    () => new Set(documents.map((document) => document.id)),
    [documents]
  );
  const roots = documents.filter(
    (document) => !document.parentId || !documentIds.has(document.parentId)
  );
  const trashRoots = trash.filter(
    (document) => document.id === document.trashGroupId
  );

  useEffect(() => () => window.clearTimeout(pressTimer.current), []);
  useEffect(() => {
    if (!subnoteParent) return;
    const close = () => {
      setSubnoteParent(null);
      setSubnoteName('');
    };
    window.document.addEventListener('mousedown', close);
    return () => window.document.removeEventListener('mousedown', close);
  }, [subnoteParent]);
  const startLongPress = (event, docItem) => {
    if (event.pointerType === 'mouse' && event.button !== 2) return;
    const { clientX: x, clientY: y } = event;
    longPressTriggered.current = false;
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setContextMenu({ resource: docItem, x, y });
    }, 650);
  };
  const stopLongPress = () => window.clearTimeout(pressTimer.current);
  const toggleExpanded = (id) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const createDocument = (name, parentId = null) => {
    const id = onAddDocument(name, parentId);
    if (parentId) setExpanded((current) => new Set([...current, parentId]));
    setSelectedId(id);
  };

  const renderDocument = (docItem, depth = 0) => {
    const children = documents.filter(
      (document) => document.parentId === docItem.id
    );
    const isExpanded = expanded.has(docItem.id);
    return (
      <div
        className="docTreeNode"
        key={docItem.id}
        style={{ '--doc-depth': depth }}
      >
        <div
          className="docTreeRow"
          onContextMenu={(event) => {
            event.preventDefault();
            setContextMenu({
              resource: docItem,
              x: event.clientX,
              y: event.clientY
            });
          }}
          onPointerDown={(event) => startLongPress(event, docItem)}
          onPointerUp={stopLongPress}
          onPointerCancel={stopLongPress}
          onPointerLeave={stopLongPress}
        >
          {children.length ? (
            <button
              type="button"
              className={`docBranchToggle ${isExpanded ? 'open' : ''}`}
              aria-label={`${isExpanded ? 'Ocultar' : 'Mostrar'} subnotas de ${
                docItem.name
              }`}
              onClick={() => toggleExpanded(docItem.id)}
            >
              <ChevronIcon />
            </button>
          ) : null}
          <button
            type="button"
            className={`toolCard docTreeCard ${
              active?.id === docItem.id ? 'active' : ''
            }`}
            onClick={() => {
              if (longPressTriggered.current) {
                longPressTriggered.current = false;
                return;
              }
              setSelectedId(docItem.id);
            }}
          >
            <i>
              <ResourceIcon
                label="Docs"
                url="https://docs.google.com/document"
              />
            </i>
            <span>
              <strong>{docItem.name}</strong>
              <small>
                {depth ? 'Subnota del proceso' : 'Documentación interna'}
              </small>
            </span>
          </button>
        </div>
        {children.length > 0 && isExpanded && (
          <div className="docTreeChildren">
            {children.map((child) => renderDocument(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      className={`toolsWorkspace docsWorkspace ${active ? 'viewerOpen' : ''}`}
    >
      <div className="toolsIntro">
        <span>CONOCIMIENTO INTERNO</span>
        <h2>Docs</h2>
        <p>Documenta los proyectos y procesos de tu equipo.</p>
      </div>
      <div className="toolsShell">
        <aside
          className="toolsLibrary"
          aria-label="Biblioteca de documentación"
        >
          <div className="toolsLibraryHead docsLibraryHead">
            <div>
              <span>{trashOpen ? 'Eliminados' : 'Biblioteca'}</span>
              <strong>
                {trashOpen
                  ? `${trashRoots.length} elementos · 5 días`
                  : `${documents.length} documentos`}
              </strong>
            </div>
            <button
              type="button"
              className={`docsTrashButton ${trashOpen ? 'active' : ''}`}
              aria-label={trashOpen ? 'Volver a Biblioteca' : 'Ver eliminados'}
              title={trashOpen ? 'Volver a Biblioteca' : 'Eliminados'}
              onClick={() => {
                setTrashOpen((current) => !current);
                setSelectedId(null);
              }}
            >
              {trashOpen ? (
                <svg viewBox="0 0 24 24">
                  <path d="m9 6-6 6 6 6M3 12h13a5 5 0 0 1 5 5v1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24">
                  <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
                </svg>
              )}
              {!trashOpen && trashRoots.length > 0 && (
                <i>{trashRoots.length}</i>
              )}
            </button>
          </div>
          <div className="toolsList docsTree">
            {trashOpen ? (
              <>
                {trashRoots.map((document) => {
                  const children =
                    trash.filter(
                      (item) => item.trashGroupId === document.trashGroupId
                    ).length - 1;
                  const remaining = Math.max(
                    1,
                    5 - Math.floor((renderTime - document.deletedAt) / 86400000)
                  );
                  return (
                    <div className="trashDocCard" key={document.id}>
                      <i>
                        <ResourceIcon
                          label="Docs"
                          url="https://docs.google.com/document"
                        />
                      </i>
                      <span>
                        <strong>{document.name}</strong>
                        <small>
                          {children > 0 ? `${children} subnotas · ` : ''}
                          {remaining} días restantes
                        </small>
                      </span>
                      <button
                        type="button"
                        aria-label={`Restaurar ${document.name}`}
                        title="Restaurar"
                        onClick={() => onRestoreDocument(document.trashGroupId)}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
                {!trashRoots.length && (
                  <div className="toolsEmpty">
                    <i>
                      <LinkIcon />
                    </i>
                    <strong>No hay eliminados</strong>
                    <p>
                      Los documentos eliminados permanecerán aquí durante cinco
                      días.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {roots.map((document) => renderDocument(document))}
                {!documents.length && (
                  <div className="toolsEmpty">
                    <i>
                      <LinkIcon />
                    </i>
                    <strong>Aún no hay documentación</strong>
                    <p>Crea el primer proyecto para documentar su proceso.</p>
                  </div>
                )}
              </>
            )}
          </div>
          {!trashOpen && (
            <div className="toolsActions">
              <div className="anchor toolsAddAnchor">
                <button
                  type="button"
                  className="addRow toolsAddButton"
                  aria-expanded={addOpen}
                  onClick={() => setAddOpen((current) => !current)}
                >
                  <PlusIcon />
                  <span>Agregar documento</span>
                </button>
                <Popover
                  open={addOpen}
                  onClose={() => setAddOpen(false)}
                  title="Nuevo documento"
                  placement="top"
                >
                  <form
                    className="addForm"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const name = projectName.trim();
                      if (!name) return;
                      createDocument(name);
                      setProjectName('');
                      setAddOpen(false);
                    }}
                  >
                    <label>
                      Nombre del proyecto
                      <input
                        autoFocus
                        value={projectName}
                        onChange={(event) => setProjectName(event.target.value)}
                        placeholder="Ej. Apertura de nueva sucursal"
                      />
                    </label>
                    <div className="formActions">
                      <button type="button" onClick={() => setAddOpen(false)}>
                        Cancelar
                      </button>
                      <button type="submit" className="confirm">
                        Crear
                      </button>
                    </div>
                  </form>
                </Popover>
              </div>
            </div>
          )}
        </aside>
        <div className="toolsViewer docsViewer">
          {active ? (
            <DocumentEditor
              key={active.id}
              document={active}
              onSave={(content) => onUpdateDocument(active.id, content)}
            />
          ) : (
            <div className="toolsViewerEmpty">
              <div className="toolsWindowDots">
                <i />
                <i />
                <i />
              </div>
              <span className="docsEmptyIcon">
                <ResourceIcon
                  label="Docs"
                  url="https://docs.google.com/document"
                />
              </span>
              <h3>Selecciona un proyecto</h3>
              <p>Su documentación completa aparecerá aquí.</p>
            </div>
          )}
        </div>
      </div>
      <DeleteContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onAddSubnote={() => {
          if (!contextMenu?.resource) return;
          setSubnoteParent({
            ...contextMenu.resource,
            menuX: contextMenu.x,
            menuY: contextMenu.y
          });
          setContextMenu(null);
        }}
        onDelete={() => {
          if (!contextMenu?.resource) return;
          onDeleteDocument(contextMenu.resource.id);
          setSelectedId(null);
          setContextMenu(null);
        }}
      />
      {subnoteParent && (
        <form
          className="subnotePopover addForm"
          style={{
            left: Math.max(
              8,
              Math.min(subnoteParent.menuX + 12, window.innerWidth - 258)
            ),
            top: Math.max(
              8,
              Math.min(subnoteParent.menuY, window.innerHeight - 205)
            )
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault();
            const name = subnoteName.trim();
            if (!name) return;
            createDocument(name, subnoteParent.id);
            setSubnoteName('');
            setSubnoteParent(null);
          }}
        >
          <span>SUBNOTA DE {subnoteParent.name.toUpperCase()}</span>
          <h3>Nueva subnota</h3>
          <label>
            Nombre
            <input
              autoFocus
              value={subnoteName}
              onChange={(event) => setSubnoteName(event.target.value)}
              placeholder="Ej. Validación y pruebas"
            />
          </label>
          <div className="formActions">
            <button
              type="button"
              onClick={() => {
                setSubnoteParent(null);
                setSubnoteName('');
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="confirm">
              Crear
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
