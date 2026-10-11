import DetailList from "./DetailList";
import { SECTION_PADDING, formatDate, getPaymentStatus } from "./billHelpers";

// Payment method (payments.payment_name) and outcome (payments_status).
// payment: { method, paid_on }. The note under the details tells the reader
// what the status means for them.
function PaymentInfo({ status, payment = {}, className = "" }) {
  const { note } = getPaymentStatus(status);
  const isPaid = status === "completed";

  return (
    <section
      aria-labelledby="bill-payment-title"
      className={`${SECTION_PADDING} ${className}`}
    >
      <h3 id="bill-payment-title" className="text-sm font-semibold">
        Payment
      </h3>

      <DetailList
        className="mt-4"
        rows={[
          {
            label: "Method",
            value: payment.method ?? (isPaid ? undefined : "Not chosen yet"),
          },
          {
            label: "Paid on",
            value: isPaid && payment.paid_on ? formatDate(payment.paid_on) : undefined,
          },
        ]}
      />

      <p className="mt-4 text-sm text-muted-foreground">{note}</p>
    </section>
  );
}

export default PaymentInfo;
