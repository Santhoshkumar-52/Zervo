import { FileBarChart } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Title from "@/components/additonal/Title";

function SubscriptionsReport() {
  return (
    <div className="space-y-6">
      <Title
        title="Subscriptions report"
        description="Active, expiring and expired memberships, and new subscriptions over time."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="size-5" />
            Subscriptions report
          </CardTitle>

          <CardDescription>Nothing here yet.</CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            This report is under construction.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SubscriptionsReport;