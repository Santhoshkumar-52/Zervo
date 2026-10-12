import { Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Title from "@/components/additonal/Title";

function BalanceReport() {
  return (
    <div className="space-y-6">
      <Title
        title="Balance report"
        description="Payments received and balances still due from members."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-5" />
            Balance report
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

export default BalanceReport;