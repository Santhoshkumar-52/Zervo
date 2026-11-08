import { DEFAULT_TERMS } from "./terms";
import { LABEL, PAD } from "./billStyles";

// terms: [{ id, title, body }]. Falls back to the sample terms in terms.js.
// Columns on wide screens, one on phones. Always visible so it prints.
function TermsAndConditions({ terms = DEFAULT_TERMS, className = "" }) {
  if (terms.length === 0) return null;

  return (
    <section
      aria-labelledby="bill-terms-title"
      className={`${PAD} ${className}`}
    >
      <h3 id="bill-terms-title" className={LABEL}>
        Terms and conditions
      </h3>
      <p className="mt-1 text-xs text-zinc-600">
        By paying this bill you accept the terms below.
      </p>

      <div className="mt-4 gap-x-8 text-xs leading-relaxed text-zinc-600 md:columns-2 lg:columns-3">
        {terms.map(({ id, title, body }) => (
          <div key={id} className="mb-3 break-inside-avoid">
            <h4 className="font-semibold text-zinc-900">{title}</h4>
            <p className="mt-0.5">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TermsAndConditions;
