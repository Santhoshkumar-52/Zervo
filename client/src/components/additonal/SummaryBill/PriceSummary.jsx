import { DISCOUNT_TYPE } from "@/utils/billing";

import { SECTION_PADDING, getPaymentStatus } from "./billHelpers";

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{children}</dd>
    </div>
  );
}

// How the total was reached (subs_summ): price, discount, tax, total.
// Rows that don't apply (no discount, no tax) are left out.
function PriceSummary({ summary = {}, status, money, className = "" }) {
  const { totalLabel } = getPaymentStatus(status);

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
      className={`${SECTION_PADDING} ${className}`}
    >
      <h3 id="bill-summary-title" className="text-sm font-semibold">
        Summary
      </h3>

      <dl className="mt-4 space-y-2.5">
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

        <div className="flex items-baseline justify-between gap-4 border-t pt-4">
          <dt className="font-medium">{totalLabel}</dt>
          <dd
            className={`text-3xl font-semibold tracking-tight tabular-nums ${
              status === "cancelled" ? "text-muted-foreground line-through" : ""
            }`}
          >
            {money(summary.total_price)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export default PriceSummary;
