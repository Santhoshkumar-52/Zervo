import { EMPTY } from "./billHelpers";

// A label / value list in receipt style: dotted rule between rows. Rows with
// no value are left out, so a missing optional field (email, trainer...) never
// shows an empty line.
function DetailList({ rows, className = "" }) {
  const visible = rows.filter(
    ({ value }) => value !== undefined && value !== null && value !== "",
  );

  if (visible.length === 0) return null;

  return (
    <dl className={`text-sm ${className}`}>
      {visible.map(({ label, value }) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-4 border-b border-dotted border-zinc-300 py-2 last:border-b-0"
        >
          <dt className="shrink-0 text-zinc-600">{label}</dt>
          <dd className="min-w-0 text-right font-medium break-words text-zinc-900">
            {value === EMPTY ? <span className="text-zinc-500">{value}</span> : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default DetailList;
