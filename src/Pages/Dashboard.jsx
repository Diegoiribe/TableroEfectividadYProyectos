import { useState } from 'react';
import TeamMembers from '../components/TeamMembers';
import TrackerTable from '../components/TrackerTable';
import ViewSelect from '../components/ViewSelect';
import { initialTables, views } from '../data/dashboardData';

export default function Dashboard() {
  const [view, setView] = useState('itinerary');
  const [members, setMembers] = useState(['Diego', 'Esteban', 'Alfredo']);
  const [tables, setTables] = useState(initialTables);
  const table = tables[view];
  const update = (changes) =>
    setTables((prev) => ({ ...prev, [view]: { ...prev[view], ...changes } }));
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
  const changeCell = (ri, ci) => {
    const current = table.rows[ri].values[ci];
    const value =
      table.columns[ci].toLowerCase() === 'date'
        ? new Date().toLocaleDateString('es-MX')
        : current === ''
          ? 'on-course'
          : current === 'on-course'
            ? 'done'
            : '';
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
          <h1>Efectividad</h1>
          <p>Seguimiento de proyectos</p>
        </div>
        <TeamMembers
          members={members}
          onAdd={(name) => setMembers([...members, name])}
        />
      </header>
      <ViewSelect value={view} onChange={setView} />
      <section className="note">
        <div className="noteTitle">
          <span>EFECTIVIDAD Y PROYECTOS</span>
          <h2>{views.find((v) => v[0] === view)[1]}</h2>
          <p>Seguimiento de avances, recursos y responsables.</p>
        </div>
        <TrackerTable
          table={table}
          isVideo={view === 'videos'}
          onAddRow={addRow}
          onAddColumn={addColumn}
          onAddResource={(resource) =>
            resource.url &&
            update({ resources: [...(table.resources ?? []), resource] })
          }
          onCellChange={changeCell}
        />
      </section>
    </main>
  );
}
