import { useState } from "react";

import Title from "@/components/additonal/Title";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/utils/currency";
import { notifyError, notifySuccess } from "@/utils/notification";

import DueSubscription from "./DueSubscription";
import RenewSubscription from "./RenewSubscription";
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

  const handlePay = async ({ paidPriceMinor }) => {
    if (!paymentMethodId) {
      notifyError("Select a payment method");
      return;
    }

    let result;

    try {
      result = await pay({ paymentId: paymentMethodId, paidPriceMinor });
    } catch {
      // The hook shows the error; keep the bill and the chosen method.
      return;
    }

    if (result.payments_status === "pending") {
      notifySuccess("Payment recorded as pending (not fully paid)");
    } else if (result.change > 0) {
      notifySuccess(
        `Payment completed. Change to return: ${formatMoney(result.change)}`,
      );
    } else {
      notifySuccess("Payment completed");
    }
    setPaymentMethodId(null);
  };

  return (
    <div className="space-y-6">
      <Title
        title="Subscriptions"
        description="Manage membership plans and member subscriptions."
      />

      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="renew">Renew</TabsTrigger>
          <TabsTrigger value="due">Due</TabsTrigger>
        </TabsList>

        {/* keepMounted: switching tabs must not wipe a half-filled bill form. */}
        <TabsContent value="new" keepMounted className="space-y-6 text-base">
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
        </TabsContent>

        <TabsContent value="renew">
          <RenewSubscription />
        </TabsContent>

        <TabsContent value="due">
          <DueSubscription />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Subscriptions;
