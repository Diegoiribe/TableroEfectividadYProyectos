import { useState } from 'react';
import AddForm from './AddForm';
import Popover from './Popover';
import { PlusIcon } from './Icons';

export default function TeamMembers({ members, onAdd }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="team">
      {members.map((m, i) => (
        <span key={m} title={m} style={{ zIndex: members.length - i }}>
          {m[0]}
        </span>
      ))}
      <div className="anchor">
        <button
          className="circleButton"
          onClick={() => setOpen(!open)}
          aria-label="Agregar integrante"
        >
          <PlusIcon />
        </button>
        <Popover
          open={open}
          onClose={() => setOpen(false)}
          title="Nuevo integrante"
          align="right"
        >
          <AddForm
            type="member"
            onCancel={() => setOpen(false)}
            onSubmit={({ name }) => {
              onAdd(name);
              setOpen(false);
            }}
          />
        </Popover>
      </div>
    </div>
  );
}
