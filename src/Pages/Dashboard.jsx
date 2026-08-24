import { useState } from 'react';
import DocsWorkspace from '../components/DocsWorkspace';
import TeamMembers from '../components/TeamMembers';
import ToolsWorkspace from '../components/ToolsWorkspace';
import TrackerTable from '../components/TrackerTable';
import ViewSelect from '../components/ViewSelect';
import { initialTables } from '../data/dashboardData';
import { useDashboardStorage } from '../hooks/useDashboardStorage';

export default function Dashboard() {
  const [view, setView] = useState('training');
  const [section, setSection] = useState('tables');
  const [dashboard, setDashboard] = useDashboardStorage({
    members: ['Diego', 'Esteban', 'JR'],
    tables: initialTables,
    tools: [],
    docs: [],
    docsTrash: []
  });
  const { members, tables, tools = [], docs = [], docsTrash = [] } = dashboard;
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
  const addDocument = (name, parentId = null) => {
    const id = Date.now();
    setDashboard((current) => ({
      ...current,
      docs: [
        ...(current.docs ?? []),
        { id, parentId, name, content: '', updatedAt: Date.now() }
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
      const deletedAt = Date.now();
      const removedDocuments = (current.docs ?? [])
        .filter((document) => removedIds.has(document.id))
        .map((document) => ({
          ...document,
          deletedAt,
          trashGroupId: id
        }));
      return {
        ...current,
        docs: (current.docs ?? []).filter(
          (document) => !removedIds.has(document.id)
        ),
        docsTrash: [...(current.docsTrash ?? []), ...removedDocuments]
      };
    });
  const restoreDocument = (trashGroupId) =>
    setDashboard((current) => {
      const restored = (current.docsTrash ?? [])
        .filter((document) => document.trashGroupId === trashGroupId)
        .map((document) => {
          const restoredDocument = { ...document };
          delete restoredDocument.deletedAt;
          delete restoredDocument.trashGroupId;
          return restoredDocument;
        });
      return {
        ...current,
        docs: [...(current.docs ?? []), ...restored],
        docsTrash: (current.docsTrash ?? []).filter(
          (document) => document.trashGroupId !== trashGroupId
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
          <span>Tablero interno</span>
          <h1 className=" text-mauve-200/80">Tablero Interno</h1>
          <p>Seguimiento de proyectos</p>
        </div>
        <div className="headerActions">
          <nav className="headerNav" aria-label="Secciones del tablero">
            <button
              type="button"
              className={section === 'tables' ? 'active' : ''}
              onClick={() => setSection('tables')}
            >
              Tables
            </button>
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
          </nav>
          <TeamMembers
            members={members}
            onAdd={(name) =>
              setDashboard((current) => ({
                ...current,
                members: [...current.members, name]
              }))
            }
          />
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
      ) : (
        <DocsWorkspace
          documents={docs}
          trash={docsTrash}
          onAddDocument={addDocument}
          onUpdateDocument={updateDocument}
          onDeleteDocument={deleteDocument}
          onRestoreDocument={restoreDocument}
        />
      )}
    </main>
  );
}
