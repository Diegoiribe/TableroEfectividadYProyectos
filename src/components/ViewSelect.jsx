import { views } from '../data/dashboardData';
export default function ViewSelect({ value, onChange }) {
  return (
    <div className="viewPicker">
      <label htmlFor="view">Vista</label>
      <select
        id="view"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {views.map((v) => (
          <option value={v[0]} key={v[0]}>
            {v[1]}
          </option>
        ))}
      </select>
    </div>
  );
}
