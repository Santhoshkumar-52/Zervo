import { DEFAULT_TERMS } from "./terms";
import { SECTION_PADDING } from "./billHelpers";

// terms: [{ id, title, body }]. Falls back to the sample terms in terms.js.
// Two columns on wide screens, one on phones. Always visible so it prints.
function TermsAndConditions({ terms = DEFAULT_TERMS, className = "" }) {
  if (terms.length === 0) return null;

  return (
    <section
      aria-labelledby="bill-terms-title"
      className={`${SECTION_PADDING} ${className}`}
    >
      <h3 id="bill-terms-title" className="text-sm font-semibold">
        Terms and conditions
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        By paying this bill you accept the terms below.
      </p>

      <div className="mt-5 gap-x-10 text-xs leading-relaxed text-muted-foreground md:columns-2">
        {terms.map(({ id, title, body }) => (
          <div key={id} className="mb-4 break-inside-avoid">
            <h4 className="font-medium text-foreground">{title}</h4>
            <p className="mt-1">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TermsAndConditions;
