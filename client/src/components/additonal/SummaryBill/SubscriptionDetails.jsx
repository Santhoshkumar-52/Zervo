import DetailList from "./DetailList";
import { LABEL, PAD } from "./billStyles";

// Reference details for the subscription (subs_summ) and the staff user who
// issued it. Members use these to quote the bill; staff use them to look it up.
// issuedBy is the users.full_name of subs_summ.created_by.
function SubscriptionDetails({ summary = {}, branch = {}, issuedBy, className = "" }) {
  return (
    <section
      aria-labelledby="bill-subscription-title"
      className={`${PAD} ${className}`}
    >
      <h3 id="bill-subscription-title" className={LABEL}>
        Subscription
      </h3>

      <DetailList
        className="mt-3"
        rows={[
          { label: "Subscription no.", value: summary.subscription_no },
          { label: "Branch code", value: branch.code },
          { label: "Issued by", value: issuedBy },
        ]}
      />
    </section>
  );
}

export default SubscriptionDetails;
