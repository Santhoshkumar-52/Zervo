import { getPaymentStatus } from "./billHelpers";

const TONES = {
  success: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  neutral: "bg-secondary text-secondary-foreground",
  danger: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};

// Reads the payments_status value and shows it as a coloured pill.
// The dot means the colour is never the only signal.
function PaymentStatusBadge({ status, className = "" }) {
  const { label, tone } = getPaymentStatus(status);

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium [print-color-adjust:exact] ${TONES[tone]} ${className}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export default PaymentStatusBadge;
