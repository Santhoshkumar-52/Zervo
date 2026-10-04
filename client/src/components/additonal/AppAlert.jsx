import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const ALERT_TYPES = {
  success: {
    icon: CircleCheck,
    title: "Success",
    className:
      "border-green-500/30 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  error: {
    icon: CircleAlert,
    title: "Error",
    className:
      "border-red-500/30 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  warning: {
    icon: TriangleAlert,
    title: "Warning",
    className:
      "border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  info: {
    icon: Info,
    title: "Info",
    className:
      "border-blue-500/30 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
};

/**
 * Reusable alert built on the shadcn Alert.
 * Can be used inline anywhere (not only for notifications):
 *
 *   <AppAlert type="warning" title="Heads up" message="Plan expires soon" />
 *   <AppAlert type="error" message="Something failed" onClose={handleClose} />
 */
export function AppAlert({
  type = "info",
  title,
  message,
  onClose,
  className,
  ...props
}) {
  const config = ALERT_TYPES[type] ?? ALERT_TYPES.info;
  const Icon = config.icon;

  return (
    <Alert
      className={cn(
        "shadow-md",
        config.className,
        onClose && "pr-10",
        className,
      )}
      {...props}
    >
      <Icon />
      <AlertTitle>{title ?? config.title}</AlertTitle>
      {message && (
        <AlertDescription className="text-current/90">
          {message}
        </AlertDescription>
      )}
      {onClose && (
        <AlertAction>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onClose}
            className="rounded-sm p-0.5 opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </AlertAction>
      )}
    </Alert>
  );
}
