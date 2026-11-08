import { DISCOUNT_TYPE } from "@/utils/billing";

import { LABEL, PAD } from "./billStyles";
import { getPaymentStatus } from "./billHelpers";

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-zinc-600">{label}</dt>
      <dd className="font-medium text-zinc-900 tabular-nums">{children}</dd>
    </div>
  );
}

// How the total was reached (subs_summ): price, discount, tax, total.
// Rows that don't apply (no discount, no tax) are left out.
// Under the total: what was paid, the change handed back (cash only) and, in
// red, the balance still owed. `payment` is { paid_price, change, balance }.
// A due receipt's bill also has due_before (what was owed just before that
// payment) and receipt_no, so the figures read as they did at that moment.
function PriceSummary({ summary = {}, payment = {}, status, money, className = "" }) {
  const paid = Number(payment.paid_price) || 0;
  const change = Number(payment.change) || 0;
  const balance = Number(payment.balance) || 0;
  const dueBefore = payment.due_before == null ? null : Number(payment.due_before);

  // "Total paid" would be wrong while something is still owed.
  const totalLabel = balance > 0 ? "Total" : getPaymentStatus(status).totalLabel;

  const discount = Number(summary.discount_price) || 0;
  const tax = Number(summary.tax_amount) || 0;
  const taxPercent = Number(summary.tax_percent) || 0;
  const rate =
    Number(summary.discount_type) === DISCOUNT_TYPE.PERCENTAGE && summary.discount_rate != null
      ? Number(summary.discount_rate)
      : null;

  return (
    <section
      aria-labelledby="bill-summary-title"
      className={`${PAD} ${className}`}
    >
      <h3 id="bill-summary-title" className={LABEL}>
        Summary
      </h3>

      <dl className="mt-3 space-y-2.5">
        <Row label="Subtotal">{money(summary.base_price)}</Row>

        {discount > 0 && (
          <>
            <Row label={rate ? `Discount (${rate}%)` : "Discount"}>
              {"\u2212"}
              {money(discount)}
            </Row>
            <Row label="Amount before tax">{money(summary.discounted_price)}</Row>
          </>
        )}

        {(tax > 0 || taxPercent > 0) && (
          <Row label={`Tax (${taxPercent}%)`}>{money(tax)}</Row>
        )}

        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-y-2 border-zinc-900 py-3">
          <dt className="text-sm font-bold tracking-wide text-zinc-900 uppercase">
            {totalLabel}
          </dt>
          <dd
            className={`text-3xl font-bold tracking-tight tabular-nums sm:text-4xl lg:text-3xl ${
              status === "cancelled" ? "text-zinc-500 line-through" : "text-zinc-900"
            }`}
          >
            {money(summary.total_price)}
          </dd>
        </div>

        {dueBefore !== null && (
          <Row label="Due before this payment">{money(dueBefore)}</Row>
        )}

        {paid > 0 && (
          <Row label={payment.receipt_no ? `Paid (receipt #${payment.receipt_no})` : "Paid"}>
            {money(paid)}
          </Row>
        )}

        {change > 0 && (
          <div className="flex items-baseline justify-between gap-4 rounded-md border border-zinc-300 bg-white px-4 py-3">
            <dt className="text-sm font-medium text-zinc-700">Change returned</dt>
            <dd className="text-lg font-bold text-zinc-900 tabular-nums">{money(change)}</dd>
          </div>
        )}

        {balance > 0 && (
          <div
            role="alert"
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-md border-2 border-red-600 bg-red-50 px-4 py-3 text-red-700 [print-color-adjust:exact]"
          >
            <dt className="text-sm font-bold tracking-wide uppercase">Balance due</dt>
            <dd className="text-2xl font-bold tabular-nums">{money(balance)}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export default PriceSummary;
