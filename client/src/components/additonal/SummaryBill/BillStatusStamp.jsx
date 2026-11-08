import { getPaymentStatus } from "./billHelpers";

// Fixed colours, not theme tokens. Every tone also has a text label, so the
// colour is never the only signal.
const TONES = {
  success: "border-emerald-600 bg-emerald-50 text-emerald-800",
  warning: "border-amber-600 bg-amber-50 text-amber-900",
  neutral: "border-zinc-400 bg-zinc-100 text-zinc-800",
  danger: "border-red-600 bg-red-50 text-red-800",
};

// The "PAID" / "PAYMENT PENDING" mark in the bill header.
// Reads the payments_status value. (The shared PaymentStatusBadge is still
// used by the report pages, so the bill has its own.)
function BillStatusStamp({ status, className = "" }) {
  const { label, tone } = getPaymentStatus(status);

  return (
    <span
      className={`inline-flex w-fit items-center rounded border-2 px-3 py-1 text-sm font-bold tracking-wider uppercase [print-color-adjust:exact] ${TONES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}

export default BillStatusStamp;
