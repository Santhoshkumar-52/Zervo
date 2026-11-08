import DetailList from "./DetailList";
import { LABEL, PAD } from "./billStyles";
import { formatDate, getPaymentStatus } from "./billHelpers";

// Payment method (payments.payment_name) and outcome (payments_status).
// payment: { method, paid_on }. The note under the details tells the reader
// what the status means for them.
function PaymentInfo({ status, payment = {}, className = "" }) {
  const { note } = getPaymentStatus(status);
  const isPaid = status === "completed";

  return (
    <section
      aria-labelledby="bill-payment-title"
      className={`${PAD} ${className}`}
    >
      <h3 id="bill-payment-title" className={LABEL}>
        Payment
      </h3>

      <DetailList
        className="mt-3"
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

      <p className="mt-3 text-sm text-zinc-700">{note}</p>
    </section>
  );
}

export default PaymentInfo;
