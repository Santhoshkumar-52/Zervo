import { EMPTY } from "./billHelpers";

// A label/value list. Rows with no value are left out, so a missing optional
// field (email, trainer...) never shows an empty line.
function DetailList({ rows, className = "" }) {
  const visible = rows.filter(
    ({ value }) => value !== undefined && value !== null && value !== "",
  );

  if (visible.length === 0) return null;

  return (
    <dl className={`divide-y text-sm ${className}`}>
      {visible.map(({ label, value }) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-6 py-2.5 first:pt-0 last:pb-0"
        >
          <dt className="shrink-0 text-muted-foreground">{label}</dt>
          <dd className="min-w-0 text-right font-medium break-words">
            {value === EMPTY ? <span className="text-muted-foreground">{value}</span> : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default DetailList;
