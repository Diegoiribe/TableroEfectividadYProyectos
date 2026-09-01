import { useMemo, useState } from 'react';
import { MarkdownContent, MarkdownContentEditor } from './DocsWorkspace';
import DeleteContextMenu from './DeleteContextMenu';
import { PlusIcon } from './Icons';

function todayKey() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 10);
}

const emptyForm = () => ({
  subject: 'Título',
  author: 'Juan Pérez',
  date: todayKey(),
  markdown: '## Resumen del update\n\nDescribe aquí el trabajo realizado, los resultados obtenidos y los siguientes pasos.'
});

function markdownPreview(markdown = '') {
  return markdown
    .replace(/```[\s\S]*?```/g, 'Diagrama o bloque de código')
    .replace(/\$\$[\s\S]*?\$\$/g, 'Fórmula')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`|~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCompactDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short'
  }).format(date);
}

function formatDetailDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export default function UpdatesWorkspace({
  updates = [],
  onAddUpdate,
  onDeleteUpdate
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedUpdateId, setSelectedUpdateId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const orderedUpdates = useMemo(
    () =>
      [...updates].sort((left, right) => {
        const dateDifference = String(right.date ?? '').localeCompare(
          String(left.date ?? '')
        );
        return dateDifference || Number(right.createdAt) - Number(left.createdAt);
      }),
    [updates]
  );
  const activeUpdate = orderedUpdates.find(
    (update) => update.id === selectedUpdateId
  ) ?? orderedUpdates[0] ?? null;

  const changeField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const closeComposer = () => {
    setForm(emptyForm());
    setComposerOpen(false);
  };

  const submitUpdate = (event) => {
    event.preventDefault();
    const normalized = {
      subject: form.subject.trim(),
      author: form.author.trim(),
      date: form.date,
      markdown: form.markdown.trim()
    };
    if (!normalized.subject || !normalized.author || !normalized.markdown) return;
    onAddUpdate(normalized);
    setSelectedUpdateId(null);
    closeComposer();
  };

  return (
    <section className="toolsWorkspace updatesWorkspace">
      <div className="toolsIntro">
        <h2>Updates</h2>
      </div>

      <div className="updatesShell">
        <div className="updatesBody">
          <aside className="updatesLibrary" aria-label="Bitácoras de trabajo">
            <div className="updatesLibraryHead">
              <span>Bitácora</span>
              <strong>
                {orderedUpdates.length}{' '}
                {orderedUpdates.length === 1 ? 'registro' : 'registros'}
              </strong>
            </div>
            <div className="updatesList">
              {orderedUpdates.map((update) => (
                <button
                  type="button"
                  className={`updateListItem ${
                    !composerOpen && activeUpdate?.id === update.id ? 'active' : ''
                  }`}
                  key={update.id}
                  onClick={() => {
                    setSelectedUpdateId(update.id);
                    setComposerOpen(false);
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setSelectedUpdateId(update.id);
                    setComposerOpen(false);
                    setContextMenu({
                      resource: update,
                      x: event.clientX,
                      y: event.clientY
                    });
                  }}
                >
                  <i className="updateListIcon" aria-hidden="true" />
                  <div className="updateListCopy">
                    <strong>{update.subject}</strong>
                    <p>{markdownPreview(update.markdown) || 'Sin descripción'}</p>
                    <time dateTime={update.date}>{formatCompactDate(update.date)}</time>
                  </div>
                  <svg className="updateListArrow" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              ))}
              {!orderedUpdates.length && (
                <div className="updatesListEmpty">
                  <i aria-hidden="true" />
                  <strong>Sin bitácoras</strong>
                  <p>Los registros aparecerán aquí.</p>
                </div>
              )}
            </div>
            <div className="updatesActions">
              <button
                className="updatesAddButton"
                type="button"
                onClick={() => setComposerOpen((current) => !current)}
                aria-expanded={composerOpen}
              >
                <PlusIcon />
                <span>Nuevo update</span>
              </button>
            </div>
          </aside>

          <div className="updatesDetail">
            {composerOpen ? (
              <form className="updateComposer updateComposerPreview" onSubmit={submitUpdate}>
                <span className="updateCardTag">
                  <i aria-hidden="true" />
                  NUEVO UPDATE DE TRABAJO
                </span>
                <input
                  className="updateComposerTitle"
                  type="text"
                  aria-label="En qué se trabajó"
                  value={form.subject}
                  onChange={changeField('subject')}
                  required
                />
                <p className="updateComposerResponsible">
                  <span>Responsable</span>
                  <input
                    type="text"
                    aria-label="Quién lo realizó"
                    value={form.author}
                    onChange={changeField('author')}
                    required
                  />
                </p>
                <div className="updateMarkdownFrame">
                  <div className="updateMarkdownBar">
                    <strong>Contenido</strong>
                    <span>Markdown</span>
                  </div>
                  <MarkdownContentEditor
                    markdown={form.markdown}
                    onChange={(markdown) =>
                      setForm((current) => ({ ...current, markdown }))
                    }
                    className="updateComposerEditor"
                    ariaLabel="Contenido Markdown del update"
                  />
                </div>
                <div className="updateComposerFooter">
                  <input
                    className="updateComposerDate"
                    type="date"
                    aria-label="Fecha del update"
                    value={form.date}
                    onChange={changeField('date')}
                    required
                  />
                  <div className="updateComposerActions">
                    <button type="button" onClick={closeComposer}>Cancelar</button>
                    <button type="submit">Guardar</button>
                  </div>
                </div>
              </form>
            ) : activeUpdate ? (
              <article className="updateDetailPage">
                <span className="updateCardTag">
                  <i aria-hidden="true" />
                  UPDATE DE TRABAJO
                </span>
                <h3>{activeUpdate.subject}</h3>
                <p className="updateDetailResponsible">
                  <span>Responsable</span>
                  <strong>{activeUpdate.author}</strong>
                </p>
                <MarkdownContent
                  markdown={activeUpdate.markdown}
                  className="updateMarkdown updateDetailMarkdown"
                />
                <time className="updateDetailTime" dateTime={activeUpdate.date}>
                  {formatDetailDate(activeUpdate.date)}
                </time>
              </article>
            ) : (
              <div className="updatesEmpty">
                <i aria-hidden="true" />
                <strong>Aún no hay updates de trabajo</strong>
                <p>Agrega el primero para comenzar la bitácora del equipo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <DeleteContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onDelete={() => {
          if (!contextMenu?.resource) return;
          const updateId = contextMenu.resource.id;
          onDeleteUpdate(updateId);
          if (selectedUpdateId === updateId) setSelectedUpdateId(null);
          setContextMenu(null);
        }}
      />
    </section>
  );
}
