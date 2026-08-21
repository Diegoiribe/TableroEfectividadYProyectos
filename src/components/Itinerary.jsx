import { useState } from 'react';

const Itinerary = () => {
  const [members, setMembers] = useState([
    {
      id: 1,
      name: 'Diego'
    },
    {
      id: 2,
      name: 'Esteban'
    }
  ]);

  const [items, setItems] = useState([
    {
      id: 1,
      name: 'CEDIS ROPA',
      type: 'row',
      resource: '',
      status: {
        1: 'done',
        2: 'on-course'
      }
    },
    {
      id: 2,
      name: 'Tienda Muebles',
      type: 'row',
      resource: '',
      status: {
        1: '',
        2: ''
      }
    }
  ]);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  const [memberName, setMemberName] = useState('');

  const [newItem, setNewItem] = useState({
    name: '',
    type: 'row',
    resource: ''
  });

  const addMember = () => {
    if (!memberName.trim()) return;

    const newMember = {
      id: Date.now(),
      name: memberName.trim()
    };

    setMembers((prev) => [...prev, newMember]);

    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: {
          ...item.status,
          [newMember.id]: ''
        }
      }))
    );

    setMemberName('');
    setShowMemberModal(false);
  };

  const addItem = () => {
    if (!newItem.name.trim()) return;

    const status = {};

    members.forEach((member) => {
      status[member.id] = '';
    });

    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newItem.name.trim(),
        type: newItem.type,
        resource: newItem.resource.trim(),
        status
      }
    ]);

    setNewItem({
      name: '',
      type: 'row',
      resource: ''
    });

    setShowItemModal(false);
  };

  const changeStatus = (itemId, memberId, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: {
                ...item.status,
                [memberId]: value
              }
            }
          : item
      )
    );
  };

  return (
    <section className="w-full ">
      <div className=" border border-neutral-200 bg-white p-8 rounded-xl">
        <div className="flex gap-10">
          {/* MAIN INFORMATION */}
          <div className="flex-1">
            {/* MEMBER NAMES */}
            <div
              className="grid items-center gap-4"
              style={{
                gridTemplateColumns: `2fr repeat(${members.length}, 1fr) 50px`
              }}
            >
              <div />

              {members.map((member) => (
                <div key={member.id} className=" font-medium">
                  {member.name}
                </div>
              ))}

              {/* ADD MEMBER */}
              <button
                onClick={() => setShowMemberModal(true)}
                className="
                  flex h-9 w-9 items-center justify-center
                  rounded-full
                  border border-neutral-300
                  text-lg
                  
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="lucide lucide-plus-icon lucide-plus"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
              </button>
            </div>

            {/* ITEMS */}
            <div className="mt-5 space-y-4">
              {items.map((item) =>
                item.type === 'header' ? (
                  <div key={item.id} className="mt-8 font-light">
                    {item.resource ? (
                      <a
                        href={item.resource}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {item.name}
                      </a>
                    ) : (
                      item.name
                    )}
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className="grid items-center gap-4"
                    style={{
                      gridTemplateColumns: `2fr repeat(${members.length}, 1fr) 50px`
                    }}
                  >
                    {/* ROW NAME */}
                    <div>
                      {item.resource ? (
                        <a
                          href={item.resource}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline cursor-pointer"
                        >
                          {item.name}
                        </a>
                      ) : (
                        item.name
                      )}
                    </div>

                    {/* MEMBER STATUS */}
                    {members.map((member) => (
                      <select
                        key={member.id}
                        value={item.status[member.id] ?? ''}
                        onChange={(e) =>
                          changeStatus(item.id, member.id, e.target.value)
                        }
                        className="
                        bg-neutral-200
                        p-3
                        rounded-full
                          text-sm
                          
                        "
                      >
                        <option value="">-</option>
                        <option value="done">Done</option>
                        <option value="on-course">On-course</option>
                      </select>
                    ))}

                    <div />
                  </div>
                )
              )}
            </div>

            {/* ADD ROW / HEADER */}
            <button
              onClick={() => setShowItemModal(true)}
              className="
                mt-8
                flex h-10 w-10 items-center justify-center
                rounded-full
                border border-gray-400
                text-xl
                hover:bg-gray-100
              "
            >
              +
            </button>
          </div>

          {/* RESOURCES */}
          <aside className="w-64 border border-gray-300 p-5">
            <h3 className="font-medium">Resources</h3>

            <div className="mt-4 space-y-2">
              {items
                .filter((item) => item.resource)
                .map((item) => (
                  <a
                    key={item.id}
                    href={item.resource}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-sm hover:underline"
                  >
                    {item.name}
                  </a>
                ))}
            </div>
          </aside>
        </div>
      </div>

      {/* ADD MEMBER MODAL */}
      {showMemberModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30">
          <div className="w-80 bg-white p-6 shadow-lg">
            <h3 className="mb-4 font-semibold">Add team member</h3>

            <input
              type="text"
              placeholder="Name"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowMemberModal(false)}
                className="px-3 py-2"
              >
                Cancel
              </button>

              <button
                onClick={addMember}
                className="border border-gray-400 px-4 py-2"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30">
          <div className="w-96 bg-white p-6 shadow-lg">
            <h3 className="mb-5 font-semibold">Add information</h3>

            <label className="mb-1 block text-sm">Type</label>

            <select
              value={newItem.type}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  type: e.target.value
                })
              }
              className="mb-4 w-full border border-gray-300 px-3 py-2"
            >
              <option value="row">Row</option>
              <option value="header">Header</option>
            </select>

            <label className="mb-1 block text-sm">Name</label>

            <input
              type="text"
              value={newItem.name}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  name: e.target.value
                })
              }
              className="mb-4 w-full border border-gray-300 px-3 py-2"
              placeholder="CEDIS Muebles"
            />

            <label className="mb-1 block text-sm">Resource / link</label>

            <input
              type="text"
              value={newItem.resource}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  resource: e.target.value
                })
              }
              className="w-full border border-gray-300 px-3 py-2"
              placeholder="https://..."
            />

            <p className="mt-1 text-xs text-gray-400">Optional</p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowItemModal(false)}
                className="px-3 py-2"
              >
                Cancel
              </button>

              <button
                onClick={addItem}
                className="border border-gray-400 px-4 py-2"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Itinerary;
