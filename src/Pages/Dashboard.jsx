import { useState } from 'react';
import TeamMembers from '../components/TeamMembers';
import TrackerTable from '../components/TrackerTable';
import ViewSelect from '../components/ViewSelect';
import { initialTables } from '../data/dashboardData';
import { useDashboardStorage } from '../hooks/useDashboardStorage';

export default function Dashboard() {
  const [view, setView] = useState('training');
  const [dashboard, setDashboard] = useDashboardStorage({
    members: ['Diego', 'Esteban', 'JR'],
    tables: initialTables
  });
  const { members, tables } = dashboard;
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
          <h1 className="font-extralight text-neutral-300 ">Tablero Interno</h1>
          <p>Seguimiento de proyectos</p>
        </div>
        <div className="headerActions">
          <nav className="headerNav" aria-label="Secciones del tablero">
            <a href="#docs">Docs</a>
            <a href="#tables">Table</a>
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
          onRenameRow={renameRow}
          onCellChange={changeCell}
        />
      </section>
    </main>
  );
}
