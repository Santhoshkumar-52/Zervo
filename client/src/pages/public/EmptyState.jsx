import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  button = false,
  redirect = "",
  buttonText = "Get Started",
  className,
}) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "flex min-h-[400px] w-full items-center justify-center p-6",
        className,
      )}
    >
      <div className="flex max-w-md flex-col items-center justify-center text-center">
        {/* Icon */}
        <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-muted">
          {Icon && <Icon className="size-8 text-muted-foreground" />}
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

        {/* Description */}
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>

        {/* Optional Button */}
        {button && redirect && (
          <Button className="mt-6" onClick={() => navigate(redirect)}>
            {buttonText}
          </Button>
        )}
      </div>
    </div>
  );
}
