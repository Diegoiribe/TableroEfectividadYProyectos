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
  onAddResource,
  onCellChange
}) {
  const [rowOpen, setRowOpen] = useState(false);
  const [columnOpen, setColumnOpen] = useState(false);
  return (
    <div className="board">
      <div className="tableArea">
        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                {table.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
                <th className="addColumn">
                  <div className="anchor">
                    <button onClick={() => setColumnOpen(!columnOpen)}>
                      <PlusIcon />
                    </button>
                    <Popover
                      open={columnOpen}
                      onClose={() => setColumnOpen(false)}
                      title="Agregar encabezado"
                      align="right"
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
                </th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, ri) => (
                <tr key={r.id}>
                  <td>
                    {isVideo && r.resource?.url ? (
                      <a href={r.resource.url} target="_blank" rel="noreferrer">
                        {r.name}
                        <ExternalIcon />
                      </a>
                    ) : (
                      r.name
                    )}
                  </td>
                  {table.columns.map((_, ci) => (
                    <td key={ci}>
                      <button
                        className={
                          r.values[ci] === 'done'
                            ? 'done'
                            : r.values[ci] === 'on-course'
                              ? 'course'
                              : ''
                        }
                        onClick={() => onCellChange(ri, ci)}
                      >
                        {r.values[ci] || '—'}
                      </button>
                    </td>
                  ))}
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="anchor rowAnchor">
          <button className="addRow" onClick={() => setRowOpen(!rowOpen)}>
            <PlusIcon />
            <span>Agregar fila</span>
          </button>
          <Popover
            open={rowOpen}
            onClose={() => setRowOpen(false)}
            title="Nueva fila"
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
      </div>
      <ResourcePanel
        rows={table.rows}
        extraResources={table.resources}
        onAdd={onAddResource}
      />
    </div>
  );
}
