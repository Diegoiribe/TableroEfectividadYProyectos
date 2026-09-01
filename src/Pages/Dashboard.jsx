import { useEffect, useState } from 'react';
import DocsWorkspace from '../components/DocsWorkspace';
import ToolsWorkspace from '../components/ToolsWorkspace';
import TrackerTable from '../components/TrackerTable';
import UpdatesWorkspace from '../components/UpdatesWorkspace';
import ViewSelect from '../components/ViewSelect';
import { initialTables } from '../data/dashboardData';
import { useDashboardStorage } from '../hooks/useDashboardStorage';

export default function Dashboard() {
  const [view, setView] = useState('training');
  const [section, setSection] = useState('tables');
  const [publishedMobile, setPublishedMobile] = useState(false);
  const [dashboard, setDashboard, syncState] = useDashboardStorage({
    tables: initialTables,
    tools: [],
    docs: [],
    updates: []
  });
  const { tables, tools = [], docs = [], updates = [] } = dashboard;

  useEffect(() => {
    const host = window.location.hostname;
    const isLocalHost =
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(host);
    const mobileQuery = window.matchMedia('(max-width: 720px)');
    const updateMode = () => {
      const tablesOnly = !isLocalHost && mobileQuery.matches;
      setPublishedMobile(tablesOnly);
      if (tablesOnly) setSection('tables');
    };

    updateMode();
    mobileQuery.addEventListener('change', updateMode);
    return () => mobileQuery.removeEventListener('change', updateMode);
  }, []);
  const table = tables[view];
  const update = (changes) =>
    setDashboard((current) => ({
      ...current,
      tables: {
        ...current.tables,
        [view]: { ...current.tables[view], ...changes }
      }
    }));
  const addRow = ({ name, url }) =>
    update({
      rows: [
        ...table.rows,
        {
          id: Date.now(),
          name,
          values: table.columns.map(() => ''),
          resource: url ? { label: name, url } : null
        }
      ]
    });
  const addColumn = (name) =>
    update({
      columns: [...table.columns, name],
      rows: table.rows.map((row) => ({ ...row, values: [...row.values, ''] }))
    });
  const addResource = ({ name, url }) =>
    update({
      resources: [
        ...(table.resources ?? []),
        { id: Date.now(), label: name, url }
      ]
    });
  const deleteResource = (url) =>
    update({
      resources: (table.resources ?? []).filter(
        (resource) => resource.url !== url
      )
    });
  const addTool = ({ name, url }) =>
    setDashboard((current) => ({
      ...current,
      tools: [...(current.tools ?? []), { id: Date.now(), label: name, url }]
    }));
  const deleteTool = (tool) =>
    setDashboard((current) => ({
      ...current,
      tools: (current.tools ?? []).filter((currentTool) =>
        tool.id ? currentTool.id !== tool.id : currentTool.url !== tool.url
      )
    }));
  const addUpdate = ({ subject, author, date, markdown }) =>
    setDashboard((current) => ({
      ...current,
      updates: [
        ...(current.updates ?? []),
        {
          id: Date.now(),
          subject,
          author,
          date,
          markdown,
          createdAt: Date.now()
        }
      ]
    }));
  const deleteUpdate = (id) =>
    setDashboard((current) => ({
      ...current,
      updates: (current.updates ?? []).filter((updateItem) => updateItem.id !== id)
    }));
  const addDocument = (name, parentId = null, details = {}) => {
    const id = Date.now();
    setDashboard((current) => ({
      ...current,
      docs: [
        ...(current.docs ?? []),
        {
          id,
          parentId,
          name,
          content: '',
          updatedAt: Date.now(),
          ...details
        }
      ]
    }));
    return id;
  };
  const updateDocument = (id, content) =>
    setDashboard((current) => ({
      ...current,
      docs: (current.docs ?? []).map((document) =>
        document.id === id
          ? { ...document, content, updatedAt: Date.now() }
          : document
      )
    }));
  const deleteDocument = (id) =>
    setDashboard((current) => {
      const removedIds = new Set([id]);
      let foundChildren = true;
      while (foundChildren) {
        foundChildren = false;
        (current.docs ?? []).forEach((document) => {
          if (
            removedIds.has(document.parentId) &&
            !removedIds.has(document.id)
          ) {
            removedIds.add(document.id);
            foundChildren = true;
          }
        });
      }
      return {
        ...current,
        docs: (current.docs ?? []).filter(
          (document) => !removedIds.has(document.id)
        )
      };
    });
  const renameRow = (rowId, name) =>
    update({
      rows: table.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              name,
              resource: row.resource ? { ...row.resource, label: name } : null
            }
          : row
      )
    });
  const changeCell = (ri, ci, value) => {
    update({
      rows: table.rows.map((r, i) =>
        i === ri
          ? { ...r, values: r.values.map((v, j) => (j === ci ? value : v)) }
          : r
      )
    });
  };
  return (
    <main className="page">
      <header>
        <div className="wordmark">
          <h1>
            <span>Universidad</span>
            <span>Corporativa</span>
          </h1>
          <p>Tablero interno</p>
        </div>
        <div className="headerActions">
          <div
            className={`syncStatus ${syncState}`}
            title={
              syncState === 'error'
                ? 'Firebase no pudo guardar los cambios. Se conservan localmente.'
                : 'Estado de sincronización con Firebase'
            }
            role="status"
            aria-live="polite"
          >
            <i />
            <span>
              {syncState === 'connecting'
                ? 'Conectando'
                : syncState === 'saving'
                ? 'Guardando'
                : syncState === 'synced'
                ? 'Sincronizado'
                : syncState === 'error'
                ? 'Error al guardar'
                : 'Solo local'}
            </span>
          </div>
          <nav className="headerNav" aria-label="Secciones del tablero">
            <button
              type="button"
              className={section === 'tables' ? 'active' : ''}
              onClick={() => setSection('tables')}
            >
              Tables
            </button>
            {!publishedMobile && (
              <>
                <button
                  type="button"
                  className={section === 'docs' ? 'active' : ''}
                  onClick={() => setSection('docs')}
                >
                  Docs
                </button>
                <button
                  type="button"
                  className={section === 'tools' ? 'active' : ''}
                  onClick={() => setSection('tools')}
                >
                  Tools
                </button>
                <button
                  type="button"
                  className={section === 'updates' ? 'active' : ''}
                  onClick={() => setSection('updates')}
                >
                  Updates
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      {section === 'tables' ? (
        <section className="note" id="tables">
          <div className="noteTitle">
            <span>ÁREA DE TRABAJO</span>
            <ViewSelect value={view} onChange={setView} title />
            <p>Seguimiento de avances, recursos y responsables.</p>
          </div>
          <TrackerTable
            table={table}
            onAddRow={addRow}
            onAddColumn={addColumn}
            onAddResource={addResource}
            onDeleteResource={deleteResource}
            onRenameRow={renameRow}
            onCellChange={changeCell}
          />
        </section>
      ) : section === 'tools' ? (
        <ToolsWorkspace
          resources={tools}
          onAddResource={addTool}
          onDeleteResource={deleteTool}
        />
      ) : section === 'updates' ? (
        <UpdatesWorkspace
          updates={updates}
          onAddUpdate={addUpdate}
          onDeleteUpdate={deleteUpdate}
        />
      ) : (
        <DocsWorkspace
          documents={docs}
          onAddDocument={addDocument}
          onUpdateDocument={updateDocument}
          onDeleteDocument={deleteDocument}
        />
      )}
    </main>
  );
}
