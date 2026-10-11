import { useState } from "react";

import Title from "@/components/additonal/Title";
import { notifyError, notifySuccess } from "@/utils/notification";

import SubscriptionFooter from "./SubscriptionFooter";
import SubscriptionForm from "./SubscriptionForm";
import SubscriptionItems from "./SubscriptionItems";
import { usePaymentMethods } from "./usePaymentMethods";
import { useSubscriptionBill } from "./useSubscriptionBill";

function Subscriptions() {
  const { bill, isLoading, addItem, pay, isPaying } = useSubscriptionBill();
  const { paymentMethods, isLoading: isPaymentMethodsLoading } =
    usePaymentMethods();

  // The payment method chosen for this bill (an id from the dropdown).
  const [paymentMethodId, setPaymentMethodId] = useState(null);

  const handlePay = async () => {
    if (!paymentMethodId) {
      notifyError("Select a payment method");
      return;
    }

    try {
      await pay(paymentMethodId);
    } catch {
      // The hook shows the error; keep the bill and the chosen method.
      return;
    }

    notifySuccess("Payment completed");
    setPaymentMethodId(null);
  };

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
        paymentMethods={paymentMethods}
        paymentMethodId={paymentMethodId}
        onPaymentMethodChange={setPaymentMethodId}
        isPaymentMethodsLoading={isPaymentMethodsLoading}
        onPay={handlePay}
        isPaying={isPaying}
      />
    </div>
  );
}

export default Subscriptions;
