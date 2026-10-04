import * as React from "react";
import { cn } from "cn";

function Label({ className, required = false, children, ...props }) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-0.5 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="text-destructive">*</span>}
    </label>
  );
}

export { Label };
