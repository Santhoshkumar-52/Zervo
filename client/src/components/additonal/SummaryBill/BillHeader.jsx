import { useState } from "react";
import { MapPin, Phone } from "lucide-react";

import BillStatusStamp from "./BillStatusStamp";
import { formatDate } from "./billHelpers";

// Falls back to the branch's first letter when there is no logo,
// or the logo URL fails to load.
function BranchLogo({ src, name }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className="flex size-14 shrink-0 items-center justify-center rounded-md bg-white text-2xl font-bold text-zinc-900 [print-color-adjust:exact]"
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
      className="size-14 shrink-0 rounded-md bg-white object-contain p-1"
    />
  );
}

// The bill's top band: who issued it (branch) and which bill this is.
// branch: { name, logo, address, phone }   summary: { bill_no, bill_date }
// On a phone the bill number and status sit on their own row under the branch.
function BillHeader({ branch = {}, summary = {}, status }) {
  return (
    <header className="bg-zinc-900 px-5 py-5 text-white sm:px-7 [print-color-adjust:exact]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="flex items-start gap-4">
          <BranchLogo src={branch.logo} name={branch.name} />

          <div className="min-w-0">
            <h2 className="text-xl leading-tight font-bold">{branch.name}</h2>

            <div className="mt-2 space-y-1 text-sm text-zinc-300">
              {branch.address && (
                <p className="flex items-start gap-2">
                  <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span className="max-w-sm">{branch.address}</span>
                </p>
              )}

              {branch.phone && (
                <p className="flex items-center gap-2">
                  <Phone aria-hidden="true" className="size-4 shrink-0" />
                  <a href={`tel:${branch.phone.replace(/\s+/g, "")}`} className="hover:underline">
                    {branch.phone}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-zinc-700 pt-4 sm:block sm:border-t-0 sm:pt-0 sm:text-right">
          <div>
            <p className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Summary bill
            </p>
            <p className="mt-1 text-3xl leading-none font-bold tabular-nums">
              #{summary.bill_no}
            </p>
            <p className="mt-1.5 text-sm text-zinc-300">
              Billed on {formatDate(summary.bill_date)}
            </p>
          </div>

          <BillStatusStamp status={status} className="sm:mt-3" />
        </div>
      </div>
    </header>
  );
}

export default BillHeader;
