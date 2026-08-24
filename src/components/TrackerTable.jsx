import { useEffect, useState } from 'react';
import AddForm from './AddForm';
import AppleSelect from './AppleSelect';
import Popover from './Popover';
import ResourcePanel from './ResourcePanel';
import { ExternalIcon, PlusIcon } from './Icons';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const updateMatch = (event) => setMatches(event.matches);
    media.addEventListener('change', updateMatch);
    return () => media.removeEventListener('change', updateMatch);
  }, [query]);

  return matches;
}

export default function TrackerTable({
  table,
  onAddRow,
  onAddColumn,
  onAddResource,
  onDeleteResource,
  onRenameRow,
  onCellChange
}) {
  const [rowOpen, setRowOpen] = useState(false);
  const [columnOpen, setColumnOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [rowName, setRowName] = useState('');
  const [mobileColumnIndex, setMobileColumnIndex] = useState(0);
  const [desktopExtraIndex, setDesktopExtraIndex] = useState(2);
  const isMobile = useMediaQuery('(max-width: 720px)');

  const allColumnIndexes = table.columns.map((_, index) => index);
  const extraColumnIndexes = allColumnIndexes.slice(2);
  const activeMobileIndex = allColumnIndexes.includes(mobileColumnIndex)
    ? mobileColumnIndex
    : 0;
  const activeExtraIndex = extraColumnIndexes.includes(desktopExtraIndex)
    ? desktopExtraIndex
    : extraColumnIndexes[0];
  const visibleColumnIndexes = isMobile
    ? allColumnIndexes.length
      ? [activeMobileIndex]
      : []
    : [
        ...allColumnIndexes.slice(0, 2),
        ...(activeExtraIndex === undefined ? [] : [activeExtraIndex])
      ];
  const statusOptions = [
    { value: '', label: '—' },
    { value: 'on-course', label: 'On course' },
    { value: 'done', label: 'Done' },
    { value: 'fail', label: 'Fail' }
  ];

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
                {visibleColumnIndexes.map((columnIndex, visibleIndex) => {
                  const column = table.columns[columnIndex];
                  const selectable =
                    isMobile ||
                    (table.columns.length > 3 && visibleIndex === 2);
                  const options = isMobile
                    ? allColumnIndexes
                    : extraColumnIndexes;

                  return (
                    <th key={`column-${columnIndex}`}>
                      {selectable ? (
                        <AppleSelect
                          className="columnNavigator"
                          ariaLabel="Columna visible"
                          value={columnIndex}
                          options={options.map((optionIndex) => ({
                            value: optionIndex,
                            label: table.columns[optionIndex]
                          }))}
                          onChange={(event) => {
                            if (isMobile) setMobileColumnIndex(event);
                            else setDesktopExtraIndex(event);
                          }}
                        />
                      ) : (
                        column
                      )}
                    </th>
                  );
                })}
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
                    ) : r.resource?.url ? (
                      <a
                        className="rowLink"
                        href={r.resource.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="rowLinkLabel">{r.name}</span>
                        <span className="rowExternalIcon">
                          <ExternalIcon />
                        </span>
                      </a>
                    ) : (
                      r.name
                    )}
                  </td>
                  {visibleColumnIndexes.map((ci) => {
                    const column = table.columns[ci];
                    return (
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
                          <AppleSelect
                            ariaLabel={`Estado de ${r.name} para ${column}`}
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
                            options={statusOptions}
                            onChange={(event) => onCellChange(ri, ci, event)}
                          />
                        )}
                      </td>
                    );
                  })}
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
      <ResourcePanel
        resources={table.resources}
        onAddResource={onAddResource}
        onDeleteResource={onDeleteResource}
      />
    </div>
  );
}
