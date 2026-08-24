import { useState } from 'react';
import AddForm from './AddForm';
import Popover from './Popover';
import { PlusIcon } from './Icons';

export default function TeamMembers({ members, onAdd }) {
  const [open, setOpen] = useState(false);
  const initials = (name) => {
    const words = name.trim().split(/\s+/);
    return words.length > 1
      ? `${words[0][0]}${words.at(-1)[0]}`.toUpperCase()
      : words[0].slice(0, 2).toUpperCase();
  };
  return (
    <div className="teamBlock">
      <div className="team">
        {members.map((member, index) => (
          <span
            className={`avatar avatar-${(index % 4) + 1}`}
            key={member}
            title={member}
            style={{ zIndex: members.length - index }}
          >
            {initials(member)}
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
    </div>
  );
}
