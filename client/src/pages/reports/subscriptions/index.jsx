import { Card, CardContent } from "@/components/ui/card";
import Title from "@/components/additonal/Title";

import SubscriptionReportList from "./SubscriptionReportList";

function SubscriptionsReport() {
  return (
    <div className="space-y-4">
      <Title
        title="Subscriptions report"
        description="Subscriptions billed in a date range, with payment status."
      />

      <Card>
        <CardContent>
          <SubscriptionReportList />
        </CardContent>
      </Card>
    </div>
  );
}

export default SubscriptionsReport;