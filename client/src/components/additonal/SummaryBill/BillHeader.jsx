import { useState } from "react";
import { MapPin, Phone } from "lucide-react";

import PaymentStatusBadge from "./PaymentStatusBadge";
import { formatDate } from "./billHelpers";

// Falls back to the branch's first letter when there is no logo,
// or the logo URL fails to load.
function BranchLogo({ src, name }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground [print-color-adjust:exact]"
      >
        {name?.trim()?.[0]?.toUpperCase() ?? "Z"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${name} logo`}
      onError={() => setFailed(true)}
      className="size-12 shrink-0 rounded-xl border bg-background object-contain p-1"
    />
  );
}

// Who issued the bill (branch) and which bill this is.
// branch: { name, logo, address, phone }   summary: { bill_no, bill_date }
function BillHeader({ branch = {}, summary = {}, status }) {
  return (
    <header className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:py-8">
      <div className="flex items-start gap-3">
        <BranchLogo src={branch.logo} name={branch.name} />

        <div className="min-w-0">
          <h2 className="text-lg leading-tight font-semibold">{branch.name}</h2>

          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {branch.address && (
              <p className="flex items-start gap-1.5">
                <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <span className="max-w-xs">{branch.address}</span>
              </p>
            )}

            {branch.phone && (
              <p className="flex items-center gap-1.5">
                <Phone aria-hidden="true" className="size-3.5 shrink-0" />
                <a href={`tel:${branch.phone.replace(/\s+/g, "")}`} className="hover:underline">
                  {branch.phone}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 sm:items-end sm:text-right">
        <p className="text-sm text-muted-foreground">Summary bill</p>
        <p className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
          #{summary.bill_no}
        </p>
        <p className="text-sm text-muted-foreground">
          Billed on {formatDate(summary.bill_date)}
        </p>
        <PaymentStatusBadge status={status} className="mt-2" />
      </div>
    </header>
  );
}

export default BillHeader;
