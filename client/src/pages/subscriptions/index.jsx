import Title from "@/components/additonal/Title";

import SubscriptionFooter from "./SubscriptionFooter";
import SubscriptionForm from "./SubscriptionForm";
import SubscriptionItems from "./SubscriptionItems";
import { useSubscriptionBill } from "./useSubscriptionBill";

function Subscriptions() {
  const { bill, isLoading, addItem } = useSubscriptionBill();

  return (
    <div className="space-y-6">
      <Title
        title="Subscriptions"
        description="Manage membership plans and member subscriptions."
      />

      <SubscriptionForm
        hasItems={bill.items.length > 0}
        onAddItem={addItem}
      />

      <SubscriptionItems items={bill.items} isLoading={isLoading} />

      <SubscriptionFooter
        itemCount={bill.totals.item_count}
        grandTotalMinor={bill.totals.grand_total_minor}
      />
    </div>
  );
}

export default Subscriptions;