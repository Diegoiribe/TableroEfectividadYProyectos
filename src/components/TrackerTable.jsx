import { useState } from 'react';
import AddForm from './AddForm';
import Popover from './Popover';
import ResourcePanel from './ResourcePanel';
import { ExternalIcon, PlusIcon } from './Icons';

export default function TrackerTable({
  table,
  isVideo,
  onAddRow,
  onAddColumn,
  onRenameRow,
  onCellChange
}) {
  const [rowOpen, setRowOpen] = useState(false);
  const [columnOpen, setColumnOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [rowName, setRowName] = useState('');

  const startRename = (row) => {
    setEditingRow(row.id);
    setRowName(row.name);
  };

  const finishRename = () => {
    const name = rowName.trim();
    if (name && editingRow !== null) onRenameRow(editingRow, name);
    setEditingRow(null);
  };
  return (
    <div className="board">
      <div className="tableArea">
        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                {table.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th className="tableSpacer" />
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, ri) => (
                <tr key={r.id}>
                  <td
                    className="rowNameCell"
                    title="Doble clic para editar"
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      startRename(r);
                    }}
                  >
                    {editingRow === r.id ? (
                      <input
                        className="rowNameInput"
                        autoFocus
                        value={rowName}
                        onChange={(event) => setRowName(event.target.value)}
                        onBlur={finishRename}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') finishRename();
                          if (event.key === 'Escape') setEditingRow(null);
                        }}
                        onDoubleClick={(event) => event.stopPropagation()}
                      />
                    ) : isVideo && r.resource?.url ? (
                      <a href={r.resource.url} target="_blank" rel="noreferrer">
                        {r.name}
                        <ExternalIcon />
                      </a>
                    ) : (
                      r.name
                    )}
                  </td>
                  {table.columns.map((column, ci) => (
                    <td key={ci}>
                      {column.toLowerCase() === 'date' ? (
                        <input
                          className="dateField"
                          aria-label={`Fecha de ${r.name}`}
                          value={r.values[ci]}
                          placeholder="dd/mm/aa"
                          onChange={(event) =>
                            onCellChange(ri, ci, event.target.value)
                          }
                        />
                      ) : (
                        <select
                          aria-label={`Estado de ${r.name} para ${column}`}
                          className={`statusSelect ${
                            r.values[ci] === 'done'
                              ? 'done'
                              : r.values[ci] === 'on-course'
                              ? 'course'
                              : r.values[ci] === 'fail'
                              ? 'fail'
                              : ''
                          }`}
                          value={r.values[ci]}
                          onChange={(event) =>
                            onCellChange(ri, ci, event.target.value)
                          }
                        >
                          <option value="">—</option>
                          <option value="on-course">On course</option>
                          <option value="done">Done</option>
                          <option value="fail">Fail</option>
                        </select>
                      )}
                    </td>
                  ))}
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rowActions">
          <div className="anchor rowAnchor">
            <button className="addRow" onClick={() => setRowOpen(!rowOpen)}>
              <PlusIcon />
              <span>Agregar fila</span>
            </button>
            <Popover
              open={rowOpen}
              onClose={() => setRowOpen(false)}
              title="Nueva fila"
              placement="top"
            >
              <AddForm
                type="row"
                onCancel={() => setRowOpen(false)}
                onSubmit={(data) => {
                  onAddRow(data);
                  setRowOpen(false);
                }}
              />
            </Popover>
          </div>
          <div className="anchor rowAnchor">
            <button
              className="addRow"
              onClick={() => setColumnOpen(!columnOpen)}
            >
              <PlusIcon />
              <span>Agregar columna</span>
            </button>
            <Popover
              open={columnOpen}
              onClose={() => setColumnOpen(false)}
              title="Agregar columna"
              placement="top"
            >
              <AddForm
                type="column"
                onCancel={() => setColumnOpen(false)}
                onSubmit={({ name }) => {
                  onAddColumn(name);
                  setColumnOpen(false);
                }}
              />
            </Popover>
          </div>
        </div>
      </div>
      <ResourcePanel rows={table.rows} />
    </div>
  );
}
