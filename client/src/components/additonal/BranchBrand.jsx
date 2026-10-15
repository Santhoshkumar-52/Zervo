import { useState } from "react";
import { Dumbbell } from "lucide-react";

import { useAuthStore } from "@/store/auth";

/**
 * Branch logo + name for page headers, read from the auth store.
 * Falls back to the app name and a dumbbell icon when the branch has no logo
 * (or the logo URL fails to load).
 */
export default function BranchBrand({ subtitle }) {
  const branch = useAuthStore((state) => state.branch);

  // Remember which URL failed, so a new branch/logo gets another try.
  const [failedLogo, setFailedLogo] = useState(null);

  const logo = branch?.logo;
  const showLogo = Boolean(logo) && failedLogo !== logo;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
        {showLogo ? (
          <img
            src={logo}
            alt={branch?.name ? `${branch.name} logo` : "Branch logo"}
            className="size-full object-contain"
            onError={() => setFailedLogo(logo)}
          />
        ) : (
          <Dumbbell className="size-4" />
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">
          {branch?.name || "Zervo Gym"}
        </span>

        <span className="truncate text-xs text-muted-foreground">
          {branch?.address || { subtitle }}
        </span>
      </div>
    </div>
  );
}
